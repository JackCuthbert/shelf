import type { Client } from "@libsql/client";
import { canCreateFirstAccount } from "./account-policy";

const claimId = "singleton";
export const claimLifetimeMs = 10 * 60 * 1000;

export type SetupClaimResult = "acquired" | "busy" | "complete";

export async function acquireSetupClaim(db: Client, token: string, now = Date.now()): Promise<SetupClaimResult> {
  const deadline = Date.now() + 12_000;
  const claimedAt = new Date(now).toISOString();
  while (Date.now() < deadline) {
    try {
      const tx = await db.transaction("write");
      try {
        const claim = await tx.execute({ sql: "SELECT state, token, claimedAt FROM Instance WHERE id = ?", args: [claimId] });
        const users = await tx.execute({ sql: "SELECT COUNT(*) AS count FROM user" });
        const row = claim.rows[0];
        const stale = row?.state === "claiming" && now - Date.parse(String(row.claimedAt)) > claimLifetimeMs;
        if (!canCreateFirstAccount(Number(users.rows[0]?.count ?? 0), Boolean(row) && !stale)) {
          await tx.rollback();
          return "complete";
        }
        if (row) {
          const result = await tx.execute({
            sql: "UPDATE Instance SET state = 'claiming', token = ?, claimedAt = ? WHERE id = ? AND state = 'claiming' AND token = ?",
            args: [token, claimedAt, claimId, row.token],
          });
          if (result.rowsAffected !== 1) {
            await tx.rollback();
            return "busy";
          }
        } else {
          await tx.execute({ sql: "INSERT INTO Instance (id, state, token, claimedAt) VALUES (?, 'claiming', ?, ?)", args: [claimId, token, claimedAt] });
        }
        await tx.commit();
        return "acquired";
      } catch (error) {
        await tx.rollback();
        const message = error instanceof Error ? error.message : "";
        if (!message.includes("SQLITE_BUSY") && !message.includes("database is locked")) return "busy";
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("SQLITE_BUSY") && !message.includes("database is locked")) return "busy";
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return "busy";
}

export async function finishSetupClaim(db: Client, token: string): Promise<boolean> {
  const result = await db.execute({
    sql: "UPDATE Instance SET state = 'claimed', claimedAt = ? WHERE id = ? AND state = 'claiming' AND token = ?",
    args: [new Date().toISOString(), claimId, token],
  });
  return result.rowsAffected === 1;
}

export async function releaseSetupClaim(db: Client, token: string): Promise<void> {
  await db.execute({ sql: "DELETE FROM Instance WHERE id = ? AND state = 'claiming' AND token = ?", args: [claimId, token] });
}
