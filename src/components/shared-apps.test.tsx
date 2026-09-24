import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("@/components/trpc-provider", () => {
  const useMutation = () => ({});
  return {
    trpc: {
      useUtils: () => ({ apps: { list: { invalidate: () => {} } } }),
      apps: {
        list: { useQuery: (_input: unknown, options: { initialData: unknown }) => ({ data: options.initialData }) },
        create: { useMutation }, update: { useMutation }, delete: { useMutation },
      },
    },
  };
});

import { SharedApps } from "./shared-apps";

it("opens app creation from a modal trigger instead of an inline form", () => {
  const html = renderToStaticMarkup(<SharedApps initialApps={[]} />);
  expect(html).toContain("Add app");
  expect(html).not.toContain('placeholder="https://example.home"');
});

it("shows a filter and a single-column list when apps exist", () => {
  const html = renderToStaticMarkup(<SharedApps initialApps={[{ id: "a1", name: "Plex", url: "https://plex.example", iconSlug: "plex", createdAt: "", updatedAt: "" }]} />);
  expect(html).toContain('id="app-filter"');
  expect(html).toContain("Plex");
  expect(html).not.toContain("sm:grid-cols-2");
});
