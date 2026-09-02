/**
 * حدود النطاق، والغموض، واللون قيدًا صلبًا.
 *
 * ثلاثة أعطال حيّة:
 *   ١. «فستان احمر» أعادت أربعة فساتين فيها الأسود والأبيض — اللون لم يُصفِّ.
 *   ٢. «طيب فيه بنزين؟» ردّت بإطلالات فساتين — غموضٌ أُجيب عنه بثقة.
 *   ٣. سؤالٌ خارج النطاق كان يمرّ على محرّك الخزانة.
 *
 * والقاعدة التي تحرسها: **ما لا يُفهَم يُسأل عنه، وما ليس من شأننا يُقال، ولا
 * يُمَسّ ما كانت تبنيه في الحالتين.**
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

const WARDROBE: WardrobeItem[] = [
  item({ id: 'dress-black', name: 'فستان أسود' }),
  item({ id: 'dress-white', name: 'فستان أبيض', colorHex: '#F4F3F0', colorName: 'أبيض' }),
  item({ id: 'dress-embroidered', name: 'فستان مطرّز', colorHex: '#E5DCCB', colorName: 'كريمي' }),
  item({ id: 'dress-burgundy', name: 'فستان عنّابي', colorHex: '#6E2B33', colorName: 'عنّابي' }),
  item({
    id: 'shoes-beige',
    name: 'كعب بيج',
    categoryId: 'women-shoes',
    shape: 'heels',
    colorHex: '#D8CBB6',
    colorName: 'بيج',
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

const BOUNDARY =
  'هذا خارج نطاق نَسَق، لكن أقدر أساعدك في خزانتك وتنسيق إطلالاتك. اسأليني عن لبسك، ألوانك أو قطع خزانتك.'

/* ------------------------ اللون قيدٌ صلب ------------------------ */

describe('«فستان احمر» يحترم اللون', () => {
  it('لا يرجّع الأسود ولا الأبيض ولا الكريمي', async () => {
    const reply = await respond({
      ...base,
      message: 'فستان احمر',
      session: EMPTY_SESSION,
      intentProvider: ai({
        task: 'find_items',
        requestedCategories: ['dress'],
        requestedColors: ['احمر'],
      }),
    })

    const ids = (reply.found ?? []).map((piece) => piece.id)
    expect(ids).not.toContain('dress-black')
    expect(ids).not.toContain('dress-white')
    expect(ids).not.toContain('dress-embroidered')
  })

  it('يرجّع العنّابي بوصفه الأقرب — لا بوصفه أحمر', async () => {
    const reply = await respond({
      ...base,
      message: 'فستان احمر',
      session: EMPTY_SESSION,
      intentProvider: ai({
        task: 'find_items',
        requestedCategories: ['dress'],
        requestedColors: ['احمر'],
      }),
    })

    expect((reply.found ?? []).map((piece) => piece.id)).toContain('dress-burgundy')
    // التصريح شرطُ الصدق: العنّابي ليس أحمر
    expect(reply.answer.message).toMatch(/الأقرب|أقرب لون/)
    // والبطاقات تطابق ما صُفّي
    expect(reply.answer.looks).toHaveLength(reply.found?.length ?? 0)
  })

  it('لونٌ لا وجود له في الخزانة يُقال ولا يُعوَّض', async () => {
    const reply = await respond({
      ...base,
      message: 'فستان أخضر',
      session: EMPTY_SESSION,
      intentProvider: ai({
        task: 'find_items',
        requestedCategories: ['dress'],
        requestedColors: ['اخضر'],
      }),
    })

    expect(reply.answer.looks).toHaveLength(0)
    expect(reply.answer.message).toContain('ما لقيت')
  })
})

/* --------------------------- الغموض يُسأل --------------------------- */

describe('الغموض يُسأل عنه ولا يُخمَّن', () => {
  const AMBIGUOUS = ai({
    task: 'clarify',
    needsClarification: true,
    clarificationQuestion: 'تقصدين كعب بيج من خزانتك؟',
  })

  it('«طيب فيه بنزين؟» تسأل ولا تبني إطلالة', async () => {
    const reply = await respond({
      ...base,
      message: 'طيب فيه بنزين ؟',
      session: EMPTY_SESSION,
      intentProvider: AMBIGUOUS,
    })

    expect(reply.answer.message).toBe('تقصدين كعب بيج من خزانتك؟')
    expect(reply.answer.looks).toHaveLength(0)
    expect(reply.found).toBeUndefined()
  })

  it('والجلسة تبقى كما هي حتى تتّضح', async () => {
    const session: StylistSession = {
      ...EMPTY_SESSION,
      anchorItemId: 'dress-burgundy',
      anchorExplicit: true,
      excludedColors: ['أسود'],
    }
    const reply = await respond({
      ...base,
      message: 'طيب فيه بنزين ؟',
      session,
      intentProvider: AMBIGUOUS,
    })

    expect(reply.session).toEqual(session)
  })
})

