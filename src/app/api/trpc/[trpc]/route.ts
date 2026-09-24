import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { createTRPCContext } from "@/server/context"
import { appRouterRoot } from "@/server/root"

const handler = (request: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouterRoot,
    createContext: () => createTRPCContext(request.headers),
  })

export { handler as GET, handler as POST }
