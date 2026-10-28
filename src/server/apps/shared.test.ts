import { beforeEach, describe, expect, it, vi } from "vitest"

const count = vi.fn()
vi.mock("@/lib/prisma", () => ({ prisma: { app: { count } } }))
vi.mock("@/lib/icon-cache", () => ({ iconCache: {} }))
vi.mock("./service", () => ({
  createSharedAppService: (repository: unknown) => repository,
}))

beforeEach(() => count.mockReset())

describe("shared app repository", () => {
  it("counts an icon key across light and dark slugs and hashes", async () => {
    count.mockResolvedValue(2)
    const { sharedAppService } = await import("./shared")
    const repository = sharedAppService as unknown as {
      countIcon(key: string): Promise<number>
    }
    expect(await repository.countIcon("abc")).toBe(2)
    expect(count).toHaveBeenCalledWith({
      where: {
        OR: [
          { iconSlug: "abc" },
          { iconHash: "abc" },
          { darkIconSlug: "abc" },
          { darkIconHash: "abc" },
        ],
      },
    })
  })
})
