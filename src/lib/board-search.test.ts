import { describe, expect, it } from "vitest"
import { filterAppGroups, groupBoardApps, rankApps } from "@/lib/board-search"

const apps = [
  { id: "plex", name: "Plex" },
  { id: "sonarr", name: "Sonarr" },
  { id: "sonic", name: "Sonic" },
  { id: "radarr", name: "Radarr" },
]

describe("rankApps", () => {
  it("returns all apps in manual order for an empty query", () => {
    expect(rankApps(apps, "  ")).toEqual(apps)
  })

  it("matches case-insensitive prefixes and ranks them before substrings", () => {
    expect(rankApps(apps, "SON").map(({ id }) => id)).toEqual([
      "sonarr",
      "sonic",
    ])
  })

  it("finds near misses and ranks closer names first", () => {
    expect(rankApps(apps, "sonr").map(({ id }) => id)).toContain("sonarr")
    expect(rankApps(apps, "sona").map(({ id }) => id)).toEqual(["sonarr"])
  })

  it("keeps manual order when match quality ties", () => {
    const tied = [
      { id: "first", name: "Platform Alpha" },
      { id: "second", name: "Platform Beta" },
    ]
    expect(rankApps(tied, "platform").map(({ id }) => id)).toEqual([
      "first",
      "second",
    ])
  })

  it("returns no results for a query outside fuzzy tolerance", () => {
    expect(rankApps(apps, "zzzzzz")).toEqual([])
  })
})

describe("category groups", () => {
  const categories = [
    { id: "media", title: "Media", description: "Play things" },
    { id: "empty", title: "Empty", description: "" },
  ]
  const categorized = [
    { id: "plex", name: "Plex", categoryId: "media" },
    { id: "sonarr", name: "Sonarr", categoryId: null },
    { id: "sonic", name: "Sonic", categoryId: "media" },
  ]

  it("puts uncategorized first and every category in saved order, including empty ones", () => {
    const groups = groupBoardApps(categorized, categories)
    expect(groups.map((group) => group.category?.id ?? null)).toEqual([
      null,
      "media",
      "empty",
    ])
    expect(groups[0].apps.map((app) => app.id)).toEqual(["sonarr"])
    expect(groups[1].apps.map((app) => app.id)).toEqual(["plex", "sonic"])
    expect(groups[2].apps).toEqual([])
  })

  it("omits the uncategorized group when it has no apps", () => {
    const groups = groupBoardApps(
      categorized.filter((app) => app.categoryId),
      categories,
    )
    expect(groups.map((group) => group.category?.id ?? null)).toEqual([
      "media",
      "empty",
    ])
  })

  it("ranks matches within each group and hides groups without matches", () => {
    const groups = filterAppGroups(
      groupBoardApps(categorized, categories),
      "son",
    )
    expect(groups.map((group) => group.category?.id ?? null)).toEqual([
      null,
      "media",
    ])
    expect(groups[0].apps.map((app) => app.id)).toEqual(["sonarr"])
    expect(groups[1].apps.map((app) => app.id)).toEqual(["sonic"])
  })

  it("keeps empty categories visible for an empty query", () => {
    const groups = filterAppGroups(
      groupBoardApps(categorized, categories),
      "  ",
    )
    expect(groups.map((group) => group.category?.id ?? null)).toEqual([
      null,
      "media",
      "empty",
    ])
  })

  it("returns no groups when nothing matches anywhere", () => {
    expect(
      filterAppGroups(groupBoardApps(categorized, categories), "zzzzzz"),
    ).toEqual([])
  })
})
