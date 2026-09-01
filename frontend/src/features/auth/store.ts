/**
 * جلسة المستخدمة.
 *
 * الجلسة **إلزامية** بعد وصل الخادم: البيانات مملوكة لحساب وتحميها RLS، فبلا
 * حساب ما فيه صفوف تُقرأ. الحارس في `RequireAuth`.
 *
 * المستخدمة هنا **مرآة** لجلسة Supabase لا مصدرها: العميل يحفظ الجلسة ويجدّدها
 * وحده، ونسخها في تخزيننا يخلق مصدرين يختلفان — فتظهر الواجهة مسجّلة والخادم
 * يرفض. لذلك ما نحفظ إلا مع المزوّد المحلي.
 *
 * وهذا المخزن هو **المصدر الوحيد** لاسم المستخدمة وبريدها في كل الصفحات.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authError } from '@/domain/auth'
import { authProvider } from '@/infrastructure/auth'
import { storageKey } from '@/infrastructure/storage'
import type { AuthError, AuthUser, Credentials, SignUpInput } from '@/domain/auth'
import { clearLocalUserData } from './clearLocalData'

type AuthState = {
  user?: AuthUser
  busy: boolean
  signUp: (input: SignUpInput) => Promise<AuthError | undefined>
  signIn: (credentials: Credentials) => Promise<AuthError | undefined>
  signOut: () => Promise<void>
  /** يُضبط من الحارس بعد قراءة جلسة الخادم. */
  setUser: (user?: AuthUser) => void
  /** يعدّل الاسم المعروض على الخادم ثم في الجلسة. */
  updateName: (name: string) => Promise<AuthError | undefined>
  /** يحذف الحساب وكل ما تحته ثم يُنهي الجلسة. لا رجعة. */
  deleteAccount: () => Promise<AuthError | undefined>
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

      setUser: (user) => set({ user }),

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

      /*
        الجلسة تُفكّ **بعد** ما يؤكّد الخادم الحذف.

        لو فكّيناها أولًا وفشل الحذف، طلعت المستخدمة من حسابٍ لا يزال قائمًا
        وظنّت إنه راح. والحارس يصفّر مخازنها بمجرد ما تصير بلا هوية.
      */
      deleteAccount: async () => {
        set({ busy: true })
        try {
          await authProvider.deleteAccount()

          /*
            التنظيف **بعد نجاح الخادم لا قبله**: لو مسحنا أولًا وفشل الحذف
            لفقدت المستخدمة بياناتها وحسابها ما زال قائمًا.

            وما نغلّفه بـ`try`: الدالة نفسها لا ترمي — الحساب انحذف فعلًا،
            وفشل تنظيف محلي لا يصح أن يظهر للمستخدمة كفشل حذف.
          */
          await clearLocalUserData()
          set({ user: undefined })
          return undefined
        } catch (error) {
          return toAuthError(error)
        } finally {
          set({ busy: false })
        }
      },

      updateName: async (name) => {
        set({ busy: true })
        try {
          set({ user: await authProvider.updateName(name) })
          return undefined
        } catch (error) {
          return toAuthError(error)
        } finally {
          set({ busy: false })
        }
      },
    }),
    {
      name: storageKey('session'),
      // مع الخادم الجلسة عنده، فما نحفظ نسخة تختلف عنه. وبلا خادم نحفظ
      // المستخدمة المحلية وإلا ضاعت مع كل تحديث.
      partialize: (state) => (authProvider.syncsAcrossDevices ? {} : { user: state.user }),
    },
  ),
)

/** هل المزوّد الحالي يزامن فعلاً بين الأجهزة؟ */
export const syncsAcrossDevices = authProvider.syncsAcrossDevices
