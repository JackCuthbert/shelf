import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BoardSearch } from "@/components/board-search";

export const dynamic = "force-dynamic";

export default async function BoardPage({ params }: { params: Promise<{ nanoid: string }> }) {
  const { nanoid } = await params;
  const board = await prisma.board.findUnique({ where: { nanoid }, include: { apps: { include: { app: true }, orderBy: { position: "asc" } } } });
  if (!board) notFound();
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 sm:px-8">
    <header><p className="text-sm font-semibold tracking-[0.2em] text-emerald-800">HOMETIME</p><h1 className="mt-2 text-3xl font-semibold">{board.name}</h1></header>
    {board.apps.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-white/70 px-6 py-12 text-center"><p className="font-medium">This board is empty</p><p className="mt-1 text-sm text-stone-600">The board owner can add apps from admin.</p></div> : <BoardSearch apps={board.apps.map(({ app }) => app)} />}
  </main>;
}
