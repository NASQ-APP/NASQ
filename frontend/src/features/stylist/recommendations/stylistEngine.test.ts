/**
 * المحرّك — ترتيب الأولويات، وحدود ما يُسمح له.
 *
 * أخطر ما يُختبر هنا ليس جودة الاقتراح بل **أمانته**: ألّا يخالف قيدًا صريحًا،
 * وألّا يفكّ القطعة المثبَّتة، وألّا يخرج بمعرّف ليس في خزانتها. الجودة رأي،
 * وهذي الثلاثة عقد.
 */
import { describe, expect, it } from 'vitest'
import { buildStylistContext, defaultOccasion } from '../context/stylistContext'
import { buildOutfits, compareItems, validateOutfit } from './stylistEngine'
import { colorAdviceFor } from './colorAdvice'
import { diversify, generateCandidates } from './generateCandidates'
import { unenforceable, violatesConstraint } from '../scoring/constraints'
import { EMPTY_DECLARED, EMPTY_STYLE_PROFILE } from '@/domain/style/types'
import type { DeclaredStyle } from '@/domain/style/types'
import type { WardrobeItem } from '@/domain/wardrobe'

const item = (over: Partial<WardrobeItem> & { id: string }): WardrobeItem => ({
  name: over.id,
  categoryId: 'women-tops',
  shape: 'blouse',
  colorHex: '#E5DCCB',
  colorName: 'كريمي',
  wardrobeId: 'w1',
  source: 'wardrobe',
  favorite: false,
  addedAt: '2026-01-01',
  ...over,
})

const WARDROBE: WardrobeItem[] = [
  item({ id: 'top-cream', categoryId: 'women-tops', colorHex: '#E5DCCB', colorName: 'كريمي' }),
  item({ id: 'top-white', categoryId: 'women-tops', colorHex: '#F4F3F0', colorName: 'أبيض' }),
  item({ id: 'top-pink', categoryId: 'women-tops', colorHex: '#E0CCC5', colorName: 'وردي هادئ' }),
  item({ id: 'trousers-burgundy', categoryId: 'women-pants', shape: 'pants', colorHex: '#6E2B33', colorName: 'عنّابي' }),
  item({ id: 'jeans-blue', categoryId: 'women-jeans', shape: 'jeans', colorHex: '#7C90A8', colorName: 'أزرق دينم' }),
  item({ id: 'shoes-flat-beige', categoryId: 'women-shoes', shape: 'flats', colorHex: '#D8CBB6', colorName: 'بيج' }),
  item({ id: 'shoes-heels-black', categoryId: 'women-shoes', shape: 'heels', colorHex: '#1B1B1B', colorName: 'أسود' }),
  item({ id: 'bag-cream', categoryId: 'women-bags', shape: 'tote', colorHex: '#E5DCCB', colorName: 'كريمي' }),
  item({ id: 'dress-burgundy', categoryId: 'women-dresses', shape: 'dress', colorHex: '#6E2B33', colorName: 'عنّابي' }),
]

const find = (id: string) => WARDROBE.find((piece) => piece.id === id)!

const context = (over: Partial<Parameters<typeof buildStylistContext>[0]> = {}) =>
  buildStylistContext({
    declared: EMPTY_DECLARED,
    observed: EMPTY_STYLE_PROFILE,
    wardrobe: WARDROBE,
    ...over,
  })

describe('H · القيد الصريح يسبق كل شيء', () => {
  const avoidsHeels: DeclaredStyle = { ...EMPTY_DECLARED, avoid: ['heels'] }

  it('من تتجنّب الكعب لا يظهر لها كعب — ولو كان أفضل انسجامًا', () => {
    const outfits = buildOutfits(context({ declared: avoidsHeels }))
    const all = outfits.flatMap((outfit) => outfit.itemIds)
    expect(all).not.toContain('shoes-heels-black')
  })

  it('القيد يُقاس من الشكل لا من الاسم', () => {
    expect(violatesConstraint(find('shoes-heels-black'), ['heels'])).toBe(true)
    expect(violatesConstraint(find('shoes-flat-beige'), ['heels'])).toBe(false)
  })

  it('K · اللون القوي يُستبعد بالقياس', () => {
    const neon = item({ id: 'neon', colorHex: '#39FF14', colorName: 'أخضر' })
    expect(violatesConstraint(neon, ['boldColor'])).toBe(true)
    expect(violatesConstraint(find('top-cream'), ['boldColor'])).toBe(false)
  })

  it('ما لا نملك بياناته يُعلَن ولا يُدَّعى فرضه', () => {
    // «ضيّق» و«بدون أكمام» و«نقشات» ما لها حقل في القطعة
    expect(unenforceable(['tight', 'sleeveless', 'pattern', 'heels'])).toEqual([
      'tight',
      'sleeveless',
      'pattern',
    ])
  })
})

describe('I · القطعة المثبَّتة تبقى', () => {
  it('تظهر في كل خيار بلا استثناء', () => {
    const outfits = buildOutfits(context({ anchor: find('dress-burgundy') }))
    expect(outfits.length).toBeGreaterThan(0)
    for (const outfit of outfits) {
      expect(outfit.itemIds).toContain('dress-burgundy')
    }
  })

  it('تنجو من قيد يخالفها — اختيارها الحاضر يعلو على قيد قديم', () => {
    const outfits = buildOutfits(
      context({
        anchor: find('shoes-heels-black'),
        declared: { ...EMPTY_DECLARED, avoid: ['heels'] },
      }),
    )
    expect(outfits.length).toBeGreaterThan(0)
    expect(outfits[0].itemIds).toContain('shoes-heels-black')
  })

  it('الفستان المثبَّت لا يُبنى معه علوي وسفلي', () => {
    const outfits = buildOutfits(context({ anchor: find('dress-burgundy') }))
    for (const outfit of outfits) {
      expect(outfit.itemIds).not.toContain('trousers-burgundy')
      expect(outfit.itemIds).not.toContain('jeans-blue')
    }
  })
})

