export const APP_NAME = "Hometime"
export const TITLE_SEPARATOR = " · "

export function appTitle(section: string): string {
  return `${APP_NAME}${TITLE_SEPARATOR}${section}`
}

export function siteTitle(name: string): string {
  return `${name}${TITLE_SEPARATOR}${APP_NAME}`
}
