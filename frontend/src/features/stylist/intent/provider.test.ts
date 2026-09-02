/**
 * وصلة الذكاء الاصطناعي — بمزوّد محقون، بلا نداء حقيقي.
 *
 * ما يُحرَس هنا شيئان: أن نيّة النموذج **تُستعمل** حين تصل، وأن كل صنف فشل
 * ينتهي بالاحتياطي المحلي لا بتوقّف. والثاني أهمّ: مساعدةٌ تموت عند انقطاع
 * الشبكة أسوأ من مساعدة تفهم أقلّ.
 */
import { describe, expect, it, vi } from 'vitest'
import { respond } from '../respond'
import { toTurnIntent, type SemanticIntent, type StylistIntentProvider } from './provider'
import { EMPTY_SESSION, type StylistSession } from '../session/session'
import { EMPTY_DECLARED, EMPTY_STYLE_PROFILE } from '@/domain/style/types'
import type { Wardrobe, WardrobeItem } from '@/domain/wardrobe'

const SUMMER: Wardrobe = {
  id: 'w-summer',
  name: 'صيف',
  nameLatin: 'summer',
  createdAt: '',
  updatedAt: '',
}

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
  item({ id: 'dress', name: 'فستان سهرة', categoryId: 'women-dresses', shape: 'dress' }),
  item({ id: 'jeans', name: 'جينز', categoryId: 'women-jeans', shape: 'jeans', colorHex: '#7C90A8', colorName: 'أزرق دينم' }),
  item({ id: 'top-white', name: 'بلوزة بيضاء', colorHex: '#F4F3F0', colorName: 'أبيض' }),
  item({ id: 'top-dark', name: 'بلوزة كحلية', colorHex: '#26303F', colorName: 'كحلي' }),
  item({ id: 'sneakers', name: 'سنيكرز', categoryId: 'women-shoes', shape: 'sneakers' }),
]

const base = {
  wardrobe: WARDROBE,
  closets: [SUMMER],
  declared: EMPTY_DECLARED,
  observed: EMPTY_STYLE_PROFILE,
}

/** نيّة كاملة صالحة — يُبنى عليها بالتعديل الجزئي. */
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

const providerReturning = (value: SemanticIntent | undefined): StylistIntentProvider => ({
  extract: vi.fn().mockResolvedValue(value),
})

/** كل أصناف الفشل تصل الواجهة بنفس الشكل: `undefined`. */
const failingProvider = (): StylistIntentProvider => ({
  extract: vi.fn().mockResolvedValue(undefined),
})

/* ------------------------------ A · النجاح ------------------------------ */

