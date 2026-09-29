import { TRPCError } from "@trpc/server"
import {
  appIdInputSchema,
  appIdsInputSchema,
  appInputSchema,
  appUpdateInputSchema,
} from "@/lib/app-validation"
import {
  AppForbiddenError,
  AppNotFoundError,
  AppUrlConflictError,
} from "@/server/apps/service"
import { appStatusService } from "@/server/apps/status"
import { sharedAppService } from "@/server/apps/shared"
import { protectedProcedure, publicProcedure, router } from "@/server/trpc"

function appMutationError(error: unknown): never {
  if (error instanceof AppNotFoundError)
    throw new TRPCError({ code: "NOT_FOUND", message: error.message })
  if (error instanceof AppForbiddenError)
    throw new TRPCError({ code: "FORBIDDEN", message: error.message })
  if (error instanceof AppUrlConflictError)
    throw new TRPCError({ code: "CONFLICT", message: error.message })
  throw error
}

export const appRouter = router({
  list: publicProcedure.query(() => sharedAppService.list()),
  statuses: publicProcedure
    .input(appIdsInputSchema)
    .query(({ input }) => appStatusService.appStatuses(input.ids)),
  recheckStatus: protectedProcedure
    .input(appIdInputSchema)
    .mutation(async ({ input }) => {
      const result = await appStatusService.requestCheck(input.id)
      if (!result)
        throw new TRPCError({ code: "NOT_FOUND", message: "App not found." })
      return result
    }),
  create: protectedProcedure
    .input(appInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await sharedAppService.create(input, ctx.session.user.id)
      } catch (error) {
        appMutationError(error)
      }
    }),
  update: protectedProcedure
    .input(appUpdateInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await sharedAppService.update(input, ctx.session.user.id)
      } catch (error) {
        appMutationError(error)
      }
    }),
  delete: protectedProcedure
    .input(appIdInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await sharedAppService.delete(input.id, ctx.session.user.id)
      } catch (error) {
        appMutationError(error)
      }
    }),
})
