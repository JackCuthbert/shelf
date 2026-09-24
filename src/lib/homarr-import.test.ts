import { describe, expect, it, vi } from "vitest"
import {
  applyImported,
  clearUnknownIcons,
  runImport,
  selectedImportRows,
  toImportRows,
} from "./homarr-import"
import type { HomarrApp } from "./homarr"

const apps: HomarrApp[] = [
  {
    sourceId: "1",
    name: "Plex",
    description: "",
    url: "https://plex.home/",
    iconUrl:
      "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/plex.png",
    importable: true,
    reason: null,
  },
  {
    sourceId: "2",
    name: "Editor",
    description: "",
    url: "vscode://file",
    iconUrl: "",
    importable: false,
    reason: "Homarr URL is not HTTP(S).",
  },
]

describe("toImportRows", () => {
  it("selects importable apps and suggests icons", () => {
    const rows = toImportRows(apps)
    expect(rows[0]).toMatchObject({
      key: "1",
      iconSlug: "plex",
      selected: true,
    })
    expect(rows[1]).toMatchObject({
      key: "2",
      iconSlug: "",
      selected: false,
      reason: "Homarr URL is not HTTP(S).",
    })
  })

  it("falls back to an index key when Homarr omits an id", () => {
    const rows = toImportRows([{ ...apps[0], sourceId: "" }])
    expect(rows[0].key).toBe("row-0")
  })
})

describe("clearUnknownIcons", () => {
  it("clears suggested slugs that are not in the catalogue", () => {
    const rows = toImportRows(apps)
    expect(clearUnknownIcons(rows, new Set(["plex"]))[0].iconSlug).toBe("plex")
    expect(clearUnknownIcons(rows, new Set())[0].iconSlug).toBe("")
  })
})

describe("selection helpers", () => {
  it("counts only selected importable rows and deselects imported ones", () => {
    const rows = toImportRows(apps)
    expect(selectedImportRows(rows)).toHaveLength(1)
    const after = applyImported(rows, new Set(["1"]))
    expect(after[0].selected).toBe(false)
  })
})

describe("runImport", () => {
  it("imports each selected row, uses the placeholder for blank icons, and reports failures", async () => {
    const importable: HomarrApp[] = [
      apps[0],
      {
        sourceId: "3",
        name: "No icon",
        description: "",
        url: "https://noicon.home/",
        iconUrl: "",
        importable: true,
        reason: null,
      },
    ]
    const create = vi.fn(async (input: { name: string }) => {
      if (input.name === "Plex") throw new Error("Could not download the icon.")
    })
    const result = await runImport(toImportRows(importable), create)
    expect(result.failures).toEqual([
      { name: "Plex", reason: "Could not download the icon." },
    ])
    expect([...result.importedKeys]).toEqual(["3"])
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "No icon", iconSlug: "placeholder" }),
    )
    expect(create).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: "Editor" }),
    )
  })
})