describe('A · نيّة النموذج تُستعمل حين تصل', () => {
  it('«jeans» من النموذج تصير مرساةً فعلية من الخزانة', async () => {
    const provider = providerReturning(
      intent({
        task: 'build_outfit',
        requestedCategories: ['jeans', 'top'],
        requestedAnchorCategory: 'jeans',
        anchorAction: 'replace',
        occasion: 'social',
      }),
    )

    // الرسالة نفسها لا يفهمها المحلّل المعجمي — فالنجاح دليلٌ أن النموذج قاد
    const reply = await respond({
      ...base,
      message: 'ودّي ألبس شي يريّحني بس مو نايم',
      session: EMPTY_SESSION,
      intentProvider: provider,
    })

    expect(provider.extract).toHaveBeenCalledOnce()
    expect(reply.session.anchorItemId).toBe('jeans')
  })

  it('السياق المرسل دلالات فقط — بلا معرّفات ولا خزانة', async () => {
    const provider = providerReturning(intent())
    const session: StylistSession = {
      ...EMPTY_SESSION,
      anchorItemId: 'dress',
      closetScope: { type: 'closet', closetId: SUMMER.id, closetName: SUMMER.name },
      excludedColors: ['أسود'],
    }

    await respond({ ...base, message: 'شي ثاني', session, intentProvider: provider })

    const sent = (provider.extract as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const serialized = JSON.stringify(sent)

    expect(sent.context.closetName).toBe('صيف')
    expect(sent.context.excludedColors).toContain('أسود')
    // المعرّفات لا تغادر التطبيق — النموذج يفهم الكلام ولا يعرف خزانتها
    expect(serialized).not.toContain('w-summer')
    expect(serialized).not.toContain('"dress"')
  })
})

/* ------------------- B–G · كل فشل يُقال ولا يُخفى ------------------- */

describe('B-G . الفشل يُعلَن — ولا يجيب نظام آخر', () => {
  it('كل صنف فشل يعطي خطأً قابلاً للإعادة، بلا إطلالة', async () => {
    /*
      أصناف الفشل تصل الواجهة بشكل واحد (`undefined`) عمدًا: مهلة أو ٤٢٩ أو
      ٥xx أو JSON تالف — كلها «ما فهمنا». والتفريق بينها في سجلّ الخادم لا في
      وجه المستخدمة.
    */
    for (const label of ['مهلة', '429', '5xx', 'JSON تالف', 'بنية غير صالحة', 'شبكة']) {
      const reply = await respond({
        ...base,
        message: 'ابي جينز',
        session: EMPTY_SESSION,
        intentProvider: failingProvider(),
      })

      expect(reply.answer.retryable, label).toBe(true)
      expect(reply.answer.message, label).toContain('ما قدرت أفهم')
      expect(reply.answer.looks, label).toHaveLength(0)
      // ولا مرساة تُخترع: «جينز» في الرسالة، ولا أحد يقرؤها بعد اليوم
      expect(reply.session.anchorItemId, label).toBeNull()
    }
  })

  it('الجلسة تبقى كما هي — الإعادة تكمل لا تبدأ', async () => {
    const session: StylistSession = {
      ...EMPTY_SESSION,
      anchorItemId: 'jeans',
      excludedColors: ['أسود'],
      requestedSlots: ['top'],
    }

    const reply = await respond({
      ...base,
      message: 'شي ثاني',
      session,
      intentProvider: failingProvider(),
    })

    expect(reply.session).toEqual(session)
    expect(reply.anchor?.id).toBe('jeans')
  })

  it('بلا مزوّد إطلاقًا لا تُجيب بالمعجم', async () => {
    // كان هنا سقوطٌ إلى محلّل الكلمات؛ وقد ذهب
    const reply = await respond({ ...base, message: 'ابي جينز', session: EMPTY_SESSION })

    expect(reply.answer.retryable).toBe(true)
    expect(reply.session.anchorItemId).toBeNull()
  })

  it('الإعادة بعد الفشل تنجح حين يعود النموذج', async () => {
    const failed = await respond({
      ...base,
      message: 'ابي جينز',
      session: EMPTY_SESSION,
      intentProvider: failingProvider(),
    })

    const retried = await respond({
      ...base,
      message: 'ابي جينز',
      session: failed.session,
      intentProvider: providerReturning(
        intent({
          requestedCategories: ['jeans'],
          requestedAnchorCategory: 'jeans',
          anchorAction: 'replace',
        }),
      ),
    })

    expect(retried.session.anchorItemId).toBe('jeans')
    expect(retried.answer.retryable).toBeUndefined()
  })
})

/* ---------------------- H · لا إطلالة عشوائية عند الجهل ---------------------- */

describe('H . ما لا يُفهَم لا يُخمَّن', () => {
  it('رسالة بلا طلب واضح لا تُنتج مرساةً من العدم', async () => {
    const reply = await respond({
      ...base,
      message: 'مممم',
      session: EMPTY_SESSION,
      intentProvider: failingProvider(),
    })

    expect(reply.session.anchorItemId).toBeNull()
    expect(reply.session.requestedSlots).toHaveLength(0)
    expect(reply.answer.looks).toHaveLength(0)
  })
})

/* --------------------------- الترجمة الدلالية --------------------------- */

describe('من دلالات النموذج إلى مفردات النطاق', () => {
  it('«dress» تصير `full` و«jeans» تصير `bottom` بشكلها', () => {
    const turn = toTurnIntent(
      intent({ requestedCategories: ['dress'], requestedAnchorCategory: 'jeans' }),
    )
    expect(turn.requestedSlots).toContain('full')
    expect(turn.requestedAnchorSlot).toBe('bottom')
    expect(turn.requestedAnchorShape).toBe('jeans')
  })

  it('الفئة المجهولة تُهمَل ولا تُخمَّن', () => {
    // «kimono» لا نعرف موضعها — وإسقاطها على `top` بناءٌ على افتراض
    const turn = toTurnIntent(intent({ requestedCategories: ['kimono', 'shoes'] }))
    expect(turn.requestedSlots).toEqual(['shoes'])
  })

  it('«find_items» تفصل البحث عن التنسيق', () => {
    expect(toTurnIntent(intent({ task: 'find_items' })).wantsFind).toBe(true)
    expect(toTurnIntent(intent({ task: 'build_outfit' })).wantsFind).toBe(false)
  })

  it('اسم الخزانة يمرّ اسمًا — والمعرّف يبقى للتطبيق', () => {
    const turn = toTurnIntent(intent({ closetRequest: { action: 'set', name: 'الصيف' } }))
    expect(turn.closetRequest).toEqual({ action: 'set', name: 'الصيف' })
  })

  it('«set» بلا اسم لا تُقبل — لا نخمّن أي خزانة قُصدت', () => {
    const turn = toTurnIntent(intent({ closetRequest: { action: 'set', name: null } }))
    expect(turn.closetRequest.action).toBe('keep')
  })
})

/* ------------------- الجملة التي تُبرّر وجود النموذج ------------------- */

describe('الجملة الطبيعية التي يعجز عنها المعجم', () => {
  const MESSAGE =
    'عندي طلعة مع صحباتي بعد المغرب وأبي شي مريح بس مرتب ومو رسمي مرة، وودي ألبس الجينز'

  it('نيّة النموذج تعطي الجينز مرساةً ومناسبةً اجتماعية', async () => {
    const provider = providerReturning(
      intent({
        task: 'build_outfit',
        isNewGoal: true,
        requestedCategories: ['jeans'],
        requestedAnchorCategory: 'jeans',
        anchorAction: 'replace',
        occasion: 'social',
        desiredStyle: ['comfortable', 'polished'],
        formality: 'smart_casual',
      }),
    )

    const reply = await respond({
      ...base,
      message: MESSAGE,
      session: EMPTY_SESSION,
      intentProvider: provider,
    })

    expect(reply.session.anchorItemId).toBe('jeans')
    expect(reply.session.occasion).toBe('casual')
    expect(reply.answer.looks.length).toBeGreaterThan(0)
  })

  it('«مو رسمي مرة» لا تُقرأ طلبًا للرسمي', () => {
    // النفي هنا سبب وجود النموذج: «رسمي» ترد في الجملة والمقصود نقيضها
    const turn = toTurnIntent(intent({ formality: 'smart_casual', occasion: 'social' }))
    expect(turn.occasion).toBe('casual')
  })
})

/* --------------------------- العدول عن الرأي --------------------------- */

describe('العدول عن الرأي عبر النموذج', () => {
  it('«لا ما ابي فستان، ابي جينز» يمسح الفستان ويثبّت الجينز', async () => {
    const provider = providerReturning(
      intent({
        task: 'build_outfit',
        isNewGoal: true,
        excludedCategories: ['dress'],
        requestedCategories: ['jeans', 'top'],
        requestedAnchorCategory: 'jeans',
        anchorAction: 'replace',
      }),
    )

    const session: StylistSession = { ...EMPTY_SESSION, anchorItemId: 'dress' }
    const reply = await respond({
      ...base,
      message: 'لا ما ابي فستان، ابي جينز بس مدري وش البس توب',
      session,
      intentProvider: provider,
    })

    expect(reply.session.anchorItemId).toBe('jeans')
    expect(reply.session.excludedSlots).toContain('full')
    const ids = reply.answer.looks.flatMap((look) => look.itemIds)
    expect(ids).not.toContain('dress')
  })
})
