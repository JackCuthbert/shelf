import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountForm } from "@/components/account-form";
import { signupEnabled } from "@/lib/account-policy";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/admin");
  const [userCount, instance] = await Promise.all([
    prisma.user.count(),
    prisma.instance.findUnique({ where: { id: "singleton" } }),
  ]);
  const setup = userCount === 0 && !instance;
  const signup = signupEnabled(process.env.ENABLE_SIGNUP);
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
    <p className="mb-3 text-sm font-semibold tracking-[0.2em] text-emerald-800">HOMETIME</p>
    <h1 className="mb-2 text-3xl font-semibold">{setup ? "Make yourself at home." : "Welcome back."}</h1>
    <p className="mb-8 text-stone-600">{setup ? "Create the first account to set up this space." : signup ? "Sign in or create an account to continue." : "Sign in to continue to your dashboard."}</p>
    <AccountForm setup={setup} signup={signup} />
  </main>;
}
