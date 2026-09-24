export function canCreateFirstAccount(
  userCount: number,
  instanceClaimed: boolean,
): boolean {
  return userCount === 0 && !instanceClaimed
}

export function signupEnabled(value: string | undefined): boolean {
  return value === "true"
}

export function canCreateAuthUser(
  userCount: number,
  signupSetting: string | undefined,
): boolean {
  return userCount > 0 && signupEnabled(signupSetting)
}
