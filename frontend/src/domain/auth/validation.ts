/**
 * قواعد التحقق من نماذج الحساب.
 *
 * مكتوبة كمخططات Zod عشان النموذج والاختبار يقرآن نفس القاعدة — قاعدة في
 * الواجهة وقاعدة في الاختبار تتفرّقان بصمت مع أول تعديل.
 * الرسائل عربية لأنها تُعرض كما هي تحت الحقل.
 */
import { z } from 'zod'

export const MIN_PASSWORD_LENGTH = 8
const MAX_NAME_LENGTH = 40

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'البريد الإلكتروني مطلوب.')
  .email('البريد الإلكتروني غير صحيح.')

export const passwordSchema = z
  .string()
  .min(1, 'كلمة المرور مطلوبة.')
  .min(MIN_PASSWORD_LENGTH, `كلمة المرور ${MIN_PASSWORD_LENGTH} أحرف على الأقل.`)

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'الاسم مطلوب.')
  .max(MAX_NAME_LENGTH, `الاسم أطول من ${MAX_NAME_LENGTH} حرفًا.`)

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'كلمة المرور مطلوبة.'),
})

export const signUpSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
})

export type SignInValues = z.infer<typeof signInSchema>
export type SignUpValues = z.infer<typeof signUpSchema>

/**
 * مؤشّر بسيط لقوّة كلمة المرور — إرشادي فقط، ما يمنع الإرسال.
 * الطول أهم عامل، والتنويع يضيف عليه.
 */
export type PasswordStrength = { score: 0 | 1 | 2 | 3; label: string }

export function passwordStrength(value: string): PasswordStrength {
  if (value.length < MIN_PASSWORD_LENGTH) return { score: 0, label: 'قصيرة' }

  const variety =
    Number(/[a-z]/.test(value)) +
    Number(/[A-Z]/.test(value)) +
    Number(/\d/.test(value)) +
    Number(/[^\da-zA-Z]/.test(value))

  if (value.length >= 14 && variety >= 3) return { score: 3, label: 'قوية' }
  if (value.length >= 11 || variety >= 3) return { score: 2, label: 'جيدة' }
  return { score: 1, label: 'مقبولة' }
}
