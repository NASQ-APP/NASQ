import { describe, expect, it } from 'vitest'
import { nextEmptyDay, packingGroups, tripProgress } from './plan'
import type { Trip } from './types'
import type { WardrobeItem } from '@/domain/wardrobe'

const item = (id: string, categoryId: string): WardrobeItem => ({
  id,
  name: id,
  categoryId,
  shape: 'tee',
  colorHex: '#111111',
  colorName: 'أسود',
  wardrobeId: 'w-travel',
  source: 'wardrobe',
  favorite: false,
  addedAt: '2026-08-01T09:00:00.000Z',
})

const trip = (days: string[][], packed: string[] = []): Trip => ({
  id: 'trip_1',
  city: 'لندن',
  cityLatin: 'London',
  from: '١٢ ديسمبر',
  to: '١٨ ديسمبر',
  days: days.map((itemIds, index) => ({ day: index + 1, label: 'يوم', itemIds })),
  packed,
  createdAt: '2026-08-01T09:00:00.000Z',
})

describe('tripProgress', () => {
  it('يعدّ الأيام المخطّطة ويعطي نسبتها', () => {
    const progress = tripProgress(trip([['a'], [], ['b'], []]))
    expect(progress.totalDays).toBe(4)
    expect(progress.plannedDays).toBe(2)
    expect(progress.planned).toBe(0.5)
    expect(progress.emptyDays).toEqual([2, 4])
  })

  it('قطع الشنطة مميّزة: قطعة في يومين تُحسب مرة', () => {
    expect(tripProgress(trip([['a', 'b'], ['a']])).pieces).toBe(2)
  })

  it('المحزوم يُحسب من القائمة المشتقّة لا من مصفوفة `packed` وحدها', () => {
    // «c» محزومة لكنها ما عادت في أي يوم — ما تُعدّ
    const progress = tripProgress(trip([['a', 'b']], ['a', 'c']))
    expect(progress.pieces).toBe(2)
    expect(progress.packedPieces).toBe(1)
    expect(progress.packed).toBe(0.5)
  })

  it('رحلة بلا أيام ما تقسم على صفر', () => {
    const progress = tripProgress(trip([]))
    expect(progress.planned).toBe(0)
    expect(progress.packed).toBe(0)
  })

  it('تكتمل لما تُخطَّط كل الأيام ويُحزم كل شي', () => {
    expect(tripProgress(trip([['a'], ['b']], ['a', 'b'])).done).toBe(true)
    expect(tripProgress(trip([['a'], []], ['a'])).done).toBe(false)
    expect(tripProgress(trip([['a'], ['b']], ['a'])).done).toBe(false)
  })
})

describe('packingGroups', () => {
  const wardrobe = [
    item('t1', 'women-tshirts'),
    item('t2', 'women-shirts'),
    item('s1', 'women-shoes'),
    item('g1', 'women-bags'),
  ]

  it('يجمع القطع بمواضعها بترتيب فلاتر الخزانة', () => {
    const groups = packingGroups(trip([['s1', 't1'], ['g1', 't2']]), wardrobe)
    expect(groups.map((group) => group.slot)).toEqual(['top', 'shoes', 'bag'])
    expect(groups[0].items.map((i) => i.id)).toEqual(['t1', 't2'])
  })

  it('يسقط المجموعات الفاضية والقطع المحذوفة من الخزانة', () => {
    const groups = packingGroups(trip([['t1', 'ghost']]), wardrobe)
    expect(groups).toHaveLength(1)
    expect(groups[0].items).toHaveLength(1)
  })
})

describe('nextEmptyDay', () => {
  it('يعطي أول يوم فاضي، وغير معرّف لو اكتملت', () => {
    expect(nextEmptyDay(trip([['a'], [], []]))).toBe(2)
    expect(nextEmptyDay(trip([['a'], ['b']]))).toBeUndefined()
  })
})
