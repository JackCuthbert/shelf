import { detectIconSlug } from "./homarr-icon"
import type { HomarrApp } from "./homarr"
import { PLACEHOLDER_ICON_SLUG } from "./placeholder-icon"

export type ImportRow = {
  key: string
  name: string
  description: string
  url: string
  iconUrl: string
  iconSlug: string
  importable: boolean
  reason: string | null
  selected: boolean
}

export function toImportRows(apps: HomarrApp[]): ImportRow[] {
  return apps.map((app, index) => ({
    key: app.sourceId || `row-${index}`,
    name: app.name,
    description: app.description,
    url: app.url,
    iconUrl: app.iconUrl,
    iconSlug: detectIconSlug(app.iconUrl) ?? "",
    importable: app.importable,
    reason: app.reason,
    selected: app.importable,
  }))
}

export function clearUnknownIcons(
  rows: ImportRow[],
  known: Set<string>,
): ImportRow[] {
  return rows.map((row) =>
    row.iconSlug && !known.has(row.iconSlug) ? { ...row, iconSlug: "" } : row,
  )
}

export function selectedImportRows(rows: ImportRow[]): ImportRow[] {
  return rows.filter((row) => row.selected && row.importable)
}

export function applyImported(
  rows: ImportRow[],
  importedKeys: Set<string>,
): ImportRow[] {
  return rows.map((row) =>
    importedKeys.has(row.key) ? { ...row, selected: false } : row,
  )
}

export type ImportFailure = { name: string; reason: string }

export async function runImport(
  rows: ImportRow[],
  create: (input: {
    name: string
    description: string
    url: string
    iconSource: "dashboard"
    iconSlug: string
  }) => Promise<unknown>,
): Promise<{ importedKeys: Set<string>; failures: ImportFailure[] }> {
  const importedKeys = new Set<string>()
  const failures: ImportFailure[] = []
  for (const row of selectedImportRows(rows)) {
    try {
      await create({
        name: row.name,
        description: row.description,
        url: row.url,
        iconSource: "dashboard",
        iconSlug: row.iconSlug || PLACEHOLDER_ICON_SLUG,
      })
      importedKeys.add(row.key)
    } catch (error) {
      failures.push({
        name: row.name,
        reason: error instanceof Error ? error.message : "Import failed.",
      })
    }
  }
  return { importedKeys, failures }
}
