import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { SharedApps } from "@/components/shared-apps";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");
  const apps = await prisma.app.findMany({ orderBy: [{ name: "asc" }, { id: "asc" }] });
  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
    <header className="flex items-center justify-between border-b border-stone-300 pb-5">
      <div><p className="text-sm font-semibold tracking-[0.2em] text-emerald-800">HOMETIME</p><h1 className="mt-2 text-3xl font-semibold">Admin</h1></div>
      <SignOutButton />
    </header>
    <p className="mt-8 text-stone-600">Welcome, {session.user.name}. Manage the apps shared by your household below.</p>
    <SharedApps initialApps={apps.map((app) => ({ ...app, createdAt: app.createdAt.toISOString(), updatedAt: app.updatedAt.toISOString() }))} />
  </main>;
}
