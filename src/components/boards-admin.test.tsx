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
      apps: {
        list: { useQuery: (_input: unknown, options: { initialData: unknown }) => ({ data: options.initialData }) },
        create: { useMutation }, update: { useMutation },
      },
    },
  };
});

import { BoardsAdmin } from "./boards-admin";

afterEach(() => vi.unstubAllGlobals());

it("renders the same board link during server and browser initial renders", () => {
  const props = {
    initialBoards: [{ id: "board-1", nanoid: "public-id", name: "Home", ownerId: "user-1", createdAt: "", updatedAt: "", apps: [] }],
    initialApps: [],
  };
  const link = () => renderToStaticMarkup(<BoardsAdmin {...props} />)
    .match(/<a[^>]*href="\/board\/public-id"[^>]*>.*?<\/a>/)?.[0];

  const serverLink = link();
  vi.stubGlobal("window", { location: { origin: "http://localhost:3000" } });
  const browserLink = link();

  expect(serverLink).toContain("/board/public-id");
  expect(serverLink).toContain('target="_blank"');
  expect(serverLink).toContain('rel="noreferrer"');
  expect(browserLink).toBe(serverLink);
});

it("marks the default board and disables its set-default control", () => {
  const html = renderToStaticMarkup(<BoardsAdmin initialBoards={[{ id: "board-1", nanoid: "public-id", name: "Home", ownerId: "user-1", createdAt: "", updatedAt: "", apps: [] }]} initialApps={[]} initialDefaultBoardId="board-1" />);
  expect(html).toContain("Default");
  expect(html).not.toContain("Set as default");
  expect(html).toContain("disabled");
});

it("renders icon-only move controls with accessible labels", () => {
  const html = renderToStaticMarkup(<BoardsAdmin initialBoards={[{ id: "board-1", nanoid: "public-id", name: "Home", ownerId: "user-1", createdAt: "", updatedAt: "", apps: [{ boardId: "board-1", appId: "plex", position: 0, app: { id: "plex", name: "Plex", url: "https://plex.example", iconSlug: "plex", createdAt: "", updatedAt: "" } }] }]} initialApps={[]} />);
  expect(html).toContain('aria-label="Edit Plex"');
  expect(html).toContain('aria-label="Move Plex up"');
  expect(html).toContain('aria-label="Move Plex down"');
  expect(html).not.toContain(">Edit<");
  expect(html).not.toContain(">Move up<");
  expect(html).not.toContain(">Move down<");
});

it("offers board and app creation from modal triggers instead of inline forms", () => {
  const html = renderToStaticMarkup(<BoardsAdmin initialBoards={[]} initialApps={[]} />);
  expect(html).toContain("Add board");
  expect(html).toContain("Add app");
  expect(html).not.toContain("New board name");
});
