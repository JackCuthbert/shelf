import type { AppInput } from "@/lib/app-validation"

export type SharedApp = {
  id: string
  name: string
  description: string
  url: string
  iconSource: string
  iconSlug: string | null
  customIconUrl: string | null
  iconHash: string | null
  status: string
  lastCheckedAt: Date | null
  lastError: string | null
  createdAt: Date
  updatedAt: Date
}

export type AppValues = Pick<
  SharedApp,
  | "name"
  | "description"
  | "url"
  | "iconSource"
  | "iconSlug"
  | "customIconUrl"
  | "iconHash"
>
export type AppUpdateValues = AppValues &
  Partial<Pick<SharedApp, "status" | "lastCheckedAt" | "lastError">>

export interface AppRepository {
  list(): Promise<SharedApp[]>
  find(id: string): Promise<SharedApp | null>
  create(input: AppValues): Promise<SharedApp>
  update(id: string, input: AppUpdateValues): Promise<SharedApp>
  delete(id: string): Promise<SharedApp>
  countIcon(key: string): Promise<number>
}

export interface AppIconCache {
  ensure(slug: string): Promise<boolean>
  storeFromUrl(url: string): Promise<{ hash: string; created: boolean }>
  remove(key: string): Promise<void>
}

export class AppNotFoundError extends Error {
  constructor() {
    super("App not found.")
  }
}

function iconKey(app: Pick<SharedApp, "iconSource" | "iconSlug" | "iconHash">) {
  return app.iconSource === "url" ? (app.iconHash ?? "") : (app.iconSlug ?? "")
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
  async function removeIfUnreferenced(key: string) {
    if (key && (await repository.countIcon(key)) === 0) await icons.remove(key)
  }

  async function createValues(
    input: AppInput,
  ): Promise<{ values: AppValues; created: string | null }> {
    if (input.iconSource === "url") {
      const { hash, created } = await icons.storeFromUrl(input.iconUrl)
      return {
        values: {
          name: input.name,
          description: input.description,
          url: input.url,
          iconSource: "url",
          iconSlug: null,
          customIconUrl: input.iconUrl,
          iconHash: hash,
        },
        created: created ? hash : null,
      }
    }
    const newlyCached = await icons.ensure(input.iconSlug)
    return {
      values: {
        name: input.name,
        description: input.description,
        url: input.url,
        iconSource: "dashboard",
        iconSlug: input.iconSlug,
        customIconUrl: null,
        iconHash: null,
      },
      created: newlyCached ? input.iconSlug : null,
    }
  }

  return {
    list: () => repository.list(),
    create: (input: AppInput) =>
      serialize(async () => {
        const { values, created } = await createValues(input)
        try {
          return await repository.create(values)
        } catch (error) {
          if (created && (await repository.countIcon(created)) === 0)
            await icons.remove(created)
          throw error
        }
      }),
    update: (input: AppInput & { id: string }) =>
      serialize(async () => {
        const existing = await repository.find(input.id)
        if (!existing) throw new AppNotFoundError()
        const { values, created } = await createValuesForUpdate(input, existing)
        let updated: SharedApp
        try {
          const valuesWithStatus: AppUpdateValues =
            existing.url === input.url
              ? values
              : {
                  ...values,
                  status: "unknown",
                  lastCheckedAt: null,
                  lastError: null,
                }
          updated = await repository.update(input.id, valuesWithStatus)
        } catch (error) {
          if (created && (await repository.countIcon(created)) === 0)
            await icons.remove(created)
          throw error
        }
        const previous = iconKey(existing)
        const next = iconKey(updated)
        if (previous !== next) await removeIfUnreferenced(previous)
        return updated
      }),
    delete: (id: string) =>
      serialize(async () => {
        const existing = await repository.find(id)
        if (!existing) throw new AppNotFoundError()
        const deleted = await repository.delete(id)
        await removeIfUnreferenced(iconKey(deleted))
        return deleted
      }),
  }

  async function createValuesForUpdate(
    input: AppInput,
    existing: SharedApp,
  ): Promise<{ values: AppValues; created: string | null }> {
    if (input.iconSource === "url") {
      if (
        existing.iconSource === "url" &&
        existing.customIconUrl === input.iconUrl &&
        existing.iconHash
      ) {
        return {
          values: {
            name: input.name,
            description: input.description,
            url: input.url,
            iconSource: "url",
            iconSlug: null,
            customIconUrl: input.iconUrl,
            iconHash: existing.iconHash,
          },
          created: null,
        }
      }
      const { hash, created } = await icons.storeFromUrl(input.iconUrl)
      return {
        values: {
          name: input.name,
          description: input.description,
          url: input.url,
          iconSource: "url",
          iconSlug: null,
          customIconUrl: input.iconUrl,
          iconHash: hash,
        },
        created: created ? hash : null,
      }
    }
    const newlyCached = await icons.ensure(input.iconSlug)
    return {
      values: {
        name: input.name,
        description: input.description,
        url: input.url,
        iconSource: "dashboard",
        iconSlug: input.iconSlug,
        customIconUrl: null,
        iconHash: null,
      },
      created: newlyCached ? input.iconSlug : null,
    }
  }
}
