import { describe, expect, it } from 'vitest'
import { colorPairingFor, suggest } from './suggest'
import type { WardrobeItem } from '@/domain/wardrobe'

const item = (
  id: string,
  name: string,
  categoryId: string,
  shape: WardrobeItem['shape'],
  colorName: string,
): WardrobeItem => ({
  id,
  name,
  categoryId,
  shape,
  colorName,
  colorHex: '#777777',
  wardrobeId: 'w-test',
  source: 'wardrobe',
  favorite: false,
  addedAt: '2026-08-29T12:00:00.000Z',
})

const wardrobe = [
  item('top', 'قميص أبيض', 'women-shirts', 'shirt', 'أبيض'),
  item('bottom', 'بنطلون أسود', 'women-pants', 'pants', 'أسود'),
  item('shoes', 'حذاء أسود', 'women-shoes', 'heels', 'أسود'),
  item('outer', 'بليزر رمادي', 'women-jackets', 'blazer', 'رمادي'),
  item('bag', 'حقيبة بنية', 'women-bags', 'shoulderBag', 'بني'),
]

describe('stylist suggestions', () => {
  it('explains when the wardrobe is empty instead of inventing pieces', () => {
    const answer = suggest('نسقي لي إطلالة', [])

    expect(answer.looks).toEqual([])
    expect(answer.gap).toContain('أضيفي')
  })

  it('builds complete looks only from owned wardrobe ids with specific reasons', () => {
    const answer = suggest('نسقي لي إطلالة للعمل', wardrobe)
    const ids = new Set(wardrobe.map((piece) => piece.id))

    expect(answer.looks).toHaveLength(3)
    expect(answer.looks.every((look) => look.itemIds.every((id) => ids.has(id)))).toBe(true)
    expect(answer.looks.every((look) => look.itemIds.length >= 2)).toBe(true)
    expect(answer.looks[0].reason).toContain('قميص أبيض')
    expect(answer.looks[0].reason).toContain('أبيض')
  })

  it('builds complete looks around the selected piece and keeps it fixed', () => {
    const answer = suggest('وش يناسب القطعة المختارة؟', wardrobe, ['bottom'])
    const ids = new Set(wardrobe.map((piece) => piece.id))

    expect(answer.looks.length).toBeGreaterThan(0)
    expect(answer.looks.every((look) => look.itemIds.includes('bottom'))).toBe(true)
    expect(answer.looks.every((look) => look.itemIds.every((id) => ids.has(id)))).toBe(true)
    expect(answer.looks.every((look) => look.reason.includes('بنطلون أسود'))).toBe(true)
  })

  it('offers a useful color palette for any anchor piece', () => {
    expect(colorPairingFor(wardrobe[1]).colors).toContain('أبيض')
    expect(colorPairingFor(wardrobe[4]).colors).toContain('كريمي')
  })
})
