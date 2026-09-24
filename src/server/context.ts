import { auth } from "@/lib/auth"
import type { TRPCContext } from "./trpc"

export async function createTRPCContext(
  headers: Headers,
): Promise<TRPCContext> {
  return { session: await auth.api.getSession({ headers }) }
}
