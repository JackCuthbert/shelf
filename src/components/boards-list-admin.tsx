"use client"

import { useState } from "react"
import { Button } from "@base-ui/react/button"
import { Dialog } from "@base-ui/react/dialog"
import { Field } from "@base-ui/react/field"
import { Form } from "@base-ui/react/form"
import { Input } from "@base-ui/react/input"
import { Popover } from "@base-ui/react/popover"
import { Tooltip } from "@base-ui/react/tooltip"
import Link from "next/link"
import { LuInfo, LuPencil, LuPlus, LuStar } from "react-icons/lu"
import { ModalContent, ModalFooter } from "@/components/modal"
import { trpc } from "@/components/trpc-provider"

type Board = {
  id: string
  name: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

export function BoardsListAdmin({
  initialBoards,
  initialDefaultBoardId,
}: {
  initialBoards: Board[]
  initialDefaultBoardId: string | null
}) {
  const [boards, setBoards] = useState(initialBoards)
  const [defaultId, setDefaultId] = useState(initialDefaultBoardId)
  const [name, setName] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [error, setError] = useState("")
  const fail = (cause: { message: string }) => setError(cause.message)
  const create = trpc.boards.create.useMutation({
    onSuccess: (board) => {
      setBoards((current) => [...current, board])
      setError("")
      setName("")
      setAddOpen(false)
      if (!defaultId) setDefaultId(board.id)
    },
    onError: fail,
  })
  const setDefault = trpc.boards.setDefault.useMutation({
    onSuccess: () => setError(""),
    onError: fail,
  })

  return (
    <section>
      {error && (
        <p
          role="alert"
          className="mb-4 border border-danger bg-surface p-3 text-sm text-danger"
        >
          {error}. Your changes were not saved; please retry.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          <h1 className="text-xl font-semibold">Boards</h1>
          <Popover.Root>
            <Popover.Trigger
              aria-label="About boards"
              className="inline-flex size-6 shrink-0 items-center justify-center text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus"
            >
              <LuInfo aria-hidden className="size-4" />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner
                side="top"
                align="start"
                sideOffset={8}
                collisionPadding={8}
                className="z-50"
              >
                <Popover.Popup
                  className="panel w-fit max-w-[min(20rem,calc(100vw-2rem))] p-3 text-xs shadow-lg outline-none"
                  aria-label="Boards information"
                >
                  Boards belong to you and are reachable by anyone with the
                  link.
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </div>
        <Dialog.Root open={addOpen} onOpenChange={setAddOpen}>
          <Dialog.Trigger className="btn btn-primary">
            <LuPlus aria-hidden className="size-4" />
            Create board
          </Dialog.Trigger>
          <ModalContent
            withFooter
            title="Create board"
            description="Boards are reachable by anyone with the public link."
          >
            <Form
              onFormSubmit={(values) =>
                create.mutate({ name: String(values.name ?? "") })
              }
            >
              <Field.Root name="name" className="space-y-2">
                <Field.Label className="text-xs text-muted">
                  Board name
                </Field.Label>
                <Input
                  className="field"
                  required
                  maxLength={80}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="New board name"
                />
                <Field.Error className="text-xs text-danger" />
              </Field.Root>
              <ModalFooter>
                <Dialog.Close className="btn">Cancel</Dialog.Close>
                <Button type="submit" className="btn btn-primary">
                  <LuPlus aria-hidden className="size-4" />
                  Create board
                </Button>
              </ModalFooter>
            </Form>
          </ModalContent>
        </Dialog.Root>
      </div>
      {boards.length === 0 ? (
        <p className="panel mt-4 border-dashed p-8 text-center text-muted">
          Create your first board to start sharing apps.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {boards.map((board) => (
            <li
              key={board.id}
              className="panel group relative flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Tooltip.Root>
                  <Tooltip.Trigger
                    render={
                      <button
                        type="button"
                        className={`relative z-20 inline-flex size-8 shrink-0 items-center justify-center rounded-[2px] text-muted hover:bg-surface-alt hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50 ${board.id === defaultId ? "pointer-events-none text-yellow-500 dark:text-yellow-400" : ""}`}
                        disabled={board.id === defaultId}
                        onClick={() =>
                          setDefault.mutate(
                            { id: board.id },
                            { onSuccess: () => setDefaultId(board.id) },
                          )
                        }
                        aria-label="Set as default"
                      />
                    }
                  >
                    <LuStar
                      aria-hidden
                      className={`size-4 ${board.id === defaultId ? "fill-current" : ""}`}
                    />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Positioner sideOffset={6} className="z-50">
                      <Tooltip.Popup className="panel px-2 py-1 text-xs">
                        Set as default
                      </Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </Tooltip.Root>
                <h2 className="min-w-0 truncate text-lg font-semibold">
                  <Link
                    className="after:absolute after:inset-0 after:content-['']"
                    href={`/admin/boards/${board.id}`}
                  >
                    <span className="truncate">{board.name}</span>
                  </Link>
                </h2>
              </div>
              <span
                aria-hidden="true"
                className="pointer-events-none inline-flex size-8 shrink-0 items-center justify-center text-muted [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-focus-within:opacity-100"
              >
                <LuPencil className="size-4" />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
