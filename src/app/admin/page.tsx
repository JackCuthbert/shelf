import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");
  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
    <header className="flex items-center justify-between border-b border-stone-300 pb-5">
      <div><p className="text-sm font-semibold tracking-[0.2em] text-emerald-800">HOMETIME</p><h1 className="mt-2 text-3xl font-semibold">Admin</h1></div>
      <SignOutButton />
    </header>
    <section className="mt-10 rounded-2xl border border-stone-200 bg-white p-8">
      <h2 className="text-xl font-medium">You’re all set, {session.user.name}.</h2>
      <p className="mt-2 text-stone-600">Your account is ready. Board and app management will appear here in a later stage.</p>
    </section>
  </main>;
}
