/**
 * جودة بيانات الاستيراد — الجذر الذي أفسد التنسيق.
 *
 * قُرئ من قاعدة البيانات الحيّة أثناء التدقيق:
 *   «نظارة شمسية مستطيلة - أسود» → women-tshirts · اللون «غير محدد»
 *   ٢٤ من ٣٧ قطعة بلا لون صالح
 *
 * وسبب الأول سطرٌ واحد: `CATEGORIES[0]` هي `women-tshirts`، فكل اسم لا يطابق
 * نمطًا يدخل الخزانة تيشيرتًا. وسبب الثاني أن اللون كان يُقرأ من حقل المتجر
 * وحده، وأغلب المتاجر لا تنشره — والاسم يحمله.
 */
import { describe, expect, it } from 'vitest'
import { guessCategoryId } from './import'
import { categoryById, slotOfCategory } from '@/domain/wardrobe'

describe('تصنيف القطعة المستوردة', () => {
  it('ما لا نعرف فئته يبقى غير معروف — لا تيشيرتًا', () => {
    // الاسم الحقيقي كما هو في قاعدة البيانات
    expect(guessCategoryId('نظارة شمسية مستطيلة - أسود')).not.toBe('women-tshirts')
  })

  it('والنظّارة صارت إكسسوارًا — لا تقود إطلالة', () => {
    const id = guessCategoryId('نظارة شمسية مستطيلة - أسود')
    expect(id).toBe('women-accessories')
    expect(slotOfCategory(id!)).toBe('accessory')
  })

  it('الاسم الغريب تمامًا يرجع غير محدَّد فيُسأل عنه', () => {
    // تخمينٌ خاطئ يُخزَّن ويُبنى عليه؛ والسؤال لحظةٌ تصحّح القطعة للأبد
    expect(guessCategoryId('منتج ٤٥٢٣')).toBeUndefined()
    expect(guessCategoryId('')).toBeUndefined()
  })

  it('وما نعرفه يبقى كما هو', () => {
    const cases: [string, string][] = [
      ['حذاء لوفر شمواة', 'women-shoes'],
      ['فستان سهرة تول', 'women-dresses'],
      ['جينز واسع', 'women-jeans'],
      ['بلوزة كشكش', 'women-blouses'],
      ['شنطة كتف', 'women-bags'],
      ['جاكيت جينز', 'women-jackets'],
    ]
    for (const [name, expected] of cases) {
      expect(guessCategoryId(name), name).toBe(expected)
    }
  })

  it('الأنماط الجديدة تغطّي ما كان يسقط', () => {
    for (const name of ['نظارة شمسية', 'ساعة يد', 'قلادة ذهب', 'حزام جلد', 'قبعة صيفية']) {
      expect(guessCategoryId(name), name).toBe('women-accessories')
    }
  })

  it('كل فئة يرجعها المخمّن موجودة في الجدول فعلاً', () => {
    // لا معرّف مخترع يدخل القاعدة
    for (const name of ['فستان', 'حذاء', 'جينز', 'نظارة', 'شنطة', 'معطف']) {
      const id = guessCategoryId(name)
      expect(id && categoryById(id), name).toBeTruthy()
    }
  })
})
