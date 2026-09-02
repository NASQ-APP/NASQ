/**
 * توجيه النيّة — تصفّحٌ أم تنسيقٌ أم سؤالٌ عن لون؟
 *
 * عطلان وقعا في الإنتاج:
 *   ١. «عطني فستان ابي اطلع اليوم» رُدّت بقائمة فساتين — قُرئت تصفّحًا وفيها هدف.
 *   ٢. «ابي فستان احمر وش يليق له لون كعب؟» رُدّت بـ«ما لقيت حذاء في خزانتك»
 *      — سؤالٌ عن نظرية أُجيب عنه بجرد مخزون.
 *
 * والتوجيه من النموذج، فالمُحاكى هنا نيّته. وما تحرسه هذي الاختبارات هو ما
 * يفعله التطبيق **بعدها**.
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

const RED = '#8E2434'

const WARDROBE: WardrobeItem[] = [
  item({ id: 'dress-red', name: 'فستان أحمر', colorHex: RED, colorName: 'عنابي' }),
  item({ id: 'dress-black', name: 'فستان أسود' }),
  item({ id: 'dress-beige', name: 'فستان بيج', colorHex: '#D8CBB6', colorName: 'بيج' }),
  item({ id: 'dress-navy', name: 'فستان كحلي', colorHex: '#26303F', colorName: 'كحلي' }),
  item({
    id: 'shoes-beige',
    name: 'كعب بيج',
    categoryId: 'women-shoes',
    shape: 'heels',
    colorHex: '#D8CBB6',
    colorName: 'بيج',
  }),
]

/** خزانة بلا أي حذاء — لاختبار أن النصيحة لا تشترط مخزونًا. */
const NO_SHOES = WARDROBE.filter((piece) => piece.categoryId !== 'women-shoes')

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

/* ------------------------- تصفّح مقابل تنسيق ------------------------- */

describe('A · التصفّح يبقى تصفّحًا', () => {
  it('«وريني الفساتين اللي عندي» يعرض القطع بلا بناء', async () => {
    const reply = await respond({
      ...base,
      message: 'وريني الفساتين اللي عندي',
      session: EMPTY_SESSION,
      intentProvider: ai({ task: 'find_items', requestedCategories: ['dress'] }),
    })

    expect(reply.found?.length).toBe(4)
    // بطاقة لكل قطعة — لا طقم مركّب
    for (const look of reply.answer.looks) expect(look.itemIds).toHaveLength(1)
  })
})

describe('B · الهدف يجعله تنسيقًا لا تصفّحًا', () => {
  it('«عطني فستان ابي اطلع اليوم» يبني إطلالة من فستان حقيقي', async () => {
    const reply = await respond({
      ...base,
      message: 'عطني فستان ابي اطلع اليوم',
      session: EMPTY_SESSION,
      intentProvider: ai({
        task: 'build_outfit',
        requestedCategories: ['dress'],
        occasion: 'casual',
      }),
    })

    expect(reply.answer.looks.length).toBeGreaterThan(0)
    // لا تُقدَّم قائمة خام ولا تُطلب خطوة ثانية
    expect(reply.answer.message).not.toContain('لقيت لك')
    expect(reply.answer.gap ?? '').not.toContain('نسّقي الأول')
    expect(reply.found).toBeUndefined()

    // وكل معرّف من خزانتها
    const ids = reply.answer.looks.flatMap((look) => look.itemIds)
    for (const id of ids) expect(WARDROBE.some((piece) => piece.id === id)).toBe(true)
  })

  it('E · «عندي عزيمة وأبي ألبس فستان» يبني بالمناسبة', async () => {
    const reply = await respond({
      ...base,
      message: 'عندي عزيمة وأبي ألبس فستان',
      session: EMPTY_SESSION,
      intentProvider: ai({
        task: 'build_outfit',
        requestedCategories: ['dress'],
        occasion: 'dinner',
        formality: 'smart_casual',
      }),
    })

    expect(reply.session.occasion).toBe('evening')
    expect(reply.answer.looks.length).toBeGreaterThan(0)
  })
})

