/** تنسيق التواريخ — تقويم عربي بأرقام لاتينية، مكان واحد لكل الشاشات. */
const LOCALE = 'ar-SA-u-nu-latn'

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })

export const formatShortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })

export const stamp = (): string => new Date().toISOString()

/** فرق الأيام بين تاريخين شامل الطرفين — يستخدمه مخطط السفر. */
export function daysBetween(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime()
  return Math.max(1, Math.round(ms / 86_400_000) + 1)
}
