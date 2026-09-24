import { describe, expect, it, vi } from "vitest"
import {
  createAppStatusService,
  describeProbeError,
  probeHttpsAgent,
  type AppStatusRepository,
} from "./app-status-service"

function setup(
  options: {
    status?: "unknown" | "up" | "down"
    lastCheckedAt?: Date | null
  } = {},
) {
  const app = {
    id: "plex",
    url: "https://plex.home",
    status: options.status ?? "unknown",
    lastCheckedAt: options.lastCheckedAt ?? null,
  }
  const repository: AppStatusRepository = {
    listBoardApps: vi.fn(async () => [app]),
    isBoardAppAssigned: vi.fn(async () => true),
    updateStatus: vi.fn(async (_id, status, lastCheckedAt, _error) => {
      app.status = status
      app.lastCheckedAt = lastCheckedAt
    }),
  }
  const fetcher = vi.fn(
    async (_url: string, _options: RequestInit) =>
      new Response(null, { status: 200 }),
  )
  const service = createAppStatusService(
    repository,
    fetcher,
    () => new Date("2026-09-24T00:00:00Z"),
  )
  return { app, repository, fetcher, service }
}

describe("app status probe TLS", () => {
  it("accepts self-signed certificates so self-hosted apps report up", () => {
    expect(probeHttpsAgent.options.rejectUnauthorized).toBe(false)
  })
})

describe("describeProbeError", () => {
  it("describes a probe timeout", () => {
    expect(
      describeProbeError(new DOMException("timed out", "TimeoutError")),
    ).toBe("Timed out after 3s")
  })

  it("describes a refused connection", () => {
    expect(
      describeProbeError(
        Object.assign(new Error("connect ECONNREFUSED"), {
          code: "ECONNREFUSED",
        }),
      ),
    ).toBe("Connection refused")
  })

  it("describes an unresolvable host", () => {
    expect(
      describeProbeError(
        Object.assign(new Error("getaddrinfo ENOTFOUND nas.home"), {
          code: "ENOTFOUND",
        }),
      ),
    ).toBe("Host not found")
  })

  it("describes a certificate error", () => {
    expect(
      describeProbeError(
        Object.assign(new Error("self-signed certificate"), {
          code: "DEPTH_ZERO_SELF_SIGNED_CERT",
        }),
      ),
    ).toBe("TLS certificate error")
  })

  it("falls back for unrecognised errors", () => {
    expect(describeProbeError(new Error("boom"))).toBe(
      "Could not reach the app",
    )
  })
})

describe("app status service", () => {
  it("probes unknown apps and stores the result", async () => {
    const { service, app, repository } = setup()
    await expect(service.refreshBoard("board")).resolves.toEqual([
      {
        id: "plex",
        status: "up",
        lastCheckedAt: new Date("2026-09-24T00:00:00Z"),
      },
    ])
    expect(repository.updateStatus).toHaveBeenCalledWith(
      "plex",
      "up",
      new Date("2026-09-24T00:00:00Z"),
      null,
    )
    expect(app.status).toBe("up")
  })

  it("reuses a check completed within 60 seconds", async () => {
    const { service, fetcher, repository } = setup({
      status: "down",
      lastCheckedAt: new Date("2026-09-23T23:59:30Z"),
    })
    await service.refreshBoard("board")
    expect(fetcher).not.toHaveBeenCalled()
    expect(repository.updateStatus).not.toHaveBeenCalled()
  })

  it("skips a stale app assignment removed before the probe starts", async () => {
    const { service, fetcher, repository } = setup()
    vi.mocked(repository.isBoardAppAssigned).mockResolvedValueOnce(false)
    await expect(service.refreshBoard("board")).resolves.toEqual([])
    expect(fetcher).not.toHaveBeenCalled()
  })

  it("treats any HTTP response, including server errors, as responding", async () => {
    const { service, fetcher } = setup()
    const cancel = vi.fn()
    const body = new ReadableStream({ cancel })
    fetcher.mockResolvedValueOnce(new Response(body, { status: 503 }))
    await expect(service.refreshBoard("board")).resolves.toMatchObject([
      { status: "up" },
    ])
    expect(fetcher).toHaveBeenCalledWith(
      "https://plex.home",
      expect.objectContaining({ method: "GET", redirect: "manual" }),
    )
    expect(cancel).toHaveBeenCalled()
  })

  it("stores down when the connection fails", async () => {
    const { service, fetcher, repository } = setup()
    fetcher.mockRejectedValueOnce(new Error("connection refused"))
    await expect(service.refreshBoard("board")).resolves.toMatchObject([
      { status: "down" },
    ])
    expect(repository.updateStatus).toHaveBeenCalledWith(
      "plex",
      "down",
      new Date("2026-09-24T00:00:00Z"),
      "Could not reach the app",
    )
  })

  it("records a friendly reason when a check fails", async () => {
    const { service, fetcher, repository } = setup()
    fetcher.mockRejectedValueOnce(
      Object.assign(new Error("connect ECONNREFUSED"), {
        code: "ECONNREFUSED",
      }),
    )
    await service.refreshBoard("board")
    expect(repository.updateStatus).toHaveBeenCalledWith(
      "plex",
      "down",
      new Date("2026-09-24T00:00:00Z"),
      "Connection refused",
    )
  })

  it("clears the recorded reason after a check succeeds", async () => {
    const { service, repository } = setup()
    await service.refreshBoard("board")
    expect(repository.updateStatus).toHaveBeenCalledWith(
      "plex",
      "up",
      new Date("2026-09-24T00:00:00Z"),
      null,
    )
  })

  it("aborts probes after three seconds and stores down", async () => {
    const { service, fetcher } = setup()
    const controller = new AbortController()
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockImplementation((milliseconds) => {
        expect(milliseconds).toBe(3_000)
        controller.abort(new DOMException("timed out", "TimeoutError"))
        return controller.signal
      })
    fetcher.mockImplementationOnce(async (_url, { signal }) => {
      if (signal?.aborted) throw signal.reason
      return new Response(null, { status: 200 })
    })
    try {
      await expect(service.refreshBoard("board")).resolves.toMatchObject([
        { status: "down" },
      ])
      expect(timeout).toHaveBeenCalledWith(3_000)
    } finally {
      timeout.mockRestore()
    }
  })

  it("coalesces simultaneous probes for the same app", async () => {
    const { service, fetcher } = setup()
    let finish!: (response: Response) => void
    fetcher.mockImplementationOnce(
      () => new Promise<Response>((resolve) => (finish = resolve)),
    )
    const first = service.refreshBoard("board")
    const second = service.refreshBoard("board")
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    finish(new Response(null, { status: 200 }))
    await expect(Promise.all([first, second])).resolves.toEqual([
      [
        {
          id: "plex",
          status: "up",
          lastCheckedAt: new Date("2026-09-24T00:00:00Z"),
        },
      ],
      [
        {
          id: "plex",
          status: "up",
          lastCheckedAt: new Date("2026-09-24T00:00:00Z"),
        },
      ],
    ])
  })
})
