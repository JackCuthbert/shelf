import { defineConfig, devices } from "@playwright/test"
import { resolve } from "node:path"

const baseURL = "http://127.0.0.1:3310"

export default defineConfig({
  testDir: "./e2e",
  testMatch: "screenshot.ts",
  workers: 1,
  retries: 0,
  timeout: 60_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    headless: true,
    viewport: { width: 1280, height: 841 },
    colorScheme: "light",
    locale: "en-AU",
    timezoneId: "UTC",
    trace: "retain-on-failure",
  },
  projects: [{ name: "screenshot" }],
  webServer: {
    command:
      "npm run db:generate && node --import tsx e2e/seed.ts && npm run build && npm run start -- --hostname 127.0.0.1 --port 3310",
    url: `${baseURL}/login`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: `file:${resolve("data/screenshots/app.db")}`,
      SHELF_ICON_DIR: resolve("data/screenshots/icons"),
      BETTER_AUTH_URL: baseURL,
      BETTER_AUTH_SECRET: "screenshot-only-secret-not-for-production",
      ENABLE_SIGNUP: "false",
      OIDC_ISSUER: "",
      OIDC_CLIENT_ID: "",
      OIDC_CLIENT_SECRET: "",
      TZ: "UTC",
    },
  },
})
