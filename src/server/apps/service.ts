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

type IconSelection =
  | { iconSource: "dashboard"; iconSlug: string }
  | { iconSource: "url"; iconUrl: string }
type IconValues = Pick<
  SharedApp,
  "iconSource" | "iconSlug" | "customIconUrl" | "iconHash"
>

function savedUrlIcon(app: SharedApp, url: string): IconValues | null {
  if (app.iconSource === "url" && app.customIconUrl === url && app.iconHash)
    return {
      iconSource: "url",
      iconSlug: null,
      customIconUrl: url,
      iconHash: app.iconHash,
    }
  if (
    app.darkIconSource === "url" &&
    app.darkCustomIconUrl === url &&
    app.darkIconHash
  )
    return {
      iconSource: "url",
      iconSlug: null,
      customIconUrl: url,
      iconHash: app.darkIconHash,
    }
  return null
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

  async function prepareIcon(
    selection: IconSelection,
    existing: SharedApp | undefined,
    prepared: Map<string, IconValues>,
    created: Set<string>,
  ): Promise<IconValues> {
    const cacheKey =
      selection.iconSource === "url"
        ? `url:${selection.iconUrl}`
        : `dashboard:${selection.iconSlug}`
    const reused = prepared.get(cacheKey)
    if (reused) return reused
    let values: IconValues
    if (selection.iconSource === "url") {
      const saved = existing && savedUrlIcon(existing, selection.iconUrl)
      if (saved) {
        values = saved
      } else {
        const { hash, created: isNew } = await icons.storeFromUrl(
          selection.iconUrl,
        )
        if (isNew) created.add(hash)
        values = {
          iconSource: "url",
          iconSlug: null,
          customIconUrl: selection.iconUrl,
          iconHash: hash,
        }
      }
    } else {
      if (await icons.ensure(selection.iconSlug))
        created.add(selection.iconSlug)
      values = {
        iconSource: "dashboard",
        iconSlug: selection.iconSlug,
        customIconUrl: null,
        iconHash: null,
      }
    }
    prepared.set(cacheKey, values)
    return values
  }

  async function removeCreated(created: Set<string>) {
    for (const key of created)
      try {
        await removeIfUnreferenced(key)
      } catch {
        // The original save error is the one to report.
      }
  }

  return {
    list: () => repository.list(),
    create: (input: AppInput, ownerId: string) =>
      serialize(async () => {
        if (await repository.findByUrl(input.url))
          throw new AppUrlConflictError()
        const prepared = new Map<string, IconValues>()
        const created = new Set<string>()
        try {
          const icon = await prepareIcon(input, undefined, prepared, created)
          return await repository.create({
            name: input.name,
            description: input.description,
            url: input.url,
            statusChecksEnabled: input.statusChecksEnabled ?? true,
            ...icon,
            ownerId,
            id: createAppNanoid(),
          })
        } catch (error) {
          await removeCreated(created)
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
        const prepared = new Map<string, IconValues>()
        const created = new Set<string>()
        let updated: SharedApp
        try {
          const icon = await prepareIcon(input, existing, prepared, created)
          const values: AppValues = {
            name: input.name,
            description: input.description,
            url: input.url,
            statusChecksEnabled:
              input.statusChecksEnabled ?? existing.statusChecksEnabled,
            ...icon,
          }
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
          await removeCreated(created)
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
}
