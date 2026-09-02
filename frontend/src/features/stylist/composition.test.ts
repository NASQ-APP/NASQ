/**
 * بنية الإطلالة وتسرّب الحالة — ثلاثة أعطال ظهرت في الاستعمال الحقيقي.
 *
 *   ١. «وش اللبس اليوم» أعطت: نظّارة شمسية + بنطلون + لوفر، وقالت إن النظّارة
 *      **تقود الإطلالة**.
 *   ٢. «ابيك تطلع لي فستاني احمر» أُجيبت بـ«ما لقيت حذاء في خزانتك».
 *   ٣. نصيحةٌ عن «عنّابي» ردًّا على سؤال عن «أحمر».
 *
 * والأول والثاني سببهما **واحد**: `slotOfCategory` كانت ترجع `'top'` لأي فئة
 * لا تعرفها. فالنظّارة صارت قطعةً علوية تقود الإطلالة، واللوفر صار علويًّا
 * فاختفى من بحث الأحذية.
 */
import { describe, expect, it, vi } from 'vitest'
import { respond } from './respond'
import { EMPTY_SESSION, type StylistSession } from './session/session'
import { slotOfCategory, resolveColorName } from '@/domain/wardrobe'
import type { SemanticIntent, StylistIntentProvider } from './intent/provider'
import { EMPTY_DECLARED, EMPTY_STYLE_PROFILE } from '@/domain/style/types'
import type { WardrobeItem } from '@/domain/wardrobe'

const item = (over: Partial<WardrobeItem> & { id: string }): WardrobeItem => ({
  name: over.id,
  categoryId: 'women-tops',
  shape: 'blouse',
  colorHex: '#B5B5B0',
  colorName: 'رمادي',
  wardrobeId: 'w1',
  source: 'wardrobe',
  favorite: false,
  addedAt: '2026-01-01',
  ...over,
})

