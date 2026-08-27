/**
 * ملف شخصي على الجهاز — بلا خادم.
 *
 * التطبيق كله محلي في هذي المرحلة: الخزانة والإطلالات في متصفّحك. فالحساب
 * هنا **اسم وبريد يميّزان دولابك على هذا الجهاز**، مو حسابًا يزامن بين
 * الأجهزة. `syncsAcrossDevices: false` تخلي الواجهة تقول ذلك صراحة بدل ما
 * توهم المستخدمة إن بياناتها محفوظة في مكان آخر (المبدأ ٤).
 *
 * كلمة المرور **ما تُخزَّن**: تخزينها في المتصفح يعطي أمانًا كاذبًا، وأي أحد
 * يفتح الجهاز يوصل الخزانة أصلاً. تُستخدم للتحقق من الشكل فقط لين يجي الخادم.
 *
 * عند وصول الخادم (X-04): يُضاف مزوّد Supabase جنبه، وتُهاجَر البيانات
 * المحلية مرة وحدة (X-05). ولا صفحة تتغيّر.
 */
import { authError } from '@/domain/auth'
import { storageKey } from '@/infrastructure/storage'
import { stamp, uid } from '@/shared/lib'
import type { AuthProvider, AuthUser } from '@/domain/auth'

const KEY = storageKey('local-account')

type StoredAccount = AuthUser

const read = (): StoredAccount | undefined => {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as StoredAccount) : undefined
  } catch {
    return undefined
  }
}

const write = (account: StoredAccount) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(account))
  } catch {
    // التخزين ممتلئ أو معطّل — الجلسة تبقى في الذاكرة لهذي الزيارة
  }
}

const sameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export const localAuthProvider: AuthProvider = {
  id: 'local',
  syncsAcrossDevices: false,

  async signUp({ name, email }) {
    const existing = read()
    if (existing && sameEmail(existing.email, email)) {
      throw authError('email-taken')
    }

    const account: AuthUser = {
      id: uid('user'),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      createdAt: stamp(),
    }
    write(account)
    return account
  },

  async signIn({ email }) {
    const existing = read()
    if (!existing || !sameEmail(existing.email, email)) {
      throw authError('invalid-credentials')
    }
    return existing
  },

  async signOut() {
    // الملف الشخصي يبقى على الجهاز؛ الخروج ينهي الجلسة فقط
  },
}
