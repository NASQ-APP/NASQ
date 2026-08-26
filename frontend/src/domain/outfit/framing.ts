/**
 * اختيار زاوية الكاميرا (A-03).
 * القصّة تتبع اللي تبي المستخدمة تشوفه، مو قاعدة ثابتة.
 */
import type { BodySlot } from '@/domain/shared/types'
import type { Framing, TryOnGarment } from './types'

/** جدول زوايا الكاميرا كما في الوثيقة — قطعة واحدة مختارة. */
const SINGLE_SLOT_FRAMING: Partial<Record<BodySlot, Framing>> = {
  accessory: 'detail',
  bag: 'detail',
  shoes: 'lower',
  top: 'upper',
  // السفلي والفستان والعباية والثوب والخارجي: الطول والانسدال جزء من القطعة
}

export function chooseFraming(garments: TryOnGarment[]): {
  framing: Framing
  focusSlot?: BodySlot
} {
  const slots = garments.map((g) => g.slot)
  const unique = new Set(slots)

  if (unique.size === 0) return { framing: 'full' }

  if (unique.size === 1) {
    const only = slots[0]
    return { framing: SINGLE_SLOT_FRAMING[only] ?? 'full', focusSlot: only }
  }

  // القطع الصغيرة وحدها تضيع في اللقطة الكاملة
  if (slots.every((s) => s === 'accessory' || s === 'bag')) {
    return { framing: 'detail', focusSlot: 'bag' }
  }

  const hasLower = slots.some((s) => s === 'bottom' || s === 'shoes' || s === 'full')
  return hasLower ? { framing: 'full' } : { framing: 'upper' }
}
