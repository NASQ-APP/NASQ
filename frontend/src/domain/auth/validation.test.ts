import { describe, expect, it } from 'vitest'
import { MIN_PASSWORD_LENGTH, passwordStrength, signInSchema, signUpSchema } from './validation'

const issues = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? [] : (result.error?.issues.map((i) => i.message) ?? [])

describe('signUpSchema', () => {
  it('يقبل مدخلات صحيحة ويشذّب المسافات', () => {
    const result = signUpSchema.safeParse({
      name: '  ليانا  ',
      email: '  Layana@Example.COM ',
      password: 'wardrobe2026',
    })
    expect(result.success).toBe(true)
    expect(result.data?.name).toBe('ليانا')
    expect(result.data?.email).toBe('Layana@Example.COM')
  })

  it('يرفض البريد غير الصحيح برسالة عربية', () => {
    const result = signUpSchema.safeParse({ name: 'ليانا', email: 'layana', password: 'wardrobe2026' })
    expect(issues(result)).toContain('البريد الإلكتروني غير صحيح.')
  })

  it('يرفض كلمة مرور أقصر من الحد', () => {
    const result = signUpSchema.safeParse({
      name: 'ليانا',
      email: 'a@b.com',
      password: 'a'.repeat(MIN_PASSWORD_LENGTH - 1),
    })
    expect(issues(result)[0]).toContain(String(MIN_PASSWORD_LENGTH))
  })

  it('يرفض الاسم الفاضي والاسم الطويل', () => {
    expect(issues(signUpSchema.safeParse({ name: ' ', email: 'a@b.com', password: 'wardrobe2026' })))
      .toContain('اكتبي اسمك.')
    expect(
      signUpSchema.safeParse({ name: 'ط'.repeat(41), email: 'a@b.com', password: 'wardrobe2026' })
        .success,
    ).toBe(false)
  })
})

describe('signInSchema', () => {
  it('يقبل أي كلمة مرور غير فاضية — الطول شرط إنشاء لا دخول', () => {
    expect(signInSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true)
  })

  it('يطلب كلمة المرور', () => {
    expect(issues(signInSchema.safeParse({ email: 'a@b.com', password: '' }))).toContain(
      'اكتبي كلمة المرور.',
    )
  })
})

describe('passwordStrength', () => {
  it('القصيرة صفر', () => {
    expect(passwordStrength('abc').score).toBe(0)
    expect(passwordStrength('abc').label).toBe('قصيرة')
  })

  it('الطول والتنويع يرفعان الدرجة', () => {
    expect(passwordStrength('aaaaaaaa').score).toBe(1)
    expect(passwordStrength('aaaaaaaaaaa').score).toBe(2)
    expect(passwordStrength('Wardrobe2026!x').score).toBe(3)
  })

  it('ما يتجاوز الدرجة القصوى', () => {
    expect(passwordStrength('Wardrobe2026!'.repeat(4)).score).toBe(3)
  })
})
