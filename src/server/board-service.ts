import { nanoid } from "nanoid"

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
  position: number
}

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
