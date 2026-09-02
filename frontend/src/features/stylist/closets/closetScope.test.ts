/**
 * نطاق الخزانة — من اسمٍ يقوله النموذج إلى خزانة حقيقية.
 *
 * الحدّ الذي تحرسه هذي الاختبارات: **النموذج يعطي اسمًا، والتطبيق يعطي معرّفًا.**
 * فلو تسرّب يومًا معرّفٌ من النموذج، أو بُحث في غير الخزانة المطلوبة بصمت،
 * تسقط هنا قبل أن تصل المستخدمة.
 */
import { describe, expect, it, vi } from 'vitest'
import { respond } from '../respond'
import { EMPTY_SESSION, type StylistSession } from '../session/session'
import { normalizeArabicName, resolveCloset } from './resolveCloset'
import type { SemanticIntent, StylistIntentProvider } from '../intent/provider'
import { EMPTY_DECLARED, EMPTY_STYLE_PROFILE } from '@/domain/style/types'
import type { Wardrobe, WardrobeItem } from '@/domain/wardrobe'

const closet = (id: string, name: string): Wardrobe => ({
  id,
  name,
  nameLatin: id,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
})

const SUMMER = closet('w-summer', 'صيف')
const WINTER = closet('w-winter', 'شتاء')
const CLOSETS = [SUMMER, WINTER]

const item = (over: Partial<WardrobeItem> & { id: string }): WardrobeItem => ({
  name: over.id,
  categoryId: 'women-tops',
  shape: 'blouse',
  colorHex: '#E5DCCB',
  colorName: 'كريمي',
  wardrobeId: SUMMER.id,
  source: 'wardrobe',
  favorite: false,
  addedAt: '2026-01-01',
  ...over,
})

