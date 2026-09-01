/**
 * عقود الحساب.
 *
 * الحساب **إلزامي**: البيانات مملوكة لمستخدمة وتحميها RLS على الخادم، فبلا
 * جلسة ما فيه صفوف تُقرأ أصلاً. الحارس في `RequireAuth`.
 *
 * `AuthUser` هو **المصدر الوحيد** لهوية المستخدمة في التطبيق — الاسم والبريد
 * يُقرآن منه لا من مخزن جانبي. مخزنان للاسم يعني اسمين يختلفان.
 */

export type AuthUser = {
  id: string
  name: string
  email: string
  createdAt: string
}

export type Credentials = {
  email: string
  password: string
}

export type SignUpInput = Credentials & {
  name: string
}

export type AuthErrorCode =
  | 'invalid-credentials'
  | 'email-taken'
  | 'weak-password'
  | 'network'
  | 'not-configured'
  | 'email-confirm-required'
  | 'unknown'

export type AuthError = {
  code: AuthErrorCode
  /** رسالة بلغة بشر — الخطأ الخام ما يوصل الواجهة أبدًا */
  message: string
}

const MESSAGES: Record<AuthErrorCode, string> = {
  'invalid-credentials': 'البريد أو كلمة المرور غير صحيحة.',
  'email-taken': 'فيه حساب مسجّل بهذا البريد — الدخول بدل الإنشاء.',
  'weak-password': 'كلمة المرور قصيرة. اجعليها ٨ أحرف على الأقل.',
  network: 'ما قدرنا نوصل للخادم — تحقّق من الاتصال.',
  'not-configured': 'الخادم غير مهيّأ — راجع إعدادات المشروع.',
  'email-confirm-required': 'أنشأنا حسابك — التأكيد وصل بريدك، وبعده يفتح الدخول.',
  unknown: 'صار خطأ غير متوقّع — المحاولة مرة ثانية قد تنجح.',
}

export const authError = (code: AuthErrorCode): AuthError => ({ code, message: MESSAGES[code] })

/**
 * عقد مزوّد الحساب — نفس نمط مزوّد التجربة.
 *
 * `local` يحفظ ملفًا شخصيًا على الجهاز (للتطوير بلا مفاتيح)، و`supabase` هو
 * المزوّد الحقيقي. الصفحات ما تعرف أيّهما يعمل.
 */
export type AuthProvider = {
  readonly id: string
  /** هل يزامن بين الأجهزة فعلاً؟ الواجهة تصرّح بالإجابة للمستخدمة. */
  readonly syncsAcrossDevices: boolean
  signUp(input: SignUpInput): Promise<AuthUser>
  signIn(credentials: Credentials): Promise<AuthUser>
  signOut(): Promise<void>
  /** يعدّل الاسم المعروض ويعيد المستخدمة بعد التعديل. */
  updateName(name: string): Promise<AuthUser>
  /** يحذف الحساب وكل ما تحته، ثم ينهي الجلسة. لا رجعة. */
  deleteAccount(): Promise<void>
}
