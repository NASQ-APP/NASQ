/**
 * الأشكال المتاحة لكل موضع من الجسم.
 * نموذج الإضافة يقرأ من هنا، فإضافة شكل جديد ما تحتاج لمس أي مكوّن.
 */
import type { BodySlot } from '@/domain/shared/types'
import type { GarmentShape } from './types'

type ShapeOption = { id: GarmentShape; name: string }

export const SHAPES_BY_SLOT: Record<BodySlot, ShapeOption[]> = {
  top: [
    { id: 'tee', name: 'تيشيرت' },
    { id: 'shirt', name: 'قميص' },
    { id: 'blouse', name: 'بلوزة' },
    { id: 'polo', name: 'بولو' },
    { id: 'sweater', name: 'كنزة' },
    { id: 'hoodie', name: 'هودي' },
  ],
  bottom: [
    { id: 'pants', name: 'بنطلون' },
    { id: 'jeans', name: 'جينز' },
    { id: 'skirt', name: 'تنورة' },
    { id: 'shorts', name: 'شورت' },
  ],
  full: [
    { id: 'dress', name: 'فستان' },
    { id: 'abaya', name: 'عباية' },
    { id: 'thobe', name: 'ثوب' },
  ],
  outer: [
    { id: 'jacket', name: 'جاكيت' },
    { id: 'blazer', name: 'بليزر' },
    { id: 'coat', name: 'معطف' },
  ],
  shoes: [
    { id: 'sneakers', name: 'سنيكرز' },
    { id: 'flats', name: 'مسطّح' },
    { id: 'heels', name: 'كعب' },
    { id: 'boots', name: 'بوت' },
  ],
  bag: [
    { id: 'tote', name: 'توت' },
    { id: 'shoulderBag', name: 'كتف' },
    { id: 'clutch', name: 'كلتش' },
  ],
  accessory: [
    { id: 'scarf', name: 'وشاح' },
    { id: 'sunglasses', name: 'نظارة' },
    { id: 'belt', name: 'حزام' },
    { id: 'cap', name: 'كاب' },
  ],
}

export const shapesForSlot = (slot: BodySlot): ShapeOption[] =>
  SHAPES_BY_SLOT[slot] ?? SHAPES_BY_SLOT.top
