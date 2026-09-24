export type SearchableApp = { id: string; name: string }

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