const WARDROBE: WardrobeItem[] = [
  item({ id: 'summer-dress', name: 'فستان صيفي', categoryId: 'women-dresses', shape: 'dress' }),
  item({ id: 'summer-top', name: 'بلوزة صيف' }),
  item({
    id: 'winter-dress',
    name: 'فستان شتوي',
    categoryId: 'women-dresses',
    shape: 'dress',
    wardrobeId: WINTER.id,
  }),
  item({
    id: 'winter-coat',
    name: 'معطف',
    categoryId: 'women-outerwear',
    shape: 'coat',
    wardrobeId: WINTER.id,
  }),
  item({ id: 'jeans', name: 'جينز', categoryId: 'women-jeans', shape: 'jeans' }),
  // بلا حذاء في الصيف لا تكتمل إطلالة منها — والخزانة الواقعية فيها ما يُلبس معًا
  item({
    id: 'summer-shoes',
    name: 'صندل بيج',
    categoryId: 'women-shoes',
    shape: 'flats',
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

/** مزوّد محقون — لا نداء حقيقي ولا كلفة. */
const ai = (over: Partial<SemanticIntent> = {}): StylistIntentProvider => ({
  extract: vi.fn().mockResolvedValue(intent(over)),
})

const base = {
  wardrobe: WARDROBE,
  closets: CLOSETS,
  declared: EMPTY_DECLARED,
  observed: EMPTY_STYLE_PROFILE,
}

/* ------------------------- الحلّ الحتمي للأسماء ------------------------- */

describe('H · تطبيع الاسم وحلّه', () => {
  it('«الصيف» و«صيف» و«خزانه» و«خزانة» تتساوى', () => {
    expect(normalizeArabicName('الصيف')).toBe(normalizeArabicName('صيف'))
    expect(normalizeArabicName('خزانه')).toBe(normalizeArabicName('خزانة'))
  })

  it('الاسم المنطوق يصل الخزانة الحقيقية', () => {
    for (const spoken of ['الصيف', 'صيف', 'صيفياتي']) {
      const resolved = resolveCloset(spoken, CLOSETS)
      expect(resolved.status, spoken).toBe('resolved')
      if (resolved.status === 'resolved') expect(resolved.scope.closetId).toBe(SUMMER.id)
    }
  })

  it('I · الاسم المجهول لا يُحَلّ — ولا يُبحث في غيره', () => {
    expect(resolveCloset('البحر', CLOSETS).status).toBe('not-found')
  })
})

describe('I · الخزانة المجهولة تُقال', () => {
  it('توقف الردّ وتعرض خزائنها بدل البحث الصامت', async () => {
    const reply = await respond({
      ...base,
      message: 'دور لي فستان في خزنة البحر',
      session: EMPTY_SESSION,
      intentProvider: ai({
        task: 'find_items',
        requestedCategories: ['dress'],
        closetRequest: { action: 'set', name: 'البحر' },
      }),
    })

    expect(reply.answer.message).toContain('ما لقيت خزانة')
    expect(reply.answer.looks).toHaveLength(0)
    expect(reply.answer.gap).toContain('صيف')
  })
})

/* ---------------------------- الجملة الفعلية ---------------------------- */

describe('B · «ابي اللبس فستان دور لي فستان في خزنه الصيف»', () => {
  it('ترجع فساتين الصيف وحدها — بلا خيارات الكاجوال السابقة', async () => {
    // الحالة السابقة: إطلالة كاجوال من علوي وسفلي
    let session: StylistSession = {
      ...EMPTY_SESSION,
      requestedSlots: ['top', 'bottom'],
      occasion: 'casual',
    }

    const reply = await respond({
      ...base,
      message: 'ابي اللبس فستان دور لي فستان في خزنه الصيف',
      session,
      intentProvider: ai({
        task: 'find_items',
        isNewGoal: true,
        requestedCategories: ['dress'],
        anchorAction: 'clear',
        closetRequest: { action: 'set', name: 'الصيف' },
      }),
    })
    session = reply.session

    expect(session.closetScope.closetId).toBe(SUMMER.id)
    expect(session.requestedSlots).toEqual(['full'])

    const ids = reply.answer.looks.flatMap((look) => look.itemIds)
    expect(ids).toContain('summer-dress')
    expect(ids).not.toContain('winter-dress')
    expect(ids).not.toContain('summer-top')
    expect(ids).not.toContain('jeans')
  })
})

/* ------------------------------ الهدف الجديد ------------------------------ */

describe('A + G · الهدف الجديد يستبدل بنية الإطلالة', () => {
  it('«ابي فستان» بعد كاجوال يمسح العلوي والسفلي', async () => {
    const session: StylistSession = {
      ...EMPTY_SESSION,
      requestedSlots: ['top', 'bottom'],
      occasion: 'casual',
    }
    const reply = await respond({
      ...base,
      message: 'ابي فستان',
      session,
      intentProvider: ai({ isNewGoal: true, requestedCategories: ['dress'] }),
    })

    expect(reply.session.requestedSlots).toEqual(['full'])
  })

  it('K · الصقل لا يمسح الفستان ولا النطاق', async () => {
    const session: StylistSession = {
      ...EMPTY_SESSION,
      requestedSlots: ['full'],
      closetScope: { type: 'closet', closetId: SUMMER.id, closetName: SUMMER.name },
      anchorItemId: 'summer-dress',
    }
    const reply = await respond({
      ...base,
      message: 'نفس الفستان بس غيري الحذاء',
      session,
      intentProvider: ai({
        task: 'refine_outfit',
        isNewGoal: false,
        requestedChanges: [{ action: 'replace', category: 'shoes', description: null }],
      }),
    })

    expect(reply.session.requestedSlots).toContain('full')
    expect(reply.session.closetScope.closetId).toBe(SUMMER.id)
    expect(reply.session.anchorItemId).toBe('summer-dress')
  })
})

/* ------------------------------ تبديل النطاق ------------------------------ */

describe('D · E · F · النطاق يتغيّر ويُلغى', () => {
  it('D · «نسق لي فستان في خزنة الصيف» يبني من الصيف وحده', async () => {
    const reply = await respond({
      ...base,
      message: 'نسق لي فستان في خزنة الصيف',
      session: EMPTY_SESSION,
      intentProvider: ai({
        task: 'build_outfit',
        isNewGoal: true,
        requestedCategories: ['dress'],
        closetRequest: { action: 'set', name: 'الصيف' },
      }),
    })

    expect(reply.session.closetScope.closetId).toBe(SUMMER.id)

    /*
      الفستان يظهر في التوصية ولا يصير **مرساة**.

      كان الاختبار يؤكّد `anchor?.id === 'summer-dress'` — أي أن التقاط المحرّك
      يُثبَّت. وهو العطل بعينه: يجعل كل رسالة تالية تُبنى عليه فيرجع نفس الطقم.
    */
    const ids = reply.answer.looks.flatMap((look) => look.itemIds)
    expect(ids).toContain('summer-dress')
    expect(reply.session.anchorExplicit).toBe(false)
    expect(ids).not.toContain('winter-dress')
    expect(ids).not.toContain('winter-coat')
  })

  it('E · «من خزنة الشتاء» ينقل النطاق ولا يخلط', async () => {
    const session: StylistSession = {
      ...EMPTY_SESSION,
      closetScope: { type: 'closet', closetId: SUMMER.id, closetName: SUMMER.name },
      requestedSlots: ['full'],
    }
    const reply = await respond({
      ...base,
      message: 'لا من خزنة الشتاء',
      session,
      intentProvider: ai({
        requestedCategories: ['dress'],
        closetRequest: { action: 'set', name: 'الشتاء' },
      }),
    })

    expect(reply.session.closetScope.closetId).toBe(WINTER.id)
    const ids = reply.answer.looks.flatMap((look) => look.itemIds)
    expect(ids).not.toContain('summer-dress')
  })

  it('F · «من كل الخزانة» يلغي النطاق', async () => {
    const session: StylistSession = {
      ...EMPTY_SESSION,
      closetScope: { type: 'closet', closetId: SUMMER.id, closetName: SUMMER.name },
    }
    const reply = await respond({
      ...base,
      message: 'دوري لي فستان من كل الخزانة',
      session,
      intentProvider: ai({
        task: 'find_items',
        requestedCategories: ['dress'],
        closetRequest: { action: 'clear', name: null },
      }),
    })

    expect(reply.session.closetScope.type).toBe('all')
    const ids = reply.answer.looks.flatMap((look) => look.itemIds)
    expect(ids).toContain('winter-dress')
  })
})

/* --------------------------- النطاق لا يُتجاوز --------------------------- */

describe('C · نطاق بلا نتيجة لا يسقط إلى كل الخزانة', () => {
  it('جاكيت في الصيف والمعطف في الشتاء → يُقال ولا يُعرض', async () => {
    const reply = await respond({
      ...base,
      message: 'دور لي جاكيت في خزنة الصيف',
      session: EMPTY_SESSION,
      intentProvider: ai({
        task: 'find_items',
        requestedCategories: ['jacket'],
        closetRequest: { action: 'set', name: 'الصيف' },
      }),
    })

    expect(reply.answer.looks).toHaveLength(0)
    expect(reply.answer.message).toContain('ما لقيت')
    // المعطف موجود — لكنه في خزانة أخرى، فلا يُعرض بلا إذن
    expect(reply.answer.gap).toContain('باقي خزائنك')
  })
})

/* ------------------------- البحث ليس تنسيقًا ------------------------- */

describe('البحث والتنسيق مساران لا واحد', () => {
  it('«دور لي فستان» يعرض القطع ولا يبني طقمًا', async () => {
    const reply = await respond({
      ...base,
      message: 'دور لي فستان',
      session: EMPTY_SESSION,
      intentProvider: ai({ task: 'find_items', requestedCategories: ['dress'] }),
    })

    expect(reply.found?.length).toBeGreaterThan(0)
    for (const look of reply.answer.looks) expect(look.itemIds).toHaveLength(1)
    expect(reply.answer.gap).toContain('نسّقي')
  })

  it('قطعة واحدة تُقال واحدة — بلا اختراع ثلاثة خيارات', async () => {
    const single = WARDROBE.filter((piece) => piece.id !== 'winter-dress')
    const reply = await respond({
      ...base,
      wardrobe: single,
      message: 'دور لي فستان في خزنة الصيف',
      session: EMPTY_SESSION,
      intentProvider: ai({
        task: 'find_items',
        requestedCategories: ['dress'],
        closetRequest: { action: 'set', name: 'الصيف' },
      }),
    })

    expect(reply.found).toHaveLength(1)
    expect(reply.answer.message).toContain('لقيت هذا')
  })
})
