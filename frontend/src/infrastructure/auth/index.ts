/**
 * نقطة الدخول للحساب.
 *
 * الصفحات تستورد `authProvider` ولا شيء غيره. إضافة المزامنة الحقيقية
 * (X-04) = مزوّد جديد هنا + متغيّر بيئة، بلا لمس أي صفحة.
 */
import { localAuthProvider } from './localProvider'
import type { AuthProvider } from '@/domain/auth'

export const authProvider: AuthProvider = localAuthProvider

export { localAuthProvider } from './localProvider'
