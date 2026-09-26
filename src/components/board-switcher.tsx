"use client"

import { Popover } from "@base-ui/react/popover"
import { LuChevronDown, LuStar } from "react-icons/lu"

type BoardOption = {
  id: string
  nanoid: string
  name: string
  ownerId: string
  ownerName: string
}

export function BoardSwitcherOptions({
  boards,
  currentBoardNanoid,
  defaultBoardId,
}: {
  boards: BoardOption[]
  currentBoardNanoid?: string
  defaultBoardId: string | null
}) {
  return boards.map((board) => {
    const current = board.nanoid === currentBoardNanoid
    const optionContent = (
      <>
        <span className="block truncate text-sm font-semibold">
          {board.name}
        </span>
        <span className="block truncate text-xs text-muted">
          by {board.ownerName}
        </span>
      </>
    )
    return (
      <div
        key={board.id}
        className={`m-0.5 flex items-center rounded-[2px] border border-transparent ${current ? "board-switcher-selected cursor-not-allowed bg-accent/10" : "hover:bg-surface-alt"}`}
      >
        {current ? (
          <span
            aria-current="page"
            aria-disabled="true"
            className="block min-w-0 flex-1 cursor-not-allowed p-2"
          >
            {optionContent}
          </span>
        ) : (
          <a
            href={`/board/${board.nanoid}`}
            className="block min-w-0 flex-1 p-2 focus-visible:bg-surface-alt focus-visible:outline-2 focus-visible:outline-focus"
          >
            {optionContent}
          </a>
        )}
        {board.id === defaultBoardId && (
          <LuStar
            aria-label="Default board"
            role="img"
            className="mx-2 size-4 shrink-0 fill-current text-yellow-500 dark:text-yellow-400"
          />
        )}
      </div>
    )
  })
}

export function BoardSwitcher({
  boardName,
  boardNanoid,
  boards,
  initialDefaultBoardId,
}: {
  boardName: string
  boardNanoid: string
  boards: BoardOption[]
  initialDefaultBoardId: string | null
}) {
  return (
    <Popover.Root>
      <h1 className="min-w-0">
        <Popover.Trigger
          title={boardName}
          aria-label={`Choose board; current board ${boardName}`}
          className="-ml-2 flex max-w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-left hover:bg-surface-alt data-[popup-open]:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <span className="min-w-0">
            <span className="block text-xs leading-none text-muted">Shelf</span>
            <span className="block truncate text-base font-semibold leading-tight">
              {boardName}
            </span>
          </span>
          <LuChevronDown aria-hidden className="size-4 shrink-0 text-muted" />
        </Popover.Trigger>
      </h1>
      <Popover.Portal>
        <Popover.Positioner
          align="start"
          sideOffset={12}
          collisionPadding={8}
          className="z-50"
        >
          <Popover.Popup
            aria-label="Boards"
            className="panel max-h-[min(28rem,calc(100vh-5rem))] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto p-0.5 shadow-lg outline-none"
          >
            <BoardSwitcherOptions
              boards={boards}
              currentBoardNanoid={boardNanoid}
              defaultBoardId={initialDefaultBoardId}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