describe('J · لا معرّف من خارج الخزانة', () => {
  it('كل ما يخرج موجود فعلاً', () => {
    const outfits = buildOutfits(context())
    const owned = new Set(WARDROBE.map((piece) => piece.id))
    for (const outfit of outfits) {
      for (const id of outfit.itemIds) expect(owned.has(id)).toBe(true)
    }
  })

  it('الحارس يرفض الإطلالة كاملة لا يبترها', () => {
    expect(validateOutfit(['top-cream', 'ما-عندها'], WARDROBE)).toBe(false)
    expect(validateOutfit(['top-cream', 'shoes-flat-beige'], WARDROBE)).toBe(true)
    expect(validateOutfit([], WARDROBE)).toBe(false)
  })
})

describe('L · ذوقها المصرَّح يرجّح', () => {
  it('الإطلالة بألوانها المفضّلة ترتفع درجتها', () => {
    const plain = buildOutfits(context())[0]
    const liked = buildOutfits(
      context({
        declared: {
          ...EMPTY_DECLARED,
          colors: [{ name: 'عنّابي', hex: '#6E2B33' }],
        },
      }),
    )[0]

    expect(liked.score.style).toBeGreaterThanOrEqual(plain.score.style)
  })
})

describe('M · المناسبة تغيّر الترتيب', () => {
  it('المسائية ترفع القطعة الكاملة والكعب، والعمل يرفع المحايد', () => {
    const evening = buildOutfits(context({ occasion: 'evening' }))[0]
    const work = buildOutfits(context({ occasion: 'work' }))[0]
    expect(evening.score.occasion).not.toBe(work.score.occasion)
  })

  it('المناسبة تُقرأ من التعارف حين لا يقولها الطلب', () => {
    expect(defaultOccasion({ ...EMPTY_DECLARED, contexts: ['دوام'] })).toBe('work')
    expect(defaultOccasion({ ...EMPTY_DECLARED, contexts: ['مناسبات'] })).toBe('evening')
    expect(defaultOccasion(EMPTY_DECLARED)).toBe('any')
  })
})

describe('N · الثلاثة مختلفة فعلاً', () => {
  it('لا خيار يشترك بأكثر من نصف قطعه مع سابقه', () => {
    const outfits = buildOutfits(context())
    expect(outfits.length).toBeGreaterThan(1)

    for (let i = 1; i < outfits.length; i++) {
      const shared = outfits[i].itemIds.filter((id) => outfits[0].itemIds.includes(id)).length
      const smaller = Math.min(outfits[i].itemIds.length, outfits[0].itemIds.length)
      expect(shared / smaller).toBeLessThanOrEqual(0.5)
    }
  })

  it('التنويع يرفض المتشابه ويقبل المختلف', () => {
    const candidates = generateCandidates(context())
    const varied = diversify(candidates, 3)
    const keys = varied.map((outfit) => outfit.itemIds.toSorted().join(','))
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('O · الناقص يُقال ولا يُخترع', () => {
  it('خزانة بلا حذاء تعطي فجوة مسمّاة', () => {
    const noShoes = WARDROBE.filter((piece) => !piece.id.startsWith('shoes'))
    const outfits = buildOutfits(context({ wardrobe: noShoes }))

    expect(outfits.length).toBeGreaterThan(0)
    expect(outfits[0].gaps.some((gap) => gap.slot === 'shoes')).toBe(true)
    // ولا تُخترع قطعة تسدّها
    expect(outfits[0].itemIds.every((id) => noShoes.some((piece) => piece.id === id))).toBe(true)
  })
})

describe('Q · نصيحة اللون بلا إطلالة', () => {
  it('ترجع ألوانًا مصنَّفة بلا بناء إطلالة', () => {
    const advice = colorAdviceFor(find('dress-burgundy'), WARDROBE)

    expect(advice.length).toBeGreaterThan(0)
    expect(advice.every((suggestion) => suggestion.name !== 'عنّابي')).toBe(true)
    expect(advice.some((suggestion) => suggestion.tone === 'safe')).toBe(true)
    expect(advice[0].score).toBeGreaterThanOrEqual(advice[advice.length - 1].score)
  })

  it('تقول كم قطعة عندها من كل لون — نصيحة قابلة للتنفيذ', () => {
    const advice = colorAdviceFor(find('dress-burgundy'), WARDROBE)
    const cream = advice.find((suggestion) => suggestion.name === 'كريمي')
    expect(cream?.ownedCount).toBeGreaterThan(0)
  })
})

describe('المقارنة بين قطعتين', () => {
  it('تحسم في سياق القطعة المثبَّتة لا في المطلق', () => {
    const verdict = compareItems(
      find('top-white'),
      find('top-pink'),
      context({ anchor: find('dress-burgundy') }),
    )

    expect(verdict).toBeDefined()
    expect(['top-white', 'top-pink']).toContain(verdict!.winnerId)
    expect(verdict!.reasons.length).toBeGreaterThan(0)
  })

  it('بلا قطعة مثبَّتة لا حكم — «أفضل» بلا سياق بلا معنى', () => {
    expect(compareItems(find('top-white'), find('top-pink'), context())).toBeUndefined()
  })
})
