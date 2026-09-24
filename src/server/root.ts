import { appRouter } from "./routers/app"
import { boardRouter } from "./routers/board"
import { importRouter } from "./routers/imports"
import { router } from "./trpc"

export const appRouterRoot = router({
  apps: appRouter,
  boards: boardRouter,
  imports: importRouter,
})
export type AppRouter = typeof appRouterRoot
