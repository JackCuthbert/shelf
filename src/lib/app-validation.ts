import { z } from "zod";

export const iconSlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Choose a valid Dashboard Icons slug.");

export const appInputSchema = z.object({
  name: z.string().trim().min(1, "Enter an app name.").max(120),
  url: z.string().trim().url().transform((value, context) => {
    let parsed: URL;
    try { parsed = new URL(value); } catch { context.addIssue({ code: "custom", message: "Enter a valid HTTP(S) URL." }); return z.NEVER; }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      context.addIssue({ code: "custom", message: "App URLs must use HTTP or HTTPS." });
      return z.NEVER;
    }
    return parsed.toString();
  }),
  iconSlug: iconSlugSchema,
});

export const appIdInputSchema = z.object({ id: z.string().min(1) });
