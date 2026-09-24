import { describe, expect, it } from "vitest";
import { rankApps } from "@/lib/board-search";

const apps = [
  { id: "plex", name: "Plex" },
  { id: "sonarr", name: "Sonarr" },
  { id: "sonic", name: "Sonic" },
  { id: "radarr", name: "Radarr" },
];

describe("rankApps", () => {
  it("returns all apps in manual order for an empty query", () => {
    expect(rankApps(apps, "  ")).toEqual(apps);
  });

  it("matches case-insensitive prefixes and ranks them before substrings", () => {
    expect(rankApps(apps, "SON").map(({ id }) => id)).toEqual(["sonarr", "sonic"]);
  });

  it("finds near misses and ranks closer names first", () => {
    expect(rankApps(apps, "sonr").map(({ id }) => id)).toContain("sonarr");
    expect(rankApps(apps, "sona").map(({ id }) => id)).toEqual(["sonarr"]);
  });

  it("keeps manual order when match quality ties", () => {
    const tied = [{ id: "first", name: "Platform Alpha" }, { id: "second", name: "Platform Beta" }];
    expect(rankApps(tied, "platform").map(({ id }) => id)).toEqual(["first", "second"]);
  });

  it("returns no results for a query outside fuzzy tolerance", () => {
    expect(rankApps(apps, "zzzzzz")).toEqual([]);
  });
});
