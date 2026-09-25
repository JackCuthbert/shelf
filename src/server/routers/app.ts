import { TRPCError } from "@trpc/server"
import {
  appIdInputSchema,
  appInputSchema,
  appUpdateInputSchema,
} from "@/lib/app-validation"
import { iconCache } from "@/lib/icon-cache"
import { prisma } from "@/lib/prisma"
import { AppNotFoundError, createSharedAppService } from "@/server/app-service"
import { appStatusService } from "@/server/app-status"
import { protectedProcedure, router } from "@/server/trpc"

const appService = createSharedAppService(
  {
    list: () =>
      prisma.app.findMany({ orderBy: [{ name: "asc" }, { id: "asc" }] }),
    find: (id) => prisma.app.findUnique({ where: { id } }),
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

export const appRouter = router({
  list: protectedProcedure.query(() => appService.list()),
  recheckStatus: protectedProcedure
    .input(appIdInputSchema)
    .mutation(async ({ input }) => {
      if (!(await appStatusService.refreshApp(input.id)))
        throw new TRPCError({ code: "NOT_FOUND", message: "App not found." })
      return { checked: true }
    }),
  create: protectedProcedure
    .input(appInputSchema)
    .mutation(({ input }) => appService.create(input)),
  update: protectedProcedure
    .input(appUpdateInputSchema)
    .mutation(async ({ input }) => {
      try {
        return await appService.update(input)
      } catch (error) {
        if (error instanceof AppNotFoundError)
          throw new TRPCError({ code: "NOT_FOUND", message: error.message })
        throw error
      }
    }),
  delete: protectedProcedure
    .input(appIdInputSchema)
    .mutation(async ({ input }) => {
      try {
        return await appService.delete(input.id)
      } catch (error) {
        if (error instanceof AppNotFoundError)
          throw new TRPCError({ code: "NOT_FOUND", message: error.message })
        throw error
      }
    }),
})
