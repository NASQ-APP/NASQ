/**
 * جلسة المستخدمة.
 *
 * الجلسة **اختيارية**: التطبيق يشتغل كامل بدونها، والحساب طبقة فوقه للمزامنة.
 * فما فيه أي حارس يوقف المستخدمة عن دخول دولابها.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authError } from '@/domain/auth'
import { authProvider } from '@/infrastructure/auth'
import { storageKey } from '@/infrastructure/storage'
import type { AuthError, AuthUser, Credentials, SignUpInput } from '@/domain/auth'

type AuthState = {
  user?: AuthUser
  busy: boolean
  signUp: (input: SignUpInput) => Promise<AuthError | undefined>
  signIn: (credentials: Credentials) => Promise<AuthError | undefined>
  signOut: () => Promise<void>
}

/** يحوّل أي خطأ لصيغة الواجهة — الخطأ الخام ما يوصل الصفحة. */
const toAuthError = (error: unknown): AuthError =>
  error && typeof error === 'object' && 'code' in error && 'message' in error
    ? (error as AuthError)
    : authError('unknown')

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      busy: false,

      signUp: async (input) => {
        set({ busy: true })
        try {
          set({ user: await authProvider.signUp(input) })
          return undefined
        } catch (error) {
          return toAuthError(error)
        } finally {
          set({ busy: false })
        }
      },

      signIn: async (credentials) => {
        set({ busy: true })
        try {
          set({ user: await authProvider.signIn(credentials) })
          return undefined
        } catch (error) {
          return toAuthError(error)
        } finally {
          set({ busy: false })
        }
      },

      signOut: async () => {
        await authProvider.signOut()
        set({ user: undefined })
      },
    }),
    {
      name: storageKey('session'),
      // `busy` حالة لحظية، ما لها معنى بعد إعادة التحميل
      partialize: (state) => ({ user: state.user }),
    },
  ),
)

/** هل المزوّد الحالي يزامن فعلاً بين الأجهزة؟ */
export const syncsAcrossDevices = authProvider.syncsAcrossDevices
