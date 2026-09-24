import { stdin, stdout } from "node:process";
import { createClient } from "@libsql/client";
import { hashPassword } from "better-auth/crypto";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || process.argv.length !== 3) {
  console.error("Usage: npm run admin:reset-password -- <email>");
  process.exit(2);
}
if (!stdin.isTTY) {
  console.error("Run this command from an interactive terminal so the password can be prompted securely.");
  process.exit(2);
}

const password = await new Promise<string>((resolve) => {
  stdout.write("New password (8+ characters): ");
  const wasRaw = stdin.isRaw;
  stdin.setRawMode(true);
  const onData = (chunk: Buffer) => {
    const key = chunk.toString("utf8");
    if (key === "\u0003") {
      stdin.setRawMode(wasRaw);
      process.exit(130);
    }
    if (key !== "\r" && key !== "\n") {
      chunks.push(key);
      return;
    }
    stdin.off("data", onData);
    stdin.pause();
    stdin.setRawMode(wasRaw);
    stdout.write("\n");
    resolve(chunks.join(""));
  };
  const chunks: string[] = [];
  stdin.on("data", onData);
  stdin.resume();
});
if (password.length < 8) {
  console.error("Password must contain at least 8 characters.");
  process.exit(2);
}

const db = createClient({ url: process.env.DATABASE_URL ?? "file:/data/app.db" });
const result = await db.execute({ sql: "SELECT id FROM user WHERE email = ? COLLATE NOCASE", args: [email] });
const userId = result.rows[0]?.id;
if (typeof userId !== "string") {
  console.error(`No account found for ${email}.`);
  process.exit(1);
}
const hash = await hashPassword(password);
await db.execute({
  sql: "UPDATE account SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ? AND providerId = 'credential'",
  args: [hash, userId],
});
console.log(`Password reset for ${email}.`);
await db.close();
