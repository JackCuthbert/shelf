import { iconCache } from "@/lib/icon-cache"
import { prisma } from "@/lib/prisma"
import { createSharedAppService } from "./service"

export const sharedAppService = Object.assign(
  createSharedAppService(
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
  ),
  {
    get: (id: string) => prisma.app.findUnique({ where: { id } }),
  },
)
