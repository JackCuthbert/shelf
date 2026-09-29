import { expect, it } from "vitest"
import { createAppQueryClient } from "./trpc-provider"

const appKey = [["apps", "list"], { type: "query" }]
const boardKey = [["boards", "list"], { type: "query" }]

async function mutate(mutation: string[]) {
  const client = createAppQueryClient()
  client.setQueryData(appKey, [])
  client.setQueryData(boardKey, [])
  const operation = client.getMutationCache().build(client, {
    mutationKey: [mutation],
    mutationFn: async () => ({}),
  })
  await operation.execute(undefined)
  return client
}

it.each([
  { mutation: ["apps", "create"], apps: true, boards: true },
  { mutation: ["apps", "update"], apps: true, boards: true },
  { mutation: ["apps", "delete"], apps: true, boards: true },
  { mutation: ["boards", "delete"], apps: false, boards: true },
  { mutation: ["boards", "createCategory"], apps: false, boards: true },
  { mutation: ["imports", "previewHomarr"], apps: false, boards: false },
])(
  "invalidates affected lists after $mutation",
  async ({ mutation, apps, boards }) => {
    const client = await mutate(mutation)
    expect(client.getQueryState(appKey)?.isInvalidated).toBe(apps)
    expect(client.getQueryState(boardKey)?.isInvalidated).toBe(boards)
  },
)

it("does not invalidate broad lists after manual status acceptance", async () => {
  const client = await mutate(["apps", "recheckStatus"])
  expect(client.getQueryState(appKey)?.isInvalidated).toBe(false)
  expect(client.getQueryState(boardKey)?.isInvalidated).toBe(false)
})
