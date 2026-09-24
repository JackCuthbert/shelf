import { afterEach, describe, expect, it } from "vitest"
import { createClient, type Client } from "@libsql/client"
import {
  acquireSetupClaim,
  claimLifetimeMs,
  finishSetupClaim,
  releaseSetupClaim,
} from "./setup-claim"

const clients: Client[] = []
let path = ""

async function freshDatabase() {
  path = `/tmp/hometime-claim-${crypto.randomUUID()}.db`
  const a = createClient({ url: `file:${path}`, timeout: 5000 })
  const b = createClient({ url: `file:${path}`, timeout: 5000 })
  clients.push(a, b)
  await a.batch([
    "CREATE TABLE user (id TEXT PRIMARY KEY)",
    "CREATE TABLE Instance (id TEXT PRIMARY KEY, state TEXT NOT NULL, token TEXT NOT NULL UNIQUE, claimedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  ])
  return [a, b] as const
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()))
})

describe("durable initial setup claim", () => {
  it("allows exactly one concurrent first visitor to claim the instance", async () => {
    const [a, b] = await freshDatabase()
    const results = await Promise.all([
      acquireSetupClaim(a, "first-token"),
      acquireSetupClaim(b, "second-token"),
    ])
    expect(results.filter((result) => result === "acquired")).toHaveLength(1)
    expect(
      results.every(
        (result) =>
          result !== "acquired" ||
          results.filter((r) => r === "acquired").length === 1,
      ),
    ).toBe(true)
  })

  it("reclaims an interrupted claim after its lease expires", async () => {
    const [a] = await freshDatabase()
    await a.execute({
      sql: "INSERT INTO Instance(id,state,token,claimedAt) VALUES('singleton','claiming','old-token',?)",
      args: [new Date(Date.now() - claimLifetimeMs - 1000).toISOString()],
    })
    expect(await acquireSetupClaim(a, "new-token")).toBe("acquired")
    expect(await finishSetupClaim(a, "new-token")).toBe(true)
    await releaseSetupClaim(a, "new-token")
    const row = await a.execute(
      "SELECT state FROM Instance WHERE id='singleton'",
    )
    expect(row.rows[0]?.state).toBe("claimed")
  })

  it("allows a failed auth attempt to release only its own claim", async () => {
    const [a] = await freshDatabase()
    expect(await acquireSetupClaim(a, "owner-token")).toBe("acquired")
    await releaseSetupClaim(a, "other-token")
    const stillClaimed = await a.execute(
      "SELECT token FROM Instance WHERE id='singleton'",
    )
    expect(stillClaimed.rows[0]?.token).toBe("owner-token")
    await releaseSetupClaim(a, "owner-token")
    const empty = await a.execute(
      "SELECT id FROM Instance WHERE id='singleton'",
    )
    expect(empty.rows).toHaveLength(0)
  })
})
