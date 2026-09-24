import { nanoid } from "nanoid"
import type { Prisma } from "@/generated/prisma/client"

export function createBoardNanoid(): string {
  return nanoid(8)
}

export type BoardRecord = {
  id: string
  nanoid: string
  name: string
  ownerId: string
  createdAt: Date
}
export type AssignmentRecord = {
  boardId: string
  appId: string
  categoryId: string | null
  position: number
}

/** Minimal assignment shape needed to compute a deterministic order. */
export type OrderableAssignment = {
  appId: string
  categoryId: string | null
  position: number
}

const POSITION_BUMP = 1_000_000

export function orderedPositions<T extends { id: string }>(
  items: T[],
): Array<T & { position: number }> {
  return items.map((item, position) => ({ ...item, position }))
}

export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction
  if (
    index < 0 ||
    index >= items.length ||
    target < 0 ||
    target >= items.length
  )
    return items
  const result = [...items]
  ;[result[index], result[target]] = [result[target], result[index]]
  return result
}

/** Case- and whitespace-insensitive form used for per-board title uniqueness. */
export function normalizeCategoryTitle(title: string): string {
  return title.trim().toLocaleLowerCase()
}

function byPosition(a: { position: number }, b: { position: number }): number {
  return a.position - b.position
}

/**
 * Orders one group's assignments. Within a group, persisted positions decide
 * the manual order; app ids keep the order deterministic on ties.
 */
export function orderedGroupAssignmentIds(
  assignments: readonly OrderableAssignment[],
  categoryId: string | null,
): string[] {
  return assignments
    .filter((assignment) => assignment.categoryId === categoryId)
    .sort((a, b) => byPosition(a, b) || a.appId.localeCompare(b.appId))
    .map((assignment) => assignment.appId)
}

/**
 * Flattens a board into one app sequence: uncategorized apps first, then each
 * category in the given top-to-bottom order. This is the persisted position
 * order, so group membership decides grouping and positions decide order.
 */
export function orderedBoardAssignmentIds(
  assignments: readonly OrderableAssignment[],
  categoryIds: readonly string[],
): string[] {
  const groups: Array<string | null> = [null, ...categoryIds]
  return groups.flatMap((categoryId) =>
    orderedGroupAssignmentIds(assignments, categoryId),
  )
}

/**
 * Rewrites a board's assignment positions to a contiguous sequence. Rows are
 * bumped first so the unique [boardId, position] index never collides midway.
 */
export async function writeAssignmentPositions(
  tx: Prisma.TransactionClient,
  boardId: string,
  appIds: readonly string[],
): Promise<void> {
  await tx.boardApp.updateMany({
    where: { boardId },
    data: { position: { increment: POSITION_BUMP } },
  })
  for (const [position, appId] of appIds.entries())
    await tx.boardApp.update({
      where: { boardId_appId: { boardId, appId } },
      data: { position },
    })
}

/**
 * Rewrites a board's category positions to a contiguous sequence, using the
 * same bump-then-assign strategy as assignments.
 */
export async function writeCategoryPositions(
  tx: Prisma.TransactionClient,
  boardId: string,
  categoryIds: readonly string[],
): Promise<void> {
  await tx.boardCategory.updateMany({
    where: { boardId },
    data: { position: { increment: POSITION_BUMP } },
  })
  for (const [position, id] of categoryIds.entries())
    await tx.boardCategory.update({
      where: { id },
      data: { position },
    })
}
