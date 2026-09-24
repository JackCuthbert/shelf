"use client";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  return <button onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => location.assign("/") } })} className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm">Sign out</button>;
}
