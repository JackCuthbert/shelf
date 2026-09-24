import { createClient } from "@libsql/client";

export const sqlite = createClient({
  url: process.env.DATABASE_URL ?? "file:/data/app.db",
  timeout: 10_000,
});
