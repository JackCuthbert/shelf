"use client"

import { BoardSwitcher } from "@/components/board-switcher"
import { UserMenu } from "@/components/user-menu"

type PublicBoard = {
  id: string
  name: string
  ownerId: string
  ownerName: string
}

export function PublicBoardNav({
  boardName,
  boardNanoid,
  boards,
  defaultBoardId,
  user,
}: {
  boardName: string
  boardNanoid?: string
  boards: PublicBoard[]
  defaultBoardId: string | null
  user: { id?: string; name: string } | null
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background">
      <div className="mx-auto grid max-w-6xl grid-cols-2 items-center gap-x-3 gap-y-2 px-4 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] sm:gap-4 sm:px-6">
        <BoardSwitcher
          boardName={boardName}
          boardNanoid={boardNanoid ?? ""}
          boards={boards}
          initialDefaultBoardId={defaultBoardId}
        />
        <div className="col-start-2 flex min-w-0 items-center gap-2 justify-self-end sm:col-start-3">
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  )
}
