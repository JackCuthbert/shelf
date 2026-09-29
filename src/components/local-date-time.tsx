"use client"

import { useLocalDateTime } from "@/components/use-local-date-time"

export function LocalDateTime({
  value,
  fallback,
}: {
  value: string
  fallback: string
}) {
  const formatted = useLocalDateTime(value)
  return <>{formatted ?? fallback}</>
}
