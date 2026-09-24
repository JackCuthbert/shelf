export function canCreateFirstAccount(
  userCount: number,
  instanceClaimed: boolean,
): boolean {
  return userCount === 0 && !instanceClaimed
}

export function signupEnabled(value: string | undefined): boolean {
  return value === "true"
}
