/**
 * حساب على خادم Supabase — بريد وكلمة مرور.
 *
 * كلمة المرور ما تلمس التطبيق: Supabase يستلمها ويعيد جلسة موقّعة، والعميل
 * يحفظها ويجدّدها وحده. فما فيه شيء نخزّنه بأنفسنا.
 *
 * الملف الشخصي (`profiles`) يُنشأ عند أول تسجيل بنفس مُعرِّف المستخدم، فتصير
 * كل صفوف القاعدة معلّقة عليه وتحميها RLS.
 *
 * الأخطاء الخام ما تصل الواجهة: نترجمها لرموز `AuthErrorCode` معروفة، ورسائلها
 * بالعربية في `domain/auth`.
 */
import { authError } from '@/domain/auth'
import { requireSupabase } from '@/infrastructure/supabase'
import type { AuthProvider, AuthUser, Credentials, SignUpInput } from '@/domain/auth'
import type { AuthError as SupabaseAuthError, User } from '@supabase/supabase-js'

/** ترجمة خطأ Supabase لرمز نعرفه — بالرمز لا بنصّ الرسالة كي لا يكسره تحديث. */
function translate(error: SupabaseAuthError): ReturnType<typeof authError> {
  const code = error.code ?? ''
  const message = error.message.toLowerCase()

  if (code === 'user_already_exists' || message.includes('already registered')) {
    return authError('email-taken')
  }
  if (code === 'weak_password' || message.includes('password should be at least')) {
    return authError('weak-password')
  }
  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return authError('invalid-credentials')
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return authError('network')
  }
  return authError('unknown')
}

/** اسم المستخدمة من بيانات الحساب، وإلا جزء البريد قبل @. */
const nameOf = (user: User): string =>
  (user.user_metadata?.name as string | undefined)?.trim() || user.email?.split('@')[0] || 'صاحب الدولاب'

const toAuthUser = (user: User): AuthUser => ({
  id: user.id,
  name: nameOf(user),
  email: user.email ?? '',
  createdAt: user.created_at,
})

export const supabaseAuthProvider: AuthProvider = {
  id: 'supabase',
  syncsAcrossDevices: true,

  async signUp({ name, email, password }: SignUpInput): Promise<AuthUser> {
    const db = requireSupabase()
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) throw translate(error)

    const user = data.user
    if (!user) throw authError('unknown')

    // ما فيه جلسة = المشروع يطلب تأكيد البريد، والمستخدمة تنتظر رسالة
    if (!data.session) throw authError('email-confirm-required')

    // الملف الشخصي بنفس المُعرِّف — عليه تتعلّق كل صفوف المستخدمة
    const { error: profileError } = await db
      .from('profiles')
      .upsert({ id: user.id, name }, { onConflict: 'id' })
    if (profileError) throw authError('unknown')

    return toAuthUser(user)
  },

  async signIn({ email, password }: Credentials): Promise<AuthUser> {
    const db = requireSupabase()
    const { data, error } = await db.auth.signInWithPassword({ email, password })
    if (error) throw translate(error)
    if (!data.user) throw authError('invalid-credentials')
    return toAuthUser(data.user)
  },

  async signOut(): Promise<void> {
    const db = requireSupabase()
    await db.auth.signOut()
  },

  /**
   * الاسم يُكتب في مكانين لأنه يُقرأ من مكانين: بيانات الحساب تصحب الجلسة
   * فتصل الواجهة بلا استعلام، وصف `profiles` هو اللي تربطه بقية الجداول.
   * لو كتبناه في واحد فقط، اختلفا.
   */
  async updateName(name: string): Promise<AuthUser> {
    const db = requireSupabase()
    const clean = name.trim()

    const { data, error } = await db.auth.updateUser({ data: { name: clean } })
    if (error) throw translate(error)
    if (!data.user) throw authError('unknown')

    const { error: profileError } = await db
      .from('profiles')
      .upsert({ id: data.user.id, name: clean }, { onConflict: 'id' })
    if (profileError) throw authError('unknown')

    return toAuthUser(data.user)
  },

  /**
   * الحذف يصير في القاعدة لا هنا.
   *
   * `auth.users` مخطّط محمي ما يلمسه عميل المتصفح، وكل جداولها معلّقة عليه
   * بـ`on delete cascade` — فصفّ واحد يُحذف هناك يمسح خزانتها كلها. الدالة
   * `delete_account` تعمل بصلاحيات مالكها وتقرأ هويّة المستدعية من رمزها
   * الموقّع، فما فيه معرّف تمرّره الواجهة ليحذف حساب غيرها.
   *
   * والخروج بعده لا قبله: لو خرجنا أولًا ضاع الرمز الذي تُعرَف به.
   */
  async deleteAccount(): Promise<void> {
    const db = requireSupabase()
    const { error } = await db.rpc('delete_account')
    if (error) throw error.message.toLowerCase().includes('fetch')
      ? authError('network')
      : authError('unknown')
    await db.auth.signOut()
  },
}

/** الجلسة القائمة عند إقلاع التطبيق — أو لا شيء. */
export async function currentUser(): Promise<AuthUser | undefined> {
  const db = requireSupabase()
  const { data } = await db.auth.getUser()
  return data.user ? toAuthUser(data.user) : undefined
}