const WARDROBE: WardrobeItem[] = [
  item({ id: 'top-white', name: 'بلوزة بيضاء', colorHex: '#F4F3F0', colorName: 'أبيض' }),
  item({
    id: 'pants',
    name: 'بنطلون مستقيم',
    categoryId: 'women-pants',
    shape: 'pants',
    colorHex: '#2C3340',
    colorName: 'كحلي',
  }),
  item({
    id: 'loafer-gray',
    name: 'حذاء لوفر شمواة',
    categoryId: 'women-shoes',
    shape: 'flats',
    colorHex: '#B5B5B0',
    colorName: 'رمادي',
  }),
  item({
    id: 'dress-burgundy',
    name: 'فستان عنّابي',
    categoryId: 'women-dresses',
    shape: 'dress',
    colorHex: '#6E2B33',
    colorName: 'عنّابي',
  }),
  /*
    فئة لا يعرفها الجدول — وهذا حال النظّارة المستوردة فعلاً. لا نخترع فئة
    في القاعدة؛ نختبر ما يفعله النظام بما لا يعرفه.
  */
  item({
    id: 'sunglasses',
    name: 'نظارة شمسية مستطيلة',
    categoryId: 'women-sunglasses',
    shape: 'sunglasses',
    colorHex: '#1B1B1B',
    colorName: 'أسود',
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
const byId = (id: string) => WARDROBE.find((piece) => piece.id === id)

/* ------------------- الجذر: الفئة المجهولة لا تقود ------------------- */

describe('الفئة المجهولة لا تُقرأ قطعةً علوية', () => {
  it('ما ليس في الجدول يصير إكسسوارًا لا توبًا', () => {
    // الافتراض القديم `'top'` هو ما جعل النظّارة تقود الإطلالة
    expect(slotOfCategory('women-sunglasses')).toBe('accessory')
    expect(slotOfCategory('لا-وجود-لها')).toBe('accessory')

    // والمعروف يبقى كما هو
    expect(slotOfCategory('women-shoes')).toBe('shoes')
    expect(slotOfCategory('women-dresses')).toBe('full')
    expect(slotOfCategory('women-tops')).toBe('top')
  })
})

/* --------------------- FLOW B · إطلالة عامة --------------------- */

describe('B · «وش اللبس اليوم» تعطي بنية صحيحة', () => {
  it('فستان أو علوي+سفلي — ولا نظّارة تقود', async () => {
    const reply = await respond({
      ...base,
      message: 'وش اللبس اليوم',
      session: EMPTY_SESSION,
      intentProvider: ai({ task: 'build_outfit' }),
    })

    expect(reply.answer.looks.length).toBeGreaterThan(0)

    for (const look of reply.answer.looks) {
      const slots = look.itemIds.map((id) => slotOfCategory(byId(id)?.categoryId ?? ''))
      const valid = slots.includes('full') || (slots.includes('top') && slots.includes('bottom'))

      expect(valid, `بنية غير صالحة: ${slots.join('+')}`).toBe(true)
      // النظّارة لا تحلّ محلّ قطعة أساسية
      expect(look.itemIds).not.toContain('sunglasses')
    }
  })

  it('الشرح يسمّي القطعة الأساسية لا الإكسسوار', async () => {
    const reply = await respond({
      ...base,
      message: 'نسقي لي',
      session: EMPTY_SESSION,
      intentProvider: ai({ task: 'build_outfit' }),
    })

    for (const look of reply.answer.looks) {
      expect(look.reason ?? '').not.toContain('نظارة')
    }
  })
})

/* ------------------ FLOW A · تسرّب حالة السؤال ------------------ */

describe('A · حالة السؤال اللوني لا تتسرّب للدور التالي', () => {
  it('«طلّع لي فستاني الأحمر» بعد سؤال عن الكعب يبحث في الفساتين', async () => {
    let session: StylistSession = EMPTY_SESSION

    /* الدور ١ — سؤال عن لون الكعب */
    const advice = await respond({
      ...base,
      message: 'ابي اللبس فستان احمر بس محتاره وش اللون الكعب',
      session,
      intentProvider: ai({
        task: 'color_advice',
        requestedColors: ['احمر'],
        requestedCategories: ['shoes'],
      }),
    })
    session = advice.session

    expect(advice.answer.message).toContain('أنسب الألوان')
    // الفئة المسؤول عنها السؤال لا تصير قيدًا على الجلسة
    expect(session.requestedSlots).not.toContain('shoes')

    /* الدور ٢ — هدف جديد: أخرجي الفستان */
    const find = await respond({
      ...base,
      message: 'ابيك تطلع لي فستاني احمر',
      session,
      intentProvider: ai({
        task: 'find_items',
        isNewGoal: true,
        requestedCategories: ['dress'],
        requestedColors: ['احمر'],
      }),
    })

    expect(find.answer.message).not.toContain('ما لقيت حذاء')
    expect(find.found?.length).toBeGreaterThan(0)
    for (const piece of find.found ?? []) {
      expect(slotOfCategory(piece.categoryId)).toBe('full')
    }
  })
})

/* ------------------ FLOW D · مطابقة اللوفر الرمادي ------------------ */

describe('D · القطعة الحقيقية تُلقى حين يوافق لونها النصيحة', () => {
  it('لوفر رمادي يظهر ضمن نصيحة تشمل الرمادي', async () => {
    const reply = await respond({
      ...base,
      message: 'وش لون كعب يليق مع فستاني العنّابي؟',
      session: { ...EMPTY_SESSION, anchorItemId: 'dress-burgundy', anchorExplicit: true },
      intentProvider: ai({ task: 'color_advice', requestedCategories: ['shoes'] }),
    })

    const suggested = reply.answer.message
    const ids = (reply.found ?? []).map((piece) => piece.id)

    // إن كان الرمادي ضمن المقترَح، فاللوفر الرمادي موجود ولازم يظهر
    if (suggested.includes('رمادي')) {
      expect(ids).toContain('loafer-gray')
      expect(reply.answer.message).not.toContain('ما عندك حذاء')
    }
  })
})

/* --------------------- FLOW E · الأحمر والعنّابي --------------------- */

describe('E · «أحمر» و«عنّابي» عائلة واحدة لا لونٌ واحد', () => {
  it('العلاقة تُصنَّف قرابةً لا مطابقة', () => {
    const red = resolveColorName('احمر')
    expect(red?.color.name).toBe('عنّابي')
    expect(red?.relation).toBe('family')

    // والمطابق يبقى مطابقًا
    expect(resolveColorName('عنابي')?.relation).toBe('exact')
    expect(resolveColorName('أسود')?.relation).toBe('exact')
    // والمرادف الحقيقي يبقى مرادفًا
    expect(resolveColorName('رصاصي')).toEqual({
      color: expect.objectContaining({ name: 'رمادي' }),
      relation: 'alias',
    })
  })

  it('الذهبي ليس جمليًّا بالضبط', () => {
    expect(resolveColorName('ذهبي')?.relation).toBe('family')
    expect(resolveColorName('ذهبي')?.relation).not.toBe('exact')
  })

  it('الجواب يقول إنه الأقرب لا المطلوب', async () => {
    const reply = await respond({
      ...base,
      message: 'وش يليق مع الأحمر؟',
      session: EMPTY_SESSION,
      intentProvider: ai({ task: 'color_advice', requestedColors: ['احمر'] }),
    })

    expect(reply.answer.message).toContain('الأقرب')
    expect(reply.answer.message).toContain('أنسب الألوان')
  })

  it('اللون المجهول يبقى مجهولًا — بلا تخمين', () => {
    expect(resolveColorName('لون-مخترع')).toBeUndefined()
  })
})

/* ---------------- بيانات حيّة: اللوفر والنظّارة ---------------- */

describe('القطعتان كما هما في القاعدة فعلاً', () => {
  /*
    قُرئت الحقول من قاعدة البيانات الحيّة أثناء التدقيق:
      «حذاء لوفر شمواة»          → women-shoes   · لونه «غير محدد»
      «نظارة شمسية مستطيلة»      → women-tshirts · لونها «غير محدد»

    فالنظّارة مصنَّفة **تيشيرتًا** في القاعدة — وهذا سبب قيادتها الإطلالة، لا
    افتراضٌ في الشيفرة. والمحرّك يقرأ ما في البيانات بأمانة.
  */
  const liveLoafer = item({
    id: 'live-loafer',
    name: 'حذاء لوفر شمواة',
    categoryId: 'women-shoes',
    colorName: 'غير محدد',
    colorHex: '#B5B5B0',
  })

  const liveSunglasses = item({
    id: 'live-sunglasses',
    name: 'نظارة شمسية مستطيلة - أسود',
    categoryId: 'women-tshirts',
    colorName: 'غير محدد',
    colorHex: '#1B1B1B',
  })

  it('اللوفر يُقرأ حذاءً — تصنيفه صحيح', () => {
    expect(slotOfCategory(liveLoafer.categoryId)).toBe('shoes')
  })

  it('اللون «غير محدد» يمنع المطابقة — ويُقال بدل إنكار القطعة', async () => {
    // الحذاء الوحيد لونه غير معروف — هذي حال خزانتها فعلاً
    const wardrobe = [...WARDROBE.filter((piece) => piece.id !== 'loafer-gray'), liveLoafer]
    const reply = await respond({
      ...base,
      wardrobe,
      message: 'وش لون كعب يليق مع فستاني العنّابي؟',
      session: { ...EMPTY_SESSION, anchorItemId: 'dress-burgundy', anchorExplicit: true },
      intentProvider: ai({ task: 'color_advice', requestedCategories: ['shoes'] }),
    })

    // ما عاد يُقال «ما عندك حذاء» لمن عندها حذاء
    expect(reply.answer.message).not.toContain('ما عندك حذاء')
    expect(reply.answer.message).toContain('غير محدَّد')
  })

  it('النظّارة مصنَّفة تيشيرتًا في البيانات — فتُقرأ علويًّا بأمانة', () => {
    // العلاج في تصنيف القطعة لا في المحرّك؛ والاختبار يوثّق الحقيقة
    expect(slotOfCategory(liveSunglasses.categoryId)).toBe('top')
  })
})
