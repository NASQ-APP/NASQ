/**
 * عتبات فحص الصورة الشخصية.
 *
 * العطل الذي وقع: صورة سليمة تُرفض، والمستخدمة تُخبَر «نحتاج صورة أوضح» بلا
 * سبب — فتعيد التصوير وتفشل مرة أخرى لأن السبب لم يكن الوضوح أصلاً.
 *
 * أهمّ ما تحرسه هذي الاختبارات: أن الرفض **نادر ومسبَّب**. كل حالة هنا مأخوذة
 * من صورة حقيقية يمكن أن ترفعها امرأة من جوّالها.
 */
import { describe, expect, it } from 'vitest'
import { photoIssues, type PhotoMeasurements } from './photo'

/** صورة جوال طولية سليمة — الأساس الذي نغيّر منه متغيّرًا واحدًا كل مرة. */
const PHONE: PhotoMeasurements = {
  type: 'image/jpeg',
  bytes: 2_400_000,
  width: 1536,
  height: 2048,
  brightness: 128,
  detail: 24,
}

const blocking = (over: Partial<PhotoMeasurements> = {}) =>
  photoIssues({ ...PHONE, ...over })
    .filter((issue) => issue.severity === 'blocking')
    .map((issue) => issue.code)

describe('الصور السليمة تمرّ', () => {
  it('صورة جوال طولية واضحة', () => {
    expect(blocking()).toEqual([])
  })

  it('لقطة من الركبة وفوق', () => {
    expect(blocking({ width: 1200, height: 1600 })).toEqual([])
  })

  it('صورة مربّعة — النسبة تنبيه لا منع', () => {
    const issues = photoIssues({ ...PHONE, width: 1200, height: 1200 })
    expect(issues.filter((i) => i.severity === 'blocking')).toEqual([])
    expect(issues.some((i) => i.code === 'bad-aspect')).toBe(true)
  })

  it('غرفة بإضاءة مسائية خافتة', () => {
    // متوسط الإضاءة يصف الخلفية أكثر من الشخص — الداكن ليس معطوبًا
    expect(blocking({ brightness: 37 })).toEqual([])
    expect(blocking({ brightness: 30 })).toEqual([])
  })

  it('جهاز يرسل image/jpg بدل image/jpeg', () => {
    // نفس التطبيع الذي يفعله `validateImageFile` عند اختيار الملف
    expect(blocking({ type: 'image/jpg' })).toEqual([])
  })
})

describe('الرفض يبقى قائمًا حيث يجب، ومعه سببه', () => {
  it('إطار أسود لا يُرى فيه شيء', () => {
    expect(blocking({ brightness: 9 })).toEqual(['too-dark'])
  })

  it('دقة أقلّ من ٤٨٠ للضلع الأصغر', () => {
    expect(blocking({ width: 300, height: 450 })).toEqual(['too-small'])
  })

  it('صيغة غير مدعومة', () => {
    expect(blocking({ type: 'image/heic' })).toEqual(['unsupported-type'])
  })

  it('ملف أكبر من الحدّ', () => {
    expect(blocking({ bytes: 13 * 1024 * 1024 })).toEqual(['too-large'])
  })

  it('كل سبب يحمل رسالته الخاصة — لا رسالة واحدة للجميع', () => {
    const messageOf = (over: Partial<PhotoMeasurements>) =>
      photoIssues({ ...PHONE, ...over }).find((i) => i.severity === 'blocking')?.message

    const messages = [
      messageOf({ brightness: 9 }),
      messageOf({ width: 300, height: 450 }),
      messageOf({ type: 'image/heic' }),
      messageOf({ bytes: 13 * 1024 * 1024 }),
    ]

    expect(messages.every(Boolean)).toBe(true)
    expect(new Set(messages).size).toBe(messages.length)
  })
})
