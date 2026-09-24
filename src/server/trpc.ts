import { initTRPC, TRPCError } from "@trpc/server";
import type { auth } from "@/lib/auth";

export type TRPCContext = { session: Awaited<ReturnType<typeof auth.api.getSession>> };

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, session: ctx.session } });
});
