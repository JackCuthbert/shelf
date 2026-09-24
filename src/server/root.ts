import { appRouter } from "./routers/app";
import { router } from "./trpc";

export const appRouterRoot = router({ apps: appRouter });
export type AppRouter = typeof appRouterRoot;
