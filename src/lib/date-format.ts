export function formatLocalDateTime(value: string | number | Date) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(value instanceof Date ? value : new Date(value))
}
