import { appRouter } from "./routers/app";
import { router } from "./trpc";
import { boardRouter } from "./routers/board";

export const appRouterRoot = router({ apps: appRouter, boards: boardRouter });
export type AppRouter = typeof appRouterRoot;
