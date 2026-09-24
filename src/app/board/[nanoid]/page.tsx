import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BoardPage({ params }: { params: Promise<{ nanoid: string }> }) {
  const { nanoid } = await params;
  const board = await prisma.board.findUnique({ where: { nanoid }, include: { apps: { include: { app: true }, orderBy: { position: "asc" } } } });
  if (!board) notFound();
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 sm:px-8">
    <header><p className="text-sm font-semibold tracking-[0.2em] text-emerald-800">HOMETIME</p><h1 className="mt-2 text-3xl font-semibold">{board.name}</h1></header>
    {board.apps.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-white/70 px-6 py-12 text-center"><p className="font-medium">This board is empty</p><p className="mt-1 text-sm text-stone-600">The board owner can add apps from admin.</p></div> : <ul className="mt-8 divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">{board.apps.map(({ app }) => <li key={app.id}><a href={app.url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-4 p-4 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-emerald-700 sm:p-5"><img src={`/icons/${app.iconSlug}`} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-stone-50 object-contain p-1"/><span className="min-w-0 flex-1 truncate font-medium">{app.name}</span><span aria-hidden="true" className="text-stone-400">↗</span></a></li>)}</ul>}
  </main>;
}
