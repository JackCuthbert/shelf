import { expect, it } from "vitest"
import { createAppQueryClient } from "./trpc-provider"

const appKey = [["apps", "list"], { type: "query" }]
const boardKey = [["boards", "list"], { type: "query" }]

it.each([
  { mutation: ["apps", "create"], apps: true, boards: true },
  { mutation: ["apps", "update"], apps: true, boards: true },
  { mutation: ["boards", "delete"], apps: false, boards: true },
  { mutation: ["boards", "createCategory"], apps: false, boards: true },
  { mutation: ["boards", "refreshStatuses"], apps: true, boards: true },
  { mutation: ["imports", "previewHomarr"], apps: false, boards: false },
])(
  "invalidates affected lists after $mutation",
  async ({ mutation, apps, boards }) => {
    const client = createAppQueryClient()
    client.setQueryData(appKey, [])
    client.setQueryData(boardKey, [])
    const operation = client.getMutationCache().build(client, {
      mutationKey: [mutation],
      mutationFn: async () => ({}),
    })

  await operation.execute(undefined)

    expect(client.getQueryState(appKey)?.isInvalidated).toBe(apps)
    expect(client.getQueryState(boardKey)?.isInvalidated).toBe(boards)
  },
)
