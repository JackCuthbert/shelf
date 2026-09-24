import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { iconSlugSchema } from "./app-validation";

const CDN = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/";
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_ICON_BYTES = 5 * 1024 * 1024;
export const iconDirectory = process.env.HOMETIME_ICON_DIR ?? "/data/icons";

export function createIconCache(directory = iconDirectory, download: (slug: string) => Promise<Buffer> = downloadPng) {
  return {
    async ensure(slug: string): Promise<boolean> {
      iconSlugSchema.parse(slug);
      await mkdir(directory, { recursive: true });
      const destination = join(directory, `${slug}.png`);
      try { await readFile(destination); return false; } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }

      const bytes = await download(slug);
      if (bytes.length < PNG_SIGNATURE.length || bytes.length > MAX_ICON_BYTES || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
        throw new Error("Dashboard Icons returned an invalid PNG.");
      }
      const temporary = join(directory, `.${slug}.${randomUUID()}.tmp`);
      try {
        await writeFile(temporary, bytes, { flag: "wx" });
        await rename(temporary, destination);
        return true;
      } catch (error) {
        await rm(temporary, { force: true });
        throw error;
      }
    },
    async remove(slug: string): Promise<void> {
      iconSlugSchema.parse(slug);
      await rm(join(directory, `${slug}.png`), { force: true });
    },
  };
}

async function downloadPng(slug: string): Promise<Buffer> {
  const response = await fetch(`${CDN}${slug}.png`, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Could not download the selected icon (HTTP ${response.status}).`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("image/png")) throw new Error("Dashboard Icons returned an invalid PNG.");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_ICON_BYTES) throw new Error("Dashboard Icons image is too large.");
  return bytes;
}

export const iconCache = createIconCache();
