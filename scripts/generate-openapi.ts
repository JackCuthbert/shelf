import { readFile, writeFile } from "node:fs/promises"
import { isDeepStrictEqual } from "node:util"
import { createAgentApi } from "../src/server/agent-api/app"
import { registerAppRoutes } from "../src/server/agent-api/apps"
import { registerBoardRoutes } from "../src/server/agent-api/boards"
import { registerIconRoutes } from "../src/server/agent-api/icons"

const app = createAgentApi(async () => null)
registerAppRoutes(app)
registerBoardRoutes(app)
registerIconRoutes(app)
const document = app.getOpenAPIDocument({
  openapi: "3.1.0",
  info: { title: "Shelf Agent API", version: "1.0.0" },
  servers: [{ url: "/" }],
})
const output = `${JSON.stringify(document, null, 2)}\n`
if (process.argv.includes("--check")) {
  let current: unknown
  try {
    current = JSON.parse(await readFile("spec/openapi.json", "utf8"))
  } catch {
    current = undefined
  }
  if (!isDeepStrictEqual(current, document)) {
    console.error("spec/openapi.json is stale. Run npm run api:openapi.")
    process.exitCode = 1
  }
} else {
  await writeFile("spec/openapi.json", output)
}
