import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { SharedApps } from "@/components/shared-apps";
import { BoardsAdmin } from "@/components/boards-admin";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");
  const [apps, boards] = await Promise.all([
    prisma.app.findMany({ orderBy: [{ name: "asc" }, { id: "asc" }] }),
    prisma.board.findMany({ where: { ownerId: session.user.id }, include: { apps: { include: { app: true }, orderBy: { position: "asc" } } }, orderBy: { createdAt: "asc" } }),
  ]);
  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
    <header className="flex items-center justify-between border-b border-stone-300 pb-5">
      <div><p className="text-sm font-semibold tracking-[0.2em] text-emerald-800">HOMETIME</p><h1 className="mt-2 text-3xl font-semibold">Admin</h1></div>
      <SignOutButton />
    </header>
    <p className="mt-8 text-stone-600">Welcome, {session.user.name}. Manage the apps shared by your household below.</p>
    <BoardsAdmin initialBoards={boards.map((board) => ({ ...board, createdAt: board.createdAt.toISOString(), updatedAt: board.updatedAt.toISOString(), apps: board.apps.map((entry) => ({ ...entry, app: { ...entry.app, createdAt: entry.app.createdAt.toISOString(), updatedAt: entry.app.updatedAt.toISOString() } })) }))} initialApps={apps.map((app) => ({ ...app, createdAt: app.createdAt.toISOString(), updatedAt: app.updatedAt.toISOString() }))} />
    <SharedApps initialApps={apps.map((app) => ({ ...app, createdAt: app.createdAt.toISOString(), updatedAt: app.updatedAt.toISOString() }))} />
  </main>;
}