/* --------------------- النصيحة اللونية بلا مخزون --------------------- */

describe('C · «ابي فستان احمر وش يليق له لون كعب؟»', () => {
  const ADVICE = ai({
    task: 'color_advice',
    requestedColors: ['عنابي'],
    requestedCategories: ['shoes'],
  })

  it('تُجيب نصيحةً ولو خلت الخزانة من الأحذية', async () => {
    const reply = await respond({
      ...base,
      wardrobe: NO_SHOES,
      message: 'ابي فستان احمر وش يليق له لون كعب ؟',
      session: EMPTY_SESSION,
      intentProvider: ADVICE,
    })

    // النصيحة تُقال — ولا يُردّ بـ«ما لقيت حذاء» على سؤال نظري
    expect(reply.answer.message).toContain('أنسب الألوان')
    expect(reply.answer.message).not.toContain('اختاري قطعة ثانية')

    // والمخزون يُقال منفصلًا وبصدق
    expect(reply.answer.message).toContain('ما عندك')
    expect(reply.answer.looks).toHaveLength(0)
    expect(reply.found).toBeUndefined()
  })

  it('D · ومع وجود حذاء مطابق تُعرض القطعة الحقيقية', async () => {
    const reply = await respond({
      ...base,
      message: 'وش عندي كعب يناسب الفستان الأحمر؟',
      session: EMPTY_SESSION,
      intentProvider: ADVICE,
    })

    expect(reply.answer.message).toContain('أنسب الألوان')

    const ids = reply.answer.looks.flatMap((look) => look.itemIds)
    // أحذية فقط — والسؤال عن الكعب لا عن الفساتين
    for (const id of ids) {
      const piece = WARDROBE.find((entry) => entry.id === id)
      expect(piece?.categoryId).toBe('women-shoes')
    }
  })

  it('تستعمل لون القطعة الحقيقي حين تكون مثبَّتة', async () => {
    const session: StylistSession = {
      ...EMPTY_SESSION,
      anchorItemId: 'dress-red',
      anchorExplicit: true,
    }
    const reply = await respond({
      ...base,
      message: 'وش يليق مع فستاني؟',
      session,
      intentProvider: ai({ task: 'color_advice' }),
    })

    // الاسم من الخزانة لا من الكلمة — «فستان أحمر» قد يكون عنابيًّا فعلاً
    expect(reply.answer.message).toContain('فستان أحمر')
    expect(reply.answer.message).toContain('أنسب الألوان')
  })

  it('بلا لون ولا قطعة تسأل بدل أن تخمّن', async () => {
    const reply = await respond({
      ...base,
      message: 'وش يليق معها؟',
      session: EMPTY_SESSION,
      intentProvider: ai({ task: 'color_advice' }),
    })

    expect(reply.answer.message).toContain('أي قطعة تقصدين')
    expect(reply.answer.looks).toHaveLength(0)
  })
})

/* ------------------------ لا اختراع في أي مسار ------------------------ */

describe('كل ما يُعرض من خزانتها', () => {
  it('عبر التصفّح والتنسيق والنصيحة', async () => {
    const owned = new Set(WARDROBE.map((piece) => piece.id))

    for (const provider of [
      ai({ task: 'find_items', requestedCategories: ['dress'] }),
      ai({ task: 'build_outfit', requestedCategories: ['dress'] }),
      ai({ task: 'color_advice', requestedColors: ['عنابي'], requestedCategories: ['shoes'] }),
    ]) {
      const reply = await respond({
        ...base,
        message: 'اختبار',
        session: EMPTY_SESSION,
        intentProvider: provider,
      })

      for (const look of reply.answer.looks) {
        for (const id of look.itemIds) expect(owned.has(id)).toBe(true)
      }
      for (const piece of reply.found ?? []) expect(owned.has(piece.id)).toBe(true)
    }
  })
})
