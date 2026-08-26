/** دمج كلاسات مشروط — بديل خفيف لـclsx بدون اعتمادية. */
export function cn(...parts: Array<string | number | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
