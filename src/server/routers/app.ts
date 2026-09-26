import { TRPCError } from "@trpc/server"
import {
  appIdInputSchema,
  appInputSchema,
  appUpdateInputSchema,
} from "@/lib/app-validation"
import { iconCache } from "@/lib/icon-cache"
import { prisma } from "@/lib/prisma"
import {
  AppForbiddenError,
  AppNotFoundError,
  AppUrlConflictError,
  createSharedAppService,
} from "@/server/app-service"
import { appStatusService } from "@/server/app-status"
import { protectedProcedure, publicProcedure, router } from "@/server/trpc"

const appService = createSharedAppService(
  {
    list: () =>
      prisma.app.findMany({ orderBy: [{ name: "asc" }, { id: "asc" }] }),
    find: (id) => prisma.app.findUnique({ where: { id } }),
    findByUrl: (url) => prisma.app.findFirst({ where: { url } }),
    create: (data) => prisma.app.create({ data }),
    update: (id, data) => prisma.app.update({ where: { id }, data }),
    delete: (id) => prisma.app.delete({ where: { id } }),
    countIcon: (key) =>
      prisma.app.count({
        where: { OR: [{ iconSlug: key }, { iconHash: key }] },
      }),
  },
  iconCache,
)

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
  list: publicProcedure.query(() => appService.list()),
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
        return await appService.create(input, ctx.session.user.id)
      } catch (error) {
        appMutationError(error)
      }
    }),
  update: protectedProcedure
    .input(appUpdateInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await appService.update(input, ctx.session.user.id)
      } catch (error) {
        appMutationError(error)
      }
    }),
  delete: protectedProcedure
    .input(appIdInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await appService.delete(input.id, ctx.session.user.id)
      } catch (error) {
        appMutationError(error)
      }
    }),
})
