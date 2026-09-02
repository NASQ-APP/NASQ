/**
 * التعديل والتكرار — «بدون كعب» و«غيري الألوان» و«عطني غيرها».
 *
 * هذي الثلاث هي أكثر ما تقوله المستخدمة بعد أول اقتراح، وكلها فشلت في الإنتاج
 * فشلاً مختلفًا: الأولى شالت الحذاء كله فخرجت الإطلالة حافية، والثانية صُنّفت
 * خارج النطاق فردّ الشات بأنه لا يستطيع، والثالثة رجّعت نفس القطع بنصٍّ جديد.
 *
 * المزوّد هنا مزيّف عمدًا: يرجع ما **يفترض** بالنموذج أن يرجعه بعد تصحيح
 * البرومبت. فهذي الاختبارات تحرس نصف المشكلة الذي يعيش في المتصفح — الترجمة
 * من نيّة إلى قيد إلى إطلالة — ولا تدّعي أنها تختبر النموذج نفسه.
 */
import { describe, expect, it, vi } from 'vitest'
import { respond } from './respond'
import { EMPTY_SESSION, type StylistSession } from './session/session'
import type { SemanticIntent, StylistIntentProvider } from './intent/provider'
import { EMPTY_DECLARED, EMPTY_STYLE_PROFILE } from '@/domain/style/types'
import type { WardrobeItem } from '@/domain/wardrobe'

const item = (over: Partial<WardrobeItem> & { id: string }): WardrobeItem => ({
  name: over.id,
  categoryId: 'women-dresses',
  shape: 'dress',
  colorHex: '#1B1B1B',
  colorName: 'أسود',
  wardrobeId: 'w1',
  source: 'wardrobe',
  favorite: false,
  addedAt: '2026-01-01',
  ...over,
})

const shoe = (id: string, name: string, shape: WardrobeItem['shape'], hex: string, color: string) =>
  item({ id, name, categoryId: 'women-shoes', shape, colorHex: hex, colorName: color })

/** خزانة واسعة بما يكفي ألا يكون التكرار عذرًا. */
const WARDROBE: WardrobeItem[] = [
  item({ id: 'd-black', name: 'فستان أسود', colorHex: '#1B1B1B', colorName: 'أسود' }),
  item({ id: 'd-navy', name: 'فستان كحلي', colorHex: '#26303F', colorName: 'كحلي' }),
  item({ id: 'd-beige', name: 'فستان بيج', colorHex: '#D8CBB6', colorName: 'بيج' }),
  item({ id: 'd-olive', name: 'فستان زيتي', colorHex: '#5A5F44', colorName: 'زيتي' }),
  item({ id: 'd-white', name: 'فستان أبيض', colorHex: '#F4F3F0', colorName: 'أبيض' }),
  shoe('s-heel-black', 'كعب أسود', 'heels', '#1B1B1B', 'أسود'),
  shoe('s-heel-beige', 'كعب بيج', 'heels', '#D8CBB6', 'بيج'),
  shoe('s-flat', 'لوفر بيج', 'flats', '#D8CBB6', 'بيج'),
  shoe('s-sneaker', 'سنيكرز أبيض', 'sneakers', '#F4F3F0', 'أبيض'),
  shoe('s-boot', 'بوت بني', 'boots', '#6B4A2F', 'بني'),
]

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

const ai = (over: Partial<SemanticIntent> = {}): StylistIntentProvider => ({
  extract: vi.fn().mockResolvedValue(intent(over)),
})

const base = { declared: EMPTY_DECLARED, observed: EMPTY_STYLE_PROFILE }

const shownIds = (reply: { answer: { looks: { itemIds: string[] }[] } }): string[][] =>
  reply.answer.looks.map((look) => look.itemIds)

const itemsOf = (ids: string[]): WardrobeItem[] =>
  ids.map((id) => WARDROBE.find((piece) => piece.id === id)).filter(Boolean) as WardrobeItem[]

/* -------------------- «بدون كعب» -------------------- */

