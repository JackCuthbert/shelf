import { describe, expect, it, vi } from "vitest"
import { fetchHomarrApps, HomarrError, normalizeHomarrBaseUrl } from "./homarr"

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  })
}

const connection = { baseUrl: "https://homarr.home", apiKey: "abc123.token" }

describe("normalizeHomarrBaseUrl", () => {
  it("keeps a subpath and removes trailing slashes", () => {
    expect(normalizeHomarrBaseUrl("https://homarr.home/dash/")).toBe(
      "https://homarr.home/dash",
    )
  })

  it.each([
    ["not a url", "valid"],
    ["ftp://homarr.home", "HTTP or HTTPS"],
    ["https://user:pass@homarr.home", "username and password"],
  ])("rejects %s", (value, message) => {
    expect(() => normalizeHomarrBaseUrl(value)).toThrowError(message)
  })
})

describe("fetchHomarrApps", () => {
  it("requests the fixed apps path with the API key and normalizes records", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse([
        {
          id: 7,
          name: "Plex",
          description: " Movies ",
          href: "https://plex.home/",
          iconUrl:
            "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/plex.png",
        },
        { id: 8, name: "Editor", href: "vscode://file", description: null },
        { id: 9, name: "Broken", href: "" },
      ]),
    )
    const apps = await fetchHomarrApps(connection, { fetchImpl })
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://homarr.home/api/apps",
      expect.objectContaining({
        headers: { ApiKey: "abc123.token", Accept: "application/json" },
        redirect: "manual",
      }),
    )
    expect(apps[0]).toEqual({
      sourceId: "7",
      name: "Plex",
      description: "Movies",
      url: "https://plex.home/",
      iconUrl:
        "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/plex.png",
      importable: true,
      reason: null,
    })
    expect(apps[1]).toMatchObject({
      sourceId: "8",
      importable: false,
      reason: "Homarr URL is not HTTP(S).",
    })
    expect(apps[2]).toMatchObject({
      sourceId: "9",
      importable: false,
      reason: "Homarr has no URL for this app.",
    })
  })

  it("returns an empty list for an empty Homarr instance", async () => {
    const apps = await fetchHomarrApps(connection, {
      fetchImpl: async () => jsonResponse([]),
    })
    expect(apps).toEqual([])
  })

  it.each([
    [401, "rejected the API key"],
    [403, "rejected the API key"],
    [404, "No Homarr API was found"],
    [500, "HTTP 500"],
  ])("maps HTTP %s to a clear error", async (status, message) => {
    await expect(
      fetchHomarrApps(connection, {
        fetchImpl: async () => jsonResponse({}, { status }),
      }),
    ).rejects.toThrowError(message)
  })

  it("reports an unreachable host", async () => {
    await expect(
      fetchHomarrApps(connection, {
        fetchImpl: async () => {
          throw new TypeError("fetch failed")
        },
      }),
    ).rejects.toThrowError("Could not reach the Homarr instance")
  })

  it("rejects a redirect instead of following it with the API key", async () => {
    await expect(
      fetchHomarrApps(connection, {
        fetchImpl: async () =>
          new Response(null, {
            status: 302,
            headers: { location: "https://evil.example/api/apps" },
          }),
      }),
    ).rejects.toThrowError("redirect")
  })

  it("rejects a malformed response body", async () => {
    await expect(
      fetchHomarrApps(connection, {
        fetchImpl: async () => new Response("<html>", { status: 200 }),
      }),
    ).rejects.toThrowError(HomarrError)
  })

  it("rejects too many apps before returning them", async () => {
    const many = Array.from({ length: 1_001 }, (_, index) => ({
      id: index,
      name: `App ${index}`,
      href: "https://app.home",
    }))
    await expect(
      fetchHomarrApps(connection, {
        fetchImpl: async () => jsonResponse(many),
      }),
    ).rejects.toThrowError("too many apps")
  })

  it("rejects an oversized response", async () => {
    await expect(
      fetchHomarrApps(connection, {
        fetchImpl: async () => new Response("a".repeat(10 * 1024 * 1024 + 1)),
      }),
    ).rejects.toThrowError("too large")
  })

  it("aborts an oversized chunked response without a declared length", async () => {
    const chunk = new Uint8Array(1024 * 1024)
    let sent = 0
    const body = new ReadableStream({
      pull(controller) {
        if (sent >= 30) {
          controller.close()
          return
        }
        sent += 1
        controller.enqueue(chunk)
      },
    })
    await expect(
      fetchHomarrApps(connection, {
        fetchImpl: async () => new Response(body),
      }),
    ).rejects.toThrowError("too large")
    expect(sent).toBeLessThan(20)
  })
})