/* --------------------------- حدود النطاق --------------------------- */

describe('خارج النطاق يُردّ بلا محرّك', () => {
  const OUT = ai({ task: 'out_of_scope' })

  it('A · «حل لي معادلة» تُردّ بحدود المساعدة', async () => {
    const reply = await respond({
      ...base,
      message: 'حل لي معادلة 2x + 3 = 9',
      session: EMPTY_SESSION,
      intentProvider: OUT,
    })

    expect(reply.answer.message).toBe(BOUNDARY)
    expect(reply.answer.looks).toHaveLength(0)
    expect(reply.found).toBeUndefined()
    // ولا بطاقة تُعرض، فلا يظهر زر التجربة على شيء
    expect(reply.answer.gap).toBeUndefined()
  })

  it('لا يمسّ الجلسة — الإطلالة التي تُبنى تبقى', async () => {
    const session: StylistSession = {
      ...EMPTY_SESSION,
      anchorItemId: 'dress-burgundy',
      anchorExplicit: true,
      requestedSlots: ['full'],
      previousItemIds: ['dress-burgundy', 'shoes-beige'],
      excludedColors: ['أسود'],
    }

    const reply = await respond({
      ...base,
      message: 'وش عاصمة فرنسا؟',
      session,
      intentProvider: OUT,
    })

    // **تُعاد كما جاءت** — لا مرساة تُمحى ولا استبعاد يضيع
    expect(reply.session).toEqual(session)
    expect(reply.anchor?.id).toBe('dress-burgundy')
  })

  it('والدور التالي يكمل من حيث وقفت', async () => {
    let session: StylistSession = {
      ...EMPTY_SESSION,
      anchorItemId: 'dress-burgundy',
      anchorExplicit: true,
    }

    session = (
      await respond({ ...base, message: 'من فاز بالمباراة؟', session, intentProvider: OUT })
    ).session

    const next = await respond({
      ...base,
      message: 'طيب غيري الحذاء',
      session,
      intentProvider: ai({
        task: 'refine_outfit',
        isNewGoal: false,
        variation: 'refine',
        requestedChanges: [{ action: 'replace', category: 'shoes', description: null }],
      }),
    })

    expect(next.session.anchorItemId).toBe('dress-burgundy')
  })
})

/* ------------------------- ما هو داخل النطاق ------------------------- */

describe('السياق يقرّر النطاق لا الكلمات', () => {
  it('B · «وش ألبس لاختبار الجامعة؟» داخل النطاق', async () => {
    const reply = await respond({
      ...base,
      message: 'وش ألبس لاختبار الجامعة؟',
      session: EMPTY_SESSION,
      intentProvider: ai({ task: 'build_outfit', occasion: 'work' }),
    })

    expect(reply.answer.message).not.toBe(BOUNDARY)
    expect(reply.session.occasion).toBe('work')
  })

  it('D · «بسافر باريس وش آخذ من دولابي؟» داخل النطاق', async () => {
    const reply = await respond({
      ...base,
      message: 'بسافر باريس أسبوع وش آخذ من دولابي؟',
      session: EMPTY_SESSION,
      intentProvider: ai({ task: 'build_outfit', occasion: 'travel' }),
    })

    expect(reply.answer.message).not.toBe(BOUNDARY)
    expect(reply.session.occasion).toBe('travel')
  })

  it('F · «الجو بارد وش يناسبني من دولابي؟» داخل النطاق', async () => {
    const reply = await respond({
      ...base,
      message: 'الجو بارد اليوم، وش يناسبني من دولابي؟',
      session: EMPTY_SESSION,
      intentProvider: ai({ task: 'build_outfit' }),
    })

    expect(reply.answer.message).not.toBe(BOUNDARY)
  })
})

/* --------------------------- الطلب المركّب --------------------------- */

describe('الطلب المركّب يُنفَّذ دفعةً واحدة', () => {
  it('فستان + لون + سياق + نصيحة + من دولابي', async () => {
    const reply = await respond({
      ...base,
      message: 'ابي اليوم اللبس فستان احر وش اللبس معه لون وشوف لي في دولابي',
      session: EMPTY_SESSION,
      intentProvider: ai({
        task: 'build_outfit',
        requestedCategories: ['dress'],
        requestedColors: ['احمر'],
        occasion: 'casual',
      }),
    })

    // لا تُردّ بـ«ما قدرت أفهم» ولا تُقسَّم على خمسة أدوار
    expect(reply.answer.message).not.toContain('ما قدرت أفهم')
    expect(reply.session.requestedSlots).toEqual(['full'])
    expect(reply.session.occasion).toBe('casual')

    const ids = reply.answer.looks.flatMap((look) => look.itemIds)
    for (const id of ids) expect(WARDROBE.some((piece) => piece.id === id)).toBe(true)
  })
})
