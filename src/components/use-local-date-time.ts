"use client"

import { useEffect, useState } from "react"
import { formatLocalDateTime } from "@/lib/date-format"

export function useLocalDateTime(value: string | number | Date | null) {
  const [formatted, setFormatted] = useState<string | null>(null)

  useEffect(() => {
    setFormatted(value === null ? null : formatLocalDateTime(value))
  }, [value])

  return formatted
}
