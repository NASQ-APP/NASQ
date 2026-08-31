/**
 * نقطة الدخول للحساب.
 *
 * الصفحات تستورد `authProvider` ولا شيء غيره. المزوّد يُختار مرة واحدة حسب
 * توفّر الخادم: مع Supabase مهيّأ نستعمله، وبدونه يبقى الملف المحلي كي لا
 * ينكسر التطوير على جهاز بلا مفاتيح.
 */
import { hasBackend } from '@/shared/config'
import { localAuthProvider } from './localProvider'
import { supabaseAuthProvider } from './supabaseProvider'
import type { AuthProvider } from '@/domain/auth'

export const authProvider: AuthProvider = hasBackend() ? supabaseAuthProvider : localAuthProvider

export { localAuthProvider } from './localProvider'
export { supabaseAuthProvider, currentUser } from './supabaseProvider'
