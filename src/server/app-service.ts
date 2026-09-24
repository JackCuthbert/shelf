export type SharedApp = {
  id: string
  name: string
  description: string
  url: string
  iconSlug: string
  status: string
  lastCheckedAt: Date | null
  lastError: string | null
  createdAt: Date
  updatedAt: Date
}

export type AppValues = Pick<
  SharedApp,
  "name" | "description" | "url" | "iconSlug"
>
export type AppUpdateValues = AppValues &
  Partial<Pick<SharedApp, "status" | "lastCheckedAt" | "lastError">>

export interface AppRepository {
  list(): Promise<SharedApp[]>
  find(id: string): Promise<SharedApp | null>
  create(input: AppValues): Promise<SharedApp>
  update(id: string, input: AppUpdateValues): Promise<SharedApp>
  delete(id: string): Promise<SharedApp>
  countIcon(slug: string): Promise<number>
}

export interface AppIconCache {
  ensure(slug: string): Promise<boolean>
  remove(slug: string): Promise<void>
}

export class AppNotFoundError extends Error {
  constructor() {
    super("App not found.")
  }
}

export function createSharedAppService(
  repository: AppRepository,
  icons: AppIconCache,
) {
  let tail: Promise<void> = Promise.resolve()
  async function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const previous = tail
    let release!: () => void
    tail = new Promise<void>((resolve) => {
      release = resolve
    })
    await previous
    try {
      return await operation()
    } finally {
      release()
    }
  }
  async function removeIfUnreferenced(slug: string) {
    if ((await repository.countIcon(slug)) === 0) await icons.remove(slug)
  }

  return {
    list: () => repository.list(),
    create: (input: AppValues) =>
      serialize(async () => {
        const newlyCached = await icons.ensure(input.iconSlug)
        try {
          return await repository.create(input)
        } catch (error) {
          if (newlyCached && (await repository.countIcon(input.iconSlug)) === 0)
            await icons.remove(input.iconSlug)
          throw error
        }
      }),
    update: (input: AppValues & { id: string }) =>
      serialize(async () => {
        const existing = await repository.find(input.id)
        if (!existing) throw new AppNotFoundError()
        const newlyCached = await icons.ensure(input.iconSlug)
        let updated: SharedApp
        try {
          const appValues = {
            name: input.name,
            description: input.description,
            url: input.url,
            iconSlug: input.iconSlug,
          }
          const values: AppUpdateValues =
            existing.url === input.url
              ? appValues
              : {
                  ...appValues,
                  status: "unknown",
                  lastCheckedAt: null,
                  lastError: null,
                }
          updated = await repository.update(input.id, values)
        } catch (error) {
          if (newlyCached && (await repository.countIcon(input.iconSlug)) === 0)
            await icons.remove(input.iconSlug)
          throw error
        }
        if (existing.iconSlug !== updated.iconSlug)
          await removeIfUnreferenced(existing.iconSlug)
        return updated
      }),
    delete: (id: string) =>
      serialize(async () => {
        const existing = await repository.find(id)
        if (!existing) throw new AppNotFoundError()
        const deleted = await repository.delete(id)
        await removeIfUnreferenced(deleted.iconSlug)
        return deleted
      }),
  }
}
