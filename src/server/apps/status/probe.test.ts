import { describe, expect, it, vi } from "vitest"
import { createServer as createHttpsServer } from "node:https"
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createProbeRunner } from "./probe"
import type { ProbeWork } from "@/lib/app-status"

const work: ProbeWork = {
  id: "app00001",
  url: "http://app.home",
  requestedAt: new Date(0),
  trigger: "manual",
}

describe("app probe", () => {
  it("uses GET without following redirects and completes when headers arrive", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 302 }))
    await expect(createProbeRunner({ fetcher })(work)).resolves.toEqual({
      status: "up",
      lastError: null,
    })
    expect(fetcher).toHaveBeenCalledWith(
      work.url,
      expect.objectContaining({ method: "GET", redirect: "manual" }),
    )
  })
  it("retries transient failures once after one second, then reports down", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error("reset"), { code: "ECONNRESET" }),
      )
    const sleep = vi.fn(async () => {})
    await expect(
      createProbeRunner({ fetcher, sleep })(work),
    ).resolves.toMatchObject({ status: "down" })
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(1000)
  })
  it("treats any native HTTP response as up", async () => {
    const server = await new Promise<import("node:http").Server>((resolve) => {
      const http = require("node:http") as typeof import("node:http")
      const instance = http.createServer((_req, res) => {
        res.statusCode = 503
        res.end("offline")
      })
      instance.listen(0, "127.0.0.1", () => resolve(instance))
    })
    try {
      const address = server.address()
      const result = await createProbeRunner()({
        ...work,
        url: `http://127.0.0.1:${(address as { port: number }).port}`,
      })
      expect(result.status).toBe("up")
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })

  it("accepts a self-signed HTTPS response", async () => {
    const dir = mkdtempSync(join(tmpdir(), "shelf-probe-"))
    const keyPath = join(dir, "key.pem")
    const certPath = join(dir, "cert.pem")
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-keyout",
        keyPath,
        "-out",
        certPath,
        "-days",
        "1",
        "-subj",
        "/CN=localhost",
      ],
      { stdio: "ignore" },
    )
    const server = createHttpsServer(
      { key: readFileSync(keyPath), cert: readFileSync(certPath) },
      (_request, response) => {
        response.writeHead(302)
        response.end("fixture")
      },
    )
    try {
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve),
      )
      const address = server.address() as { port: number }
      await expect(
        createProbeRunner()({
          ...work,
          url: `https://127.0.0.1:${address.port}`,
        }),
      ).resolves.toMatchObject({ status: "up" })
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      )
      rmSync(dir, { recursive: true, force: true })
    }
  }, 15_000)

  it("times out a stalled attempt and retries once", async () => {
    vi.useFakeTimers()
    try {
      const fetcher = vi.fn(
        (_url: string, { signal }: RequestInit) =>
          new Promise<Response>((_resolve, reject) =>
            signal?.addEventListener("abort", () => reject(signal.reason), {
              once: true,
            }),
          ),
      )
      const runner = createProbeRunner({ fetcher, sleep: async () => {} })
      const result = runner(work)
      await vi.advanceTimersByTimeAsync(30_000)
      await expect(result).resolves.toMatchObject({
        status: "down",
        lastError: "Timed out after 15s",
      })
      expect(fetcher).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })
})
