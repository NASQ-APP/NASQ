/**
 * المحادثة التي فشلت — محاكاة حرفية.
 *
 * ثلاث رسائل بقي فيها الفستان مثبَّتًا رغم رفضه صراحةً. الاختبار يعيدها
 * بنصّها، فلو رجع أحدٌ يقرأ المرساة من حالة الاستوديو، تسقط هنا قبل أن
 * تصل المستخدمة.
 */
import { describe, expect, it, vi } from 'vitest'
import { respond } from './respond'
import { EMPTY_SESSION, type StylistSession } from './session/session'
import type { SemanticIntent, StylistIntentProvider } from './intent/provider'
import { EMPTY_DECLARED, EMPTY_STYLE_PROFILE } from '@/domain/style/types'
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

const DRESS = item({
  id: 'dress',
  name: 'فستان سهرة تول بأكمام كشكش',
  categoryId: 'women-dresses',
  shape: 'dress',
  colorHex: '#E5DCCB',
  colorName: 'كريمي',
})

const WARDROBE: WardrobeItem[] = [
  DRESS,
  item({ id: 'jeans', name: 'جينز', categoryId: 'women-jeans', shape: 'jeans', colorHex: '#7C90A8', colorName: 'أزرق دينم' }),
  item({ id: 'top-cream', name: 'بلوزة كريمي', colorHex: '#E5DCCB', colorName: 'كريمي' }),
  item({ id: 'top-white', name: 'بلوزة بيضاء', colorHex: '#F4F3F0', colorName: 'أبيض' }),
  item({ id: 'top-black', name: 'بلوزة سوداء', colorHex: '#1B1B1B', colorName: 'أسود' }),
  item({ id: 'shoes', name: 'حذاء بيج', categoryId: 'women-shoes', shape: 'flats', colorHex: '#D8CBB6', colorName: 'بيج' }),
]

const base = { wardrobe: WARDROBE, declared: EMPTY_DECLARED, observed: EMPTY_STYLE_PROFILE }

const intent = (over: Partial<SemanticIntent> = {}): SemanticIntent => ({
  task: 'build_outfit',
  isNewGoal: true,
  requestedCategories: [],
  excludedCategories: [],
  requestedColors: [],
  excludedColors: [],
  closetRequest: { action: 'keep', name: null },
  anchorAction: 'keep',
  requestedAnchorCategory: null,
  occasion: null,
  desiredStyle: [],
  formality: null,
  variation: 'none',
  requestedChanges: [],
  needsClarification: false,
  clarificationQuestion: null,
  ...over,
})

/** مزوّد محقون — نيّة النموذج بلا نداء حقيقي. */
const ai = (over: Partial<SemanticIntent> = {}): StylistIntentProvider => ({
  extract: vi.fn().mockResolvedValue(intent(over)),
})
const hasDress = (ids: string[]) => ids.includes('dress')

describe('المحادثة الفاشلة — بنصّها', () => {
  it('تمرّ الأدوار الثلاثة والفستان يسقط ولا يعود', async () => {
    // الحالة الأولى: الفستان مثبَّت من صفحة القطعة
    let session: StylistSession = { ...EMPTY_SESSION, anchorItemId: DRESS.id }

    /* --- الدور ١ --- */
    const first = await respond({
      ...base,
      message: 'ابيك تنسق لي طلعه لبس مريح',
      session,
      intentProvider: ai({ occasion: 'casual', desiredStyle: ['comfortable'] }),
    })
    session = first.session
    expect(session.occasion).toBe('casual')

    /* --- الدور ٢: الجينز يصير الأساس والتوب هو المطلوب --- */
    const second = await respond({
      ...base,
      message: 'ابي اللبس جينز بس مدري وش اللبس توب',
      session,
      intentProvider: ai({
        isNewGoal: true,
        requestedCategories: ['jeans', 'top'],
        requestedAnchorCategory: 'jeans',
        anchorAction: 'replace',
      }),
    })
    session = second.session

    expect(session.anchorItemId).toBe('jeans')
    expect(second.anchor?.id).toBe('jeans')
    expect(second.answer.looks.length).toBeGreaterThan(0)
    for (const look of second.answer.looks) {
      expect(hasDress(look.itemIds)).toBe(false)
    }
    expect(second.answer.message).not.toContain('فستان سهرة')

    /* --- الدور ٣: رفض صريح --- */
    const third = await respond({
      ...base,
      message: 'لا ما ابي فستان',
      session,
      intentProvider: ai({ excludedCategories: ['dress'], anchorAction: 'clear' }),
    })
    session = third.session

    expect(session.anchorItemId).not.toBe('dress')
    expect(session.excludedSlots).toContain('full')
    expect(third.answer.message).not.toContain('فستان سهرة')
    for (const look of third.answer.looks) {
      expect(hasDress(look.itemIds)).toBe(false)
    }
  })
})

