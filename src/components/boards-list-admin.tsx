"use client"

import { useState } from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"
import { Button } from "@base-ui/react/button"
import { Dialog } from "@base-ui/react/dialog"
import { Field } from "@base-ui/react/field"
import { Form } from "@base-ui/react/form"
import { Input } from "@base-ui/react/input"
import Link from "next/link"
import {
  LuExternalLink,
  LuPencil,
  LuPlus,
  LuStar,
  LuTrash2,
} from "react-icons/lu"
import { ConfirmContent, ModalContent } from "@/components/modal"
import { trpc } from "@/components/trpc-provider"

type Board = {
  id: string
  name: string
  nanoid: string
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
  const remove = trpc.boards.delete.useMutation({
    onSuccess: (_result, variables) => {
      setBoards((current) =>
        current.filter((board) => board.id !== variables.id),
      )
      setError("")
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
        <p className="text-muted">
          Boards belong to you and are reachable by anyone with the link.
        </p>
        <Dialog.Root open={addOpen} onOpenChange={setAddOpen}>
          <Dialog.Trigger className="btn btn-primary">
            <LuPlus aria-hidden className="size-4" />
            Create board
          </Dialog.Trigger>
          <ModalContent
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
              <div className="mt-4 flex justify-end gap-2">
                <Dialog.Close className="btn">Cancel</Dialog.Close>
                <Button type="submit" className="btn btn-primary">
                  <LuPlus aria-hidden className="size-4" />
                  Create board
                </Button>
              </div>
            </Form>
          </ModalContent>
        </Dialog.Root>
      </div>
      {boards.length === 0 ? (
        <p className="panel mt-4 border-dashed p-8 text-center text-muted">
          Create your first board to start sharing apps.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {boards.map((board) => (
            <li
              key={board.id}
              className="panel flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold">
                  <a
                    className="inline-flex max-w-full items-center gap-1 hover:underline"
                    href={`/board/${board.nanoid}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="truncate">{board.name}</span>
                    <LuExternalLink
                      aria-hidden
                      className="size-3.5 shrink-0 text-muted"
                    />
                  </a>
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  className="btn text-xs"
                  href={`/admin/boards/${board.nanoid}`}
                >
                  <LuPencil aria-hidden className="size-4" />
                  Edit
                </Link>
                <Button
                  className={`btn text-xs ${board.id === defaultId ? "text-accent disabled:opacity-100" : ""}`}
                  disabled={board.id === defaultId}
                  onClick={() =>
                    setDefault.mutate(
                      { id: board.id },
                      { onSuccess: () => setDefaultId(board.id) },
                    )
                  }
                >
                  <LuStar
                    aria-hidden
                    className={`size-4 ${board.id === defaultId ? "fill-current" : ""}`}
                  />
                  {board.id === defaultId ? "Default" : "Set as default"}
                </Button>
                <AlertDialog.Root>
                  <AlertDialog.Trigger className="btn btn-danger text-xs">
                    <LuTrash2 aria-hidden className="size-4" />
                    Delete
                  </AlertDialog.Trigger>
                  <ConfirmContent
                    title="Delete board"
                    description={`Delete “${board.name}”? This removes the board, its categories, and its assignments.`}
                  >
                    <AlertDialog.Close className="btn">
                      Cancel
                    </AlertDialog.Close>
                    <AlertDialog.Close
                      className="btn btn-danger"
                      onClick={() =>
                        remove.mutate(
                          { id: board.id },
                          {
                            onSuccess: () => {
                              if (defaultId === board.id)
                                setDefaultId(
                                  boards.find((item) => item.id !== board.id)
                                    ?.id ?? null,
                                )
                            },
                          },
                        )
                      }
                    >
                      <LuTrash2 aria-hidden className="size-4" />
                      Delete
                    </AlertDialog.Close>
                  </ConfirmContent>
                </AlertDialog.Root>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
