import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/components/trpc-provider", () => {
  const useMutation = () => ({});
  return {
    trpc: {
      useUtils: () => ({ boards: { list: { invalidate: () => {} } } }),
      boards: {
        list: { useQuery: (_input: unknown, options: { initialData: unknown }) => ({ data: options.initialData }) },
        create: { useMutation }, rename: { useMutation }, delete: { useMutation },
        setDefault: { useMutation }, assign: { useMutation },
        unassign: { useMutation }, move: { useMutation },
      },
      apps: { list: { useQuery: (_input: unknown, options: { initialData: unknown }) => ({ data: options.initialData }) } },
    },
  };
});

import { BoardsAdmin } from "./boards-admin";

afterEach(() => vi.unstubAllGlobals());

it("renders the same board link text during server and browser initial renders", () => {
  const props = {
    initialBoards: [{ id: "board-1", nanoid: "public-id", name: "Home", ownerId: "user-1", createdAt: "", updatedAt: "", apps: [] }],
    initialApps: [],
  };
  const linkText = () => renderToStaticMarkup(<BoardsAdmin {...props} />)
    .match(/<a[^>]*href="\/board\/public-id"[^>]*>(.*?)<\/a>/)?.[1];

  const serverText = linkText();
  vi.stubGlobal("window", { location: { origin: "http://localhost:3000" } });
  const browserText = linkText();

  expect(serverText).toBe("/board/public-id");
  expect(browserText).toBe(serverText);
});
