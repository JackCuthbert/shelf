import { handle } from "hono/vercel"
import { createAgentApi } from "@/server/agent-api/app"
import { registerAppRoutes } from "@/server/agent-api/apps"
import { registerBoardRoutes } from "@/server/agent-api/boards"
import { registerIconRoutes } from "@/server/agent-api/icons"

export const runtime = "nodejs"
const app = createAgentApi()
registerAppRoutes(app)
registerBoardRoutes(app)
registerIconRoutes(app)
const route = handle(app)
export const GET = route
export const POST = route
export const PATCH = route
export const PUT = route
export const DELETE = route
