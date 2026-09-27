import { TRPCError } from "@trpc/server"
import {
  appIdInputSchema,
  appInputSchema,
  appUpdateInputSchema,
} from "@/lib/app-validation"
import {
  AppForbiddenError,
  AppNotFoundError,
  AppUrlConflictError,
} from "@/server/app-service"
import { appStatusService } from "@/server/app-status"
import { sharedAppService } from "@/server/shared-apps"
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
  recheckStatus: protectedProcedure
    .input(appIdInputSchema)
    .mutation(async ({ input }) => {
      if (!(await appStatusService.refreshApp(input.id)))
        throw new TRPCError({ code: "NOT_FOUND", message: "App not found." })
      return { checked: true }
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
