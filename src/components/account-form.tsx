"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function AccountForm({ setup, signup }: { setup: boolean; signup: boolean }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(form: FormData) {
    setPending(true);
    setError("");
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();
    if (setup) {
      const response = await fetch("/api/setup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, email, password }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Setup failed."); setPending(false); return; }
    } else if (signup) {
      const response = await fetch("/api/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, email, password }) });
      const result = await response.json();
      if (!response.ok) { setError(result.message ?? result.error ?? "Sign-up failed."); setPending(false); return; }
    } else {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) { setError("Email or password is incorrect."); setPending(false); return; }
    }
    location.assign("/admin");
  }
  return <form action={submit} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
    {setup && <label className="block text-sm">Name<input name="name" autoComplete="name" required className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2" /></label>}
    {!setup && signup && <label className="block text-sm">Name<input name="name" autoComplete="name" required className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2" /></label>}
    <label className="block text-sm">Email<input name="email" type="email" autoComplete="email" required className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2" /></label>
    <label className="block text-sm">Password<input name="password" type="password" autoComplete={setup || signup ? "new-password" : "current-password"} minLength={8} required className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2" /></label>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button disabled={pending} className="w-full rounded-lg bg-emerald-900 px-4 py-2.5 font-medium text-white disabled:opacity-60">{pending ? "Please wait…" : setup ? "Create account" : signup ? "Create account" : "Sign in"}</button>
  </form>;
}
