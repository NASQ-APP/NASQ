/**
 * نقطة الدخول للستايليست.
 *
 * الواجهة تستورد `stylistProvider` ولا شيء غيره. مين يجاوب يُقرّر هنا من
 * إعداد البناء — نفس نمط إزالة الخلفية والتلبيس:
 *
 *   VITE_STYLIST_PROVIDER=local | backend
 *
 * القواعد المحلية تبقى **دائمًا** موجودة: المزوّد البعيد يرجع لها عند أي
 * فشل، فما فيه حالة تُترك المستخدمة فيها بلا جواب.
 */
import { env } from '@/shared/config'
import { localStylist } from './localProvider'
import { backendStylist } from './backendProvider'
import type { StylistProvider } from './types'

const REGISTRY: Record<string, StylistProvider> = {
  local: localStylist,
  backend: backendStylist,
}

export const stylistProvider: StylistProvider = REGISTRY[env.stylistProvider] ?? localStylist

export { localStylist } from './localProvider'
export { backendStylist } from './backendProvider'
export type { StylistProvider, StylistRequest } from './types'
