import { createServer } from "node:http"
import next from "next"
import { runAppStatusScheduler } from "../src/server/apps/status/index.ts"
import { getStatusCheckIntervalSeconds } from "../src/server/apps/status/config.ts"

function parseOptions(args: string[], env: NodeJS.ProcessEnv) {
  let hostname = "0.0.0.0"
  let port = Number(env.PORT ?? 3000)
  let dev = env.NODE_ENV !== "production"
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--dev") dev = true
    else if (arg === "--hostname") hostname = args[++i] ?? hostname
    else if (arg === "--port") port = Number(args[++i] ?? port)
    else if (arg.startsWith("--hostname=")) hostname = arg.slice(11)
    else if (arg.startsWith("--port=")) port = Number(arg.slice(7))
  }
  return { dev, hostname, port }
}

async function start() {
  const options = parseOptions(process.argv.slice(2), process.env)
  const app = next(options)
  const checkIntervalSeconds = getStatusCheckIntervalSeconds()
  await app.prepare()
  const server = createServer(app.getRequestHandler())
  server.listen(options.port, options.hostname, async () => {
    void runAppStatusScheduler(checkIntervalSeconds)
  })
}

start().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
