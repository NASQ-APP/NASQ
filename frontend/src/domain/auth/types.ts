/**
 * عقود الحساب.
 *
 * التطبيق يشتغل بلا حساب: الخزانة محلية والحساب طبقة فوقها للمزامنة (X-04).
 * فالجلسة اختيارية دائمًا، وما فيها بوّابة توقف المستخدمة عن استعمال دولابها.
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
  | 'unknown'

export type AuthError = {
  code: AuthErrorCode
  /** رسالة بلغة بشر — الخطأ الخام ما يوصل الواجهة أبدًا */
  message: string
}

const MESSAGES: Record<AuthErrorCode, string> = {
  'invalid-credentials': 'البريد أو كلمة المرور غير صحيحة.',
  'email-taken': 'فيه حساب مسجّل بهذا البريد. سجّلي دخولك بدل الإنشاء.',
  'weak-password': 'كلمة المرور قصيرة. اجعليها ٨ أحرف على الأقل.',
  network: 'ما قدرنا نوصل للخادم. تحقّقي من اتصالك.',
  'not-configured': 'المزامنة بين الأجهزة غير مفعّلة بعد.',
  unknown: 'صار خطأ غير متوقّع. حاولي مرة ثانية.',
}

export const authError = (code: AuthErrorCode): AuthError => ({ code, message: MESSAGES[code] })

/**
 * عقد مزوّد الحساب — نفس نمط مزوّد التجربة.
 *
 * `local` يحفظ ملفًا شخصيًا على الجهاز، و`supabase` يضيف المزامنة الحقيقية.
 * الصفحات ما تعرف أيّهما يعمل.
 */
export type AuthProvider = {
  readonly id: string
  /** هل يزامن بين الأجهزة فعلاً؟ الواجهة تصرّح بالإجابة للمستخدمة. */
  readonly syncsAcrossDevices: boolean
  signUp(input: SignUpInput): Promise<AuthUser>
  signIn(credentials: Credentials): Promise<AuthUser>
  signOut(): Promise<void>
}