describe('الطلب الصريح يغلب الحالة القديمة', () => {
  it('D · «خلي الجينز» يثبّته مرساةً', async () => {
    const session = { ...EMPTY_SESSION, anchorItemId: DRESS.id }
    const reply = await respond({
      ...base,
      message: 'خلي الجينز هو الأساس',
      session,
      intentProvider: ai({ requestedAnchorCategory: 'jeans', anchorAction: 'replace' }),
    })
    expect(reply.session.anchorItemId).toBe('jeans')
  })

  it('A · «عطيني خيار ثاني» تُبقي المرساة', async () => {
    const session = { ...EMPTY_SESSION, anchorItemId: DRESS.id }
    const reply = await respond({
      ...base,
      message: 'عطيني خيار ثاني',
      session,
      intentProvider: ai({ task: 'refine_outfit', isNewGoal: false }),
    })
    expect(reply.session.anchorItemId).toBe('dress')
  })

  it('I · طلب جديد يتقدّم على مرساة قديمة', async () => {
    const session = { ...EMPTY_SESSION, anchorItemId: DRESS.id }
    const reply = await respond({
      ...base,
      message: 'ابي جينز',
      session,
      intentProvider: ai({ requestedCategories: ['jeans'], requestedAnchorCategory: 'jeans', anchorAction: 'replace' }),
    })
    expect(reply.session.anchorItemId).toBe('jeans')
  })
})

describe('F · إطلالة جزئية', () => {
  it('«وش توب يضبط مع الجينز» يرجّع توبات لا إطلالة كاملة', async () => {
    const session = { ...EMPTY_SESSION, anchorItemId: 'jeans' }
    const reply = await respond({
      ...base,
      message: 'وش توب يضبط مع هالجينز؟',
      session,
      intentProvider: ai({ task: 'style_around_item', isNewGoal: false, requestedCategories: ['top'] }),
    })

    expect(reply.answer.looks.length).toBeGreaterThan(0)
    for (const look of reply.answer.looks) {
      // الجينز مع توب فقط — بلا حذاء ولا شنطة لم تُطلَب
      expect(look.itemIds).toHaveLength(2)
      expect(look.itemIds).toContain('jeans')
    }
  })

  it('اللون المرفوض لا يظهر في الترشيح الجزئي', async () => {
    let session: StylistSession = { ...EMPTY_SESSION, anchorItemId: 'jeans' }
    session = (
      await respond({
        ...base,
        message: 'لا أبي أسود',
        session,
        intentProvider: ai({ isNewGoal: false, excludedColors: ['أسود'] }),
      })
    ).session

    const reply = await respond({
      ...base,
      message: 'وش توب يضبط معه؟',
      session,
      intentProvider: ai({ task: 'style_around_item', isNewGoal: false, requestedCategories: ['top'] }),
    })
    const ids = reply.answer.looks.flatMap((look) => look.itemIds)
    expect(ids).not.toContain('top-black')
  })
})

describe('H · ما ليس في الخزانة يُقال', () => {
  it('طلب جينز بلا جينز → يُقال ولا يُرجَع للفستان', async () => {
    const noJeans = WARDROBE.filter((piece) => piece.id !== 'jeans')
    const session = { ...EMPTY_SESSION, anchorItemId: DRESS.id }

    const reply = await respond({
      ...base,
      wardrobe: noJeans,
      message: 'ابي جينز',
      session,
      intentProvider: ai({ requestedCategories: ['jeans'], requestedAnchorCategory: 'jeans', anchorAction: 'replace' }),
    })

    expect(reply.answer.message).toContain('ما لقيت')
    expect(reply.session.anchorItemId).toBeNull()
    expect(reply.answer.message).not.toContain('فستان سهرة')
  })
})

describe('J · لا معرّف غريب يصل الواجهة', () => {
  it('كل ما يخرج من كل دور موجود في الخزانة', async () => {
    let session: StylistSession = { ...EMPTY_SESSION, anchorItemId: DRESS.id }
    const owned = new Set(WARDROBE.map((piece) => piece.id))

    const turns: [string, Partial<SemanticIntent>][] = [
      ['نسق لي إطلالة', {}],
      ['ابي جينز', { requestedCategories: ['jeans'], requestedAnchorCategory: 'jeans', anchorAction: 'replace' }],
      ['لا ما ابي فستان', { excludedCategories: ['dress'], anchorAction: 'clear' }],
      ['عطيني غيرها', { task: 'refine_outfit', isNewGoal: false }],
    ]

    for (const [message, over] of turns) {
      const reply = await respond({ ...base, message, session, intentProvider: ai(over) })
      session = reply.session
      for (const look of reply.answer.looks) {
        for (const id of look.itemIds) expect(owned.has(id)).toBe(true)
      }
    }
  })
})
