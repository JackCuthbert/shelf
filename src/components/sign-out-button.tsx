"use client";

import { Button } from "@base-ui/react/button";
import { LuLogOut } from "react-icons/lu";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  return <Button onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => location.assign("/") } })} className="btn text-xs"><LuLogOut aria-hidden className="size-4" />Sign out</Button>;
}
