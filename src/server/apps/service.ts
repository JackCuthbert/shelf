import type { AppInput } from "@/lib/app-validation"
import { createAppNanoid } from "@/server/boards/service"

export type SharedApp = {
  id: string
  ownerId: string
  name: string
  description: string
  url: string
  iconSource: string
  iconSlug: string | null
  customIconUrl: string | null
  iconHash: string | null
  darkIconSource: string | null
  darkIconSlug: string | null
  darkCustomIconUrl: string | null
  darkIconHash: string | null
  status: string
  statusChecksEnabled: boolean
  lastCheckedAt: Date | null
  lastError: string | null
  probeRequestedAt: Date | null
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
  | "statusChecksEnabled"
>
export type AppUpdateValues = AppValues &
  Partial<
    Pick<
      SharedApp,
      "status" | "lastCheckedAt" | "lastError" | "probeRequestedAt"
    >
  >
export type AppCreateValues = AppValues & Pick<SharedApp, "id" | "ownerId">

export interface AppRepository {
  list(): Promise<SharedApp[]>
  find(id: string): Promise<SharedApp | null>
  findByUrl(url: string): Promise<SharedApp | null>
  create(input: AppCreateValues): Promise<SharedApp>
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

export class AppForbiddenError extends Error {
  constructor() {
    super("Only the app owner can make this change.")
  }
}

export class AppUrlConflictError extends Error {
  constructor() {
    super(
      "An app with this URL already exists. Add the existing app to your board instead.",
    )
  }
}

function iconKeys(app: SharedApp): Set<string> {
  return new Set(
    [app.iconSlug, app.iconHash, app.darkIconSlug, app.darkIconHash].filter(
      (key): key is string => !!key,
    ),
  )
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
    const statusChecksEnabled = input.statusChecksEnabled ?? true
    if (input.iconSource === "url") {
      const { hash, created } = await icons.storeFromUrl(input.iconUrl)
      return {
        values: {
          name: input.name,
          description: input.description,
          url: input.url,
          statusChecksEnabled,
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
        statusChecksEnabled,
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
    create: (input: AppInput, ownerId: string) =>
      serialize(async () => {
        if (await repository.findByUrl(input.url))
          throw new AppUrlConflictError()
        const { values, created } = await createValues(input)
        try {
          return await repository.create({
            ...values,
            ownerId,
            id: createAppNanoid(),
          })
        } catch (error) {
          if (created && (await repository.countIcon(created)) === 0)
            await icons.remove(created)
          throw error
        }
      }),
    update: (input: AppInput & { id: string }, ownerId: string) =>
      serialize(async () => {
        const existing = await repository.find(input.id)
        if (!existing) throw new AppNotFoundError()
        if (existing.ownerId !== ownerId) throw new AppForbiddenError()
        if (input.url !== existing.url) {
          const matchingUrl = await repository.findByUrl(input.url)
          if (matchingUrl && matchingUrl.id !== input.id)
            throw new AppUrlConflictError()
        }
        const { values, created } = await createValuesForUpdate(input, existing)
        let updated: SharedApp
        try {
          const valuesWithStatus: AppUpdateValues =
            existing.url === input.url &&
            existing.statusChecksEnabled === values.statusChecksEnabled
              ? values
              : {
                  ...values,
                  status: "unknown",
                  lastCheckedAt: null,
                  lastError: null,
                  probeRequestedAt: null,
                }
          updated = await repository.update(input.id, valuesWithStatus)
        } catch (error) {
          if (created && (await repository.countIcon(created)) === 0)
            await icons.remove(created)
          throw error
        }
        const next = iconKeys(updated)
        for (const key of iconKeys(existing))
          if (!next.has(key)) await removeIfUnreferenced(key)
        return updated
      }),
    delete: (id: string, ownerId: string) =>
      serialize(async () => {
        const existing = await repository.find(id)
        if (!existing) throw new AppNotFoundError()
        if (existing.ownerId !== ownerId) throw new AppForbiddenError()
        const deleted = await repository.delete(id)
        for (const key of iconKeys(deleted)) await removeIfUnreferenced(key)
        return deleted
      }),
  }

  async function createValuesForUpdate(
    input: AppInput,
    existing: SharedApp,
  ): Promise<{ values: AppValues; created: string | null }> {
    const statusChecksEnabled =
      input.statusChecksEnabled ?? existing.statusChecksEnabled
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
            statusChecksEnabled,
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
          statusChecksEnabled,
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
        statusChecksEnabled,
        iconSource: "dashboard",
        iconSlug: input.iconSlug,
        customIconUrl: null,
        iconHash: null,
      },
      created: newlyCached ? input.iconSlug : null,
    }
  }
}
