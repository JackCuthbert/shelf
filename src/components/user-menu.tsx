"use client"

import { Menu } from "@base-ui/react/menu"
import { useEffect, useState } from "react"
import { LuLogOut, LuUserRound } from "react-icons/lu"
import { authClient } from "@/lib/auth-client"

export function UserMenu({ user }: { user: { name: string } | null }) {
  const [displayName, setDisplayName] = useState(user?.name ?? "")
  useEffect(() => {
    const updateName = (event: Event) => {
      setDisplayName((event as CustomEvent<string>).detail)
    }
    window.addEventListener("account-name-updated", updateName)
    return () => window.removeEventListener("account-name-updated", updateName)
  }, [])
  if (!user) {
    return (
      <a href="/" className="btn text-xs">
        Sign in
      </a>
    )
  }

  return (
    <Menu.Root>
      <Menu.Trigger className="btn min-w-0 max-w-48 text-xs sm:max-w-64">
        <LuUserRound aria-hidden className="size-4 shrink-0" />
        <span className="truncate">{displayName}</span>
      </Menu.Trigger>
      <Menu.Portal keepMounted>
        <Menu.Positioner align="end" sideOffset={8} className="z-50">
          <Menu.Popup className="panel min-w-40 p-1 shadow-lg">
            <Menu.Item
              render={<a href="/account" />}
              className="block cursor-pointer px-3 py-2 text-sm hover:bg-surface-alt focus:bg-surface-alt"
            >
              Account
            </Menu.Item>
            <Menu.Item
              render={<a href="/admin" />}
              className="block cursor-pointer px-3 py-2 text-sm hover:bg-surface-alt focus:bg-surface-alt"
            >
              Admin
            </Menu.Item>
            <Menu.Item
              closeOnClick={false}
              onClick={() =>
                authClient.signOut({
                  callbackURL: "/",
                  fetchOptions: { onSuccess: () => location.assign("/") },
                })
              }
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-alt focus:bg-surface-alt"
            >
              <LuLogOut aria-hidden className="size-4" />
              Sign out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
