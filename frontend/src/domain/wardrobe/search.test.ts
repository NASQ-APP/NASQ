import { describe, expect, it } from 'vitest'
import { matchesQuery, normalizeArabic } from './search'

describe('normalizeArabic', () => {
  it('يوحّد صور الألف', () => {
    expect(normalizeArabic('أبيض')).toBe('ابيض')
    expect(normalizeArabic('إطلالة')).toBe('اطلاله')
    expect(normalizeArabic('آخر')).toBe('اخر')
  })

  it('يوحّد التاء المربوطة والياء المقصورة', () => {
    expect(normalizeArabic('عباية')).toBe('عبايه')
    expect(normalizeArabic('مصطفى')).toBe('مصطفي')
  })

  it('يسقط التشكيل والتطويل', () => {
    expect(normalizeArabic('قَمِيصٌ')).toBe('قميص')
    expect(normalizeArabic('قمــــيص')).toBe('قميص')
  })

  it('يوحّد المسافات ويصغّر اللاتيني', () => {
    expect(normalizeArabic('  COS   Linen ')).toBe('cos linen')
  })
})

describe('matchesQuery', () => {
  it('يلقى القطعة بإملاء مختلف', () => {
    expect(matchesQuery('قميص أبيض', 'ابيض')).toBe(true)
    expect(matchesQuery('عباية سوداء', 'عبايه')).toBe(true)
  })

  it('يطابق الكلمات مستقلة عن ترتيبها', () => {
    expect(matchesQuery('قميص كتان أبيض', 'ابيض قميص')).toBe(true)
  })

  it('يرفض لما تنقص كلمة', () => {
    expect(matchesQuery('قميص أبيض', 'ابيض بنطلون')).toBe(false)
  })

  it('الاستعلام الفاضي يطابق كل شيء', () => {
    expect(matchesQuery('أي قطعة', '   ')).toBe(true)
  })
})