describe('نفي شكلٍ بعينه', () => {
  it('يشيل الكعب ويُبقي بقيّة الأحذية', async () => {
    const first = await respond({
      ...base,
      message: 'نسقي لي إطلالة للدوام',
      session: EMPTY_SESSION,
      wardrobe: WARDROBE,
      intentProvider: ai({ occasion: 'work' }),
    })

    const after = await respond({
      ...base,
      message: 'بدون كعب',
      session: first.session,
      wardrobe: WARDROBE,
      intentProvider: ai({
        task: 'refine_outfit',
        isNewGoal: false,
        variation: 'refine',
        excludedCategories: ['heels'],
        requestedChanges: [{ action: 'remove', category: 'heels', description: null }],
      }),
    })

    const worn = itemsOf(shownIds(after).flat())
    expect(worn.length).toBeGreaterThan(0)
    expect(worn.some((piece) => piece.shape === 'heels')).toBe(false)
    // الحذاء لم يختفِ — الكعب وحده هو الممنوع
    expect(worn.some((piece) => piece.categoryId === 'women-shoes')).toBe(true)
  })

  it('يبقى النفي ساريًا في الرسائل التالية', async () => {
    let session: StylistSession = EMPTY_SESSION
    session = (
      await respond({
        ...base,
        message: 'نسقي لي إطلالة',
        session,
        wardrobe: WARDROBE,
        intentProvider: ai({}),
      })
    ).session
    session = (
      await respond({
        ...base,
        message: 'بدون كعب',
        session,
        wardrobe: WARDROBE,
        intentProvider: ai({
          task: 'refine_outfit',
          isNewGoal: false,
          variation: 'refine',
          excludedCategories: ['heels'],
        }),
      })
    ).session

    const later = await respond({
      ...base,
      message: 'عطيني خيار ثاني',
      session,
      wardrobe: WARDROBE,
      intentProvider: ai({ isNewGoal: false, variation: 'alternative' }),
    })

    expect(itemsOf(shownIds(later).flat()).some((piece) => piece.shape === 'heels')).toBe(false)
  })
})

/* -------------------- «غيري الألوان» -------------------- */

describe('تغيير الألوان', () => {
  it('يردّ بإطلالة لا برفض', async () => {
    const first = await respond({
      ...base,
      message: 'نسقي لي إطلالة',
      session: EMPTY_SESSION,
      wardrobe: WARDROBE,
      intentProvider: ai({}),
    })

    const recolored = await respond({
      ...base,
      message: 'غيري الألوان',
      session: first.session,
      wardrobe: WARDROBE,
      intentProvider: ai({
        task: 'refine_outfit',
        isNewGoal: false,
        variation: 'refine',
        requestedChanges: [{ action: 'replace', category: null, description: 'color' }],
      }),
    })

    expect(recolored.answer.looks.length).toBeGreaterThan(0)
  })

  it('يحترم لونًا مرفوضًا صراحةً', async () => {
    const reply = await respond({
      ...base,
      message: 'لا أبي أسود',
      session: EMPTY_SESSION,
      wardrobe: WARDROBE,
      intentProvider: ai({ excludedColors: ['أسود'] }),
    })

    const worn = itemsOf(shownIds(reply).flat())
    expect(worn.length).toBeGreaterThan(0)
    expect(worn.some((piece) => piece.colorName === 'أسود')).toBe(false)
  })
})

/* -------------------- التكرار عبر ستّ رسائل -------------------- */

describe('لا تكرار ما دام هناك بديل', () => {
  it('كل إطلالة معروضة تُحسب، لا الأولى وحدها', async () => {
    let session: StylistSession = EMPTY_SESSION
    const seen = new Set<string>()
    const repeats: string[] = []

    for (const turn of ['ابدئي', 'ثاني', 'ثالث', 'رابع', 'خامس', 'سادس']) {
      const reply = await respond({
        ...base,
        message: turn,
        session,
        wardrobe: WARDROBE,
        intentProvider: ai(turn === 'ابدئي' ? {} : { isNewGoal: false, variation: 'alternative' }),
      })
      session = reply.session
      for (const ids of shownIds(reply)) {
        const key = ids.toSorted().join('+')
        if (seen.has(key)) repeats.push(key)
        seen.add(key)
      }
    }

    // عشر قطع تكفي لإطلالات كثيرة — أي إعادة هنا عطل لا نفاد
    expect(repeats).toEqual([])
    expect(seen.size).toBeGreaterThanOrEqual(6)
  })

  it('حين تنفد الخزانة يقولها بدل أن يعيد بصمت', async () => {
    const tiny = [
      item({ id: 'only-dress', name: 'فستان وحيد' }),
      shoe('only-shoe', 'حذاء وحيد', 'flats', '#D8CBB6', 'بيج'),
    ]
    let session: StylistSession = EMPTY_SESSION
    let last = await respond({
      ...base,
      message: 'ابدئي',
      session,
      wardrobe: tiny,
      intentProvider: ai({}),
    })
    session = last.session

    for (const turn of ['ثاني', 'ثالث']) {
      last = await respond({
        ...base,
        message: turn,
        session,
        wardrobe: tiny,
        intentProvider: ai({ isNewGoal: false, variation: 'alternative' }),
      })
      session = last.session
    }

    const text = [last.answer.message, last.answer.looks[0]?.reason ?? ''].join(' ')
    expect(text).toMatch(/أقرب|محدود|الوحيد|ما عندك/)
  })
})
