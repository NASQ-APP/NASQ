/**
 * التنويع — «عطني تنسيق ثاني» يعطي ثانيًا فعلاً.
 *
 * العطل الذي وقع في الإنتاج: ثلاث رسائل متتالية، وثلاث مرات نفس الفستان ونفس
 * الحذاء ونفس الشرح. وسببه أن التقاط المحرّك كان يُثبَّت مرساةً، فتصير كل رسالة
 * بعدها بناءً حوله لا بحثًا جديدًا.
 *
 * الخزانة هنا مصنوعة لتُفرّق: ثلاثة فساتين بدرجات رسمية مختلفة، وثلاثة أحذية.
 * فلو رجع التثبيت يومًا، تسقط هذي الاختبارات قبل أن تصل المستخدمة.
 */
import { describe, expect, it, vi } from 'vitest'
import { respond } from './respond'
import { EMPTY_SESSION, signatureOf, type StylistSession, MEMORY } from './session/session'
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

const WARDROBE: WardrobeItem[] = [
  item({ id: 'dress-black', name: 'فستان سهرة أسود', colorHex: '#1B1B1B', colorName: 'أسود' }),
  item({ id: 'dress-navy', name: 'فستان ميدي كحلي', colorHex: '#26303F', colorName: 'كحلي' }),
  item({ id: 'dress-beige', name: 'فستان بيج', colorHex: '#D8CBB6', colorName: 'بيج' }),
  item({
    id: 'shoes-black',
    name: 'كعب أسود',
    categoryId: 'women-shoes',
    shape: 'heels',
    colorHex: '#1B1B1B',
    colorName: 'أسود',
  }),
  item({
    id: 'shoes-beige',
    name: 'لوفر بيج',
    categoryId: 'women-shoes',
    shape: 'flats',
    colorHex: '#D8CBB6',
    colorName: 'بيج',
  }),
  item({
    id: 'shoes-white',
    name: 'سنيكرز أبيض',
    categoryId: 'women-shoes',
    shape: 'sneakers',
    colorHex: '#F4F3F0',
    colorName: 'أبيض',
  }),
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

const base = { wardrobe: WARDROBE, declared: EMPTY_DECLARED, observed: EMPTY_STYLE_PROFILE }

/** بصمة أول توصية معروضة. */
const shownSignature = (reply: { answer: { looks: { itemIds: string[] }[] } }): string =>
  signatureOf(reply.answer.looks[0]?.itemIds ?? [])

/* -------------------- المحادثة التي فشلت، بنصّها -------------------- */

describe('المحادثة الحيّة: ثلاثة أدوار، ثلاث نتائج', () => {
  it('لا يُعاد نفس الطقم على أنه خيار جديد', async () => {
    let session: StylistSession = EMPTY_SESSION

    /* الدور ١ — «ابي اللبس فستان» */
    const first = await respond({
      ...base,
      message: 'ابي اللبس فستان',
      session,
      intentProvider: ai({ requestedCategories: ['dress'] }),
    })
    session = first.session
    const a = shownSignature(first)

    expect(first.answer.looks.length).toBeGreaterThan(0)
    // القطعة المُلتقطة لا تصير مرساة — وهذا هو الإصلاح
    expect(session.anchorExplicit).toBe(false)
    expect(session.previousItemIds.length).toBeGreaterThan(0)

    /* الدور ٢ — سياق جديد: عزيمة أنيقة لا رسمية */
    const second = await respond({
      ...base,
      message: 'عندي عزيمة بالليل أبي شيء أنيق بس مو رسمي مرة',
      session,
      intentProvider: ai({
        occasion: 'dinner',
        formality: 'smart_casual',
        desiredStyle: ['elegant'],
        requestedCategories: ['dress'],
      }),
    })
    session = second.session
    expect(second.answer.looks.length).toBeGreaterThan(0)

    /* الدور ٣ — «عطني تنسيق ثاني من دولابي» */
    const third = await respond({
      ...base,
      message: 'عطني تنسيق ثاني من دولابي',
      session,
      intentProvider: ai({ variation: 'alternative', isNewGoal: false }),
    })
    const c = shownSignature(third)

    expect(third.answer.looks.length).toBeGreaterThan(0)
    // الخزانة تحتمل غيره — فلا عذر لإعادته
    expect(c).not.toBe(a)
  })
})

/* ------------------------ المرساة: صريحة أم لا ------------------------ */

describe('B · المرساة الصريحة تصمد، والالتقاط لا', () => {
  it('«خلي الفستان الأسود» يثبّته، و«خيار ثاني» يبقيه', async () => {
    let session: StylistSession = EMPTY_SESSION

    const pinned = await respond({
      ...base,
      message: 'نسقي لي هذا الفستان',
      session,
      intentProvider: ai({ anchorAction: 'replace', requestedAnchorCategory: 'dress' }),
    })
    session = pinned.session
    expect(session.anchorExplicit).toBe(true)
    const anchored = session.anchorItemId

    const again = await respond({
      ...base,
      message: 'عطني تنسيق ثاني بنفس الفستان',
      session,
      intentProvider: ai({ variation: 'alternative', isNewGoal: false }),
    })

    // المرساة الصريحة لا تُحرَّر بطلب البديل
    expect(again.session.anchorItemId).toBe(anchored)
    expect(again.session.anchorExplicit).toBe(true)
  })

  it('التقاط المحرّك يُحرَّر عند طلب البديل', async () => {
    let session: StylistSession = EMPTY_SESSION

    session = (
      await respond({
        ...base,
        message: 'ابي فستان',
        session,
        intentProvider: ai({ requestedCategories: ['dress'] }),
      })
    ).session

    const alternative = await respond({
      ...base,
      message: 'عطني خيار ثاني',
      session,
      intentProvider: ai({ variation: 'alternative', isNewGoal: false }),
    })

    expect(alternative.session.anchorItemId).toBeNull()
  })
})

/* ------------------------ الاستبعاد يصمد عبر البديل ------------------------ */

describe('E · «لا أبي أسود» يبقى مستبعَدًا في الخيار التالي', () => {
  it('الأسود لا يعود مع «عطني خيار ثاني»', async () => {
    let session: StylistSession = EMPTY_SESSION

    session = (
      await respond({
        ...base,
        message: 'أبي فستان بس لا أبي أسود',
        session,
        intentProvider: ai({ requestedCategories: ['dress'], excludedColors: ['أسود'] }),
      })
    ).session

    expect(session.excludedColors).toContain('أسود')

    const next = await respond({
      ...base,
      message: 'عطني خيار ثاني',
      session,
      intentProvider: ai({ variation: 'alternative', isNewGoal: false }),
    })

    const ids = next.answer.looks.flatMap((look) => look.itemIds)
    expect(ids).not.toContain('dress-black')
    expect(ids).not.toContain('shoes-black')
    expect(next.session.excludedColors).toContain('أسود')
  })
})

/* --------------------------- الذاكرة محدودة --------------------------- */

describe('ذاكرة التوصيات', () => {
  it('تسجّل ما عُرض ولا تكبر بلا حدّ', async () => {
    let session: StylistSession = EMPTY_SESSION

    for (const message of ['ابي فستان', 'غيرها', 'غيرها', 'غيرها', 'غيرها', 'غيرها']) {
      session = (
        await respond({
          ...base,
          message,
          session,
          intentProvider: ai({ variation: 'alternative', isNewGoal: false }),
        })
      ).session
    }

    // محدودة عمدًا: خزانة صغيرة لا تحتمل استبعادًا أبديًّا
    expect(session.recentSignatures.length).toBeLessThanOrEqual(MEMORY)
    expect(new Set(session.recentSignatures).size).toBe(session.recentSignatures.length)
  })
})

/* ------------------- G · خزانة لا تحتمل بديلاً ------------------- */

describe('G · الخزانة الضيّقة تُقال بصدق', () => {
  it('فستان واحد فقط → يُقال إنه أقرب المختلف، ولا يُقدَّم كجديد', async () => {
    const thin = WARDROBE.filter(
      (piece) => piece.id === 'dress-navy' || piece.id === 'shoes-beige',
    )
    let session: StylistSession = EMPTY_SESSION

    const first = await respond({
      ...base,
      wardrobe: thin,
      message: 'ابي فستان',
      session,
      intentProvider: ai({ requestedCategories: ['dress'] }),
    })
    session = first.session

    const second = await respond({
      ...base,
      wardrobe: thin,
      message: 'عطني خيار ثاني',
      session,
      intentProvider: ai({ variation: 'alternative', isNewGoal: false }),
    })

    // لا اختراع، ولا صمت — والرسالة تعترف بحدود الخزانة
    if (shownSignature(second) === shownSignature(first)) {
      expect(second.answer.message).toContain('أقرب خيار مختلف')
    }
    const ids = second.answer.looks.flatMap((look) => look.itemIds)
    for (const id of ids) expect(thin.some((piece) => piece.id === id)).toBe(true)
  })
})
