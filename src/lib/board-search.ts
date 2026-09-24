export type SearchableApp = { id: string; name: string }

export type CategorySummary = {
  id: string
  title: string
  description: string
}

export type CategorizedApp = SearchableApp & { categoryId: string | null }

export type AppGroup<T> = {
  category: CategorySummary | null
  apps: T[]
}

function scoreName(name: string, query: string): number | null {
  const normalizedName = name.toLocaleLowerCase()
  const normalizedQuery = query.toLocaleLowerCase().trim()
  if (!normalizedQuery) return 0
  if (normalizedName === normalizedQuery) return 0
  if (normalizedName.startsWith(normalizedQuery)) return 1
  const substringIndex = normalizedName.indexOf(normalizedQuery)
  if (substringIndex >= 0) return 2 + substringIndex / 100

  // Allow an omitted interior character in a longer name, such as "sonr" for "Sonarr".
  if (
    normalizedName.length > normalizedQuery.length &&
    normalizedName.startsWith(normalizedQuery.slice(0, 3))
  ) {
    const remainder = normalizedQuery.slice(3)
    if (remainder && normalizedName.slice(4).startsWith(remainder)) return 3.5
  }
  return null
}

export function rankApps<T extends SearchableApp>(
  apps: readonly T[],
  query: string,
): T[] {
  if (!query.trim()) return [...apps]
  return apps
    .map((app, index) => ({ app, index, score: scoreName(app.name, query) }))
    .filter(
      (entry): entry is { app: T; index: number; score: number } =>
        entry.score !== null,
    )
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map(({ app }) => app)
}

/**
 * Splits a board's apps into display groups: uncategorized apps first (when
 * present), then every category in its saved order, including empty ones.
 */
export function groupBoardApps<T extends CategorizedApp>(
  apps: readonly T[],
  categories: readonly CategorySummary[],
): AppGroup<T>[] {
  const groups: AppGroup<T>[] = []
  const uncategorized = apps.filter((app) => app.categoryId === null)
  if (uncategorized.length > 0)
    groups.push({ category: null, apps: uncategorized })
  for (const category of categories)
    groups.push({
      category,
      apps: apps.filter((app) => app.categoryId === category.id),
    })
  return groups
}

/**
 * Ranks matches within each group and hides empty groups. With an empty query
 * every group is kept so empty categories stay visible.
 */
export function filterAppGroups<T extends SearchableApp>(
  groups: readonly AppGroup<T>[],
  query: string,
): AppGroup<T>[] {
  if (!query.trim()) return groups.map((group) => ({ ...group }))
  return groups
    .map((group) => ({ ...group, apps: rankApps(group.apps, query) }))
    .filter((group) => group.apps.length > 0)
}
