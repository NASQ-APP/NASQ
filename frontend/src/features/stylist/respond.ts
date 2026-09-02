/**
 * الردّ — من رسالة إلى جواب، عبر الجلسة.
 *
 * المسار **معكوس عمّا كان**:
 *
 *     كان:   مرساة → محرّك → (ثم محاولة فهم الرسالة، ولم تكن)
 *     صار:   رسالة → نيّة → جلسة → وضع التنسيق → محرّك
 *
 * والفرق ليس ترتيبًا: في الأول تحكم حالةٌ قديمة كل ما يأتي بعدها، وفي الثاني
 * يحكم أحدث ما قالته.
 */
import { slotOf } from '@/domain/outfit'
import { buildStylistContext } from './context/stylistContext'
import {
  semanticContextOf,
  toTurnIntent,
  type StylistIntentProvider,
} from './intent/provider'
import {
  applyIntent,
  rememberRecommendation,
  signatureOf,
  violatesSession,
  type StylistSession,
} from './session/session'
import { buildOutfits } from './recommendations/stylistEngine'
import { colorAdviceForHex } from './recommendations/colorAdvice'
import { scoreColorHarmony } from './colors/colorHarmony'
import { unenforceable } from './scoring/constraints'
import { styleAroundItem, type RichAnswer, type RichLook } from './answer'
import { AVOID_RULES, type DeclaredStyle, type UserStyleProfile } from '@/domain/style/types'
import { ITEM_COLORS, resolveColorName } from '@/domain/wardrobe'
import { readColor } from './colors/colorSpace'
import type { BodySlot, Wardrobe, WardrobeItem } from '@/domain/wardrobe'

export type StylistReply = {
  answer: RichAnswer
  session: StylistSession
  /** القطعة المثبَّتة الآن — تُعرض في الواجهة ويمكن نزعها */
  anchor?: WardrobeItem
  /** قطع معروضة للاختيار — بحثٌ لا إطلالة */
  found?: WardrobeItem[]
}

/** أسماء لوحتنا — ما خرج عنها لون غير معروف لا لون مختلف. */
const ITEM_COLOR_NAMES = new Set(ITEM_COLORS.map((color) => color.name))

const SLOT_NAME: Record<BodySlot, string> = {
  top: 'توب',
  bottom: 'قطعة سفلية',
  full: 'فستان',
  outer: 'جاكيت',
  shoes: 'حذاء',
  bag: 'شنطة',
  accessory: 'إكسسوار',
}

const SHAPE_NAME: Record<string, string> = {
  jeans: 'جينز',
  pants: 'بنطلون',
  skirt: 'تنورة',
  shorts: 'شورت',
}

/**
 * ترشيح قطع لموضع واحد — لا إطلالة كاملة.
 *
 * «مدري وش ألبس توب» سؤالٌ عن التوب. إكمال الإطلالة بحذاء وشنطة لم تُطلَب
 * يدفن الجواب في ما لم يُسأل عنه.
 */
function partialLooks(
  anchor: WardrobeItem,
  slot: BodySlot,
  wardrobe: WardrobeItem[],
  session: StylistSession,
): RichLook[] {
  return wardrobe
    .filter((item) => slotOf(item) === slot && item.id !== anchor.id)
    .filter((item) => !violatesSession(item, session))
    .map((item) => ({ item, verdict: scoreColorHarmony(anchor.colorHex, item.colorHex) }))
    .toSorted((a, b) => b.verdict.score - a.verdict.score)
    .slice(0, 3)
    .map(({ item, verdict }) => ({
      title: item.name,
      reason: verdict.explanation,
      itemIds: [anchor.id, item.id],
      palette: {
        dominant: anchor.colorHex,
        secondary: item.colorHex,
        strategy: verdict.relation,
        relation: verdict.relation,
        names: [anchor.colorName, item.colorName],
      },
    }))
}

/** إطلالة المحرّك إلى بطاقة — تسميةٌ واحدة لا تتفارق بين الفروع. */
const toLook = (outfit: { tone: string; why: string; itemIds: string[]; palette?: RichLook['palette'] }): RichLook => ({
  title:
    outfit.tone === 'safe' ? 'الخيار الآمن' : outfit.tone === 'taste' ? 'الأقرب لذوقك' : 'خيار أجرأ',
  reason: outfit.why,
  itemIds: outfit.itemIds,
  palette: outfit.palette,
})

const unenforcedNoteOf = (declared: DeclaredStyle): string | undefined => {
  const missing = unenforceable(declared.avoid)
  return missing.length > 0
    ? `ما نقدر نفحص ${missing
        .map((rule) => AVOID_RULES.find((entry) => entry.id === rule)?.name ?? rule)
        .join(' و')} — ما عندنا هذي التفاصيل في القطع.`
    : undefined
}

/**
 * جوابُ التعذُّر — **صريح، ولا يخترع إطلالة**.
 *
 * كان تعذُّر الفهم يسقط على محلّل معجمي يجيب بكلمات مفتاحية، فتظنّ المستخدمة
 * أنها تكلّم مساعدةً تفهمها بينما يردّ عليها نظامٌ آخر. وهذا أسوأ من الصمت:
 * جوابٌ واثق عن سؤال لم يُفهَم.
 *
 * والجلسة تبقى كما هي — إعادة المحاولة تكمل من حيث وقفت لا من الصفر.
 */
const understandingFailed = (session: StylistSession, anchor?: WardrobeItem): StylistReply => ({
  session,
  anchor,
  answer: {
    message: 'ما قدرت أفهم طلبك الآن، جرّبي مرة ثانية.',
    looks: [],
    pieces: [],
    retryable: true,
  },
})

export async function respond(input: {
  message: string
  session: StylistSession
  wardrobe: WardrobeItem[]
  closets?: Wardrobe[]
  declared: DeclaredStyle
  observed: UserStyleProfile
  /** يُحقن في الاختبار؛ الإنتاج يمرّر مزوّد الخادم */
  intentProvider?: StylistIntentProvider
}): Promise<StylistReply> {
  const previousAnchor = input.wardrobe.find((item) => item.id === input.session.anchorItemId)

  const OUT_OF_SCOPE =
    'هذا خارج نطاق نَسَق، لكن أقدر أساعدك في خزانتك وتنسيق إطلالاتك. اسأليني عن لبسك، ألوانك أو قطع خزانتك.'

  /*
    الفهم **يشترط النموذج**.

    بلا مزوّد، أو حين يتعذّر الفهم، نقولها ولا نجيب. المساعدة تَعِد بأنها تفهم
    الكلام، والوفاء بالوعد أو الاعتذار عنه — لا الإجابة بغيره.
  */
  if (!input.intentProvider) return understandingFailed(input.session, previousAnchor)

  const semantic = await input.intentProvider.extract({
    message: input.message,
    context: semanticContextOf(input.session, previousAnchor?.name),
  })
  if (!semantic) return understandingFailed(input.session, previousAnchor)

  const intent = toTurnIntent(semantic)

  /*
    خارج النطاق: نردّ ولا نمسّ شيئًا.

    **الجلسة تُعاد كما جاءت** — لا `applyIntent` ولا بحث في الخزانة ولا مرساة
    تُمحى. فسؤالٌ عابر عن شيء آخر لا يهدم إطلالةً كانت تُبنى، والدور الذي بعده
    يكمل من حيث وقفت.
  */
  if (intent.outOfScope) {
    return {
      session: input.session,
      anchor: previousAnchor,
      answer: { message: OUT_OF_SCOPE, looks: [], pieces: [] },
    }
  }

  /*
    الغموض يُسأل عنه ولا يُخمَّن.

    «طيب فيه بنزين؟» قد تعني البيج وقد تعني غيره، وبناءُ إطلالة على الظنّ يعطي
    جوابًا واثقًا عن سؤال لم يُفهَم. والسؤال القصير أصدق — والجلسة تبقى كما هي
    حتى تتّضح.
  */
  if (intent.clarification) {
    return {
      session: input.session,
      anchor: previousAnchor,
      answer: { message: intent.clarification, looks: [], pieces: [] },
    }
  }
  const session = applyIntent(input.session, intent, input.wardrobe, input.closets ?? [])
  const anchor = input.wardrobe.find((item) => item.id === session.anchorItemId)
  const unenforcedNote = unenforcedNoteOf(input.declared)

  /*
    اسمُ خزانة لم نعرفه يوقف كل شيء.

    المتابعة في كل الخزانة تعطيها قطعًا من حيث لم تطلب، وتبدو صحيحة فلا
    تراجعها. والسؤال أصدق من جوابٍ عن غيره.
  */
  if (session.unknownClosetName) {
    const names = (input.closets ?? []).map((closet) => closet.name)
    return {
      session,
      anchor,
      answer: {
        message: `ما لقيت خزانة باسم «${session.unknownClosetName}».`,
        looks: [],
        pieces: [],
        gap: names.length ? `خزائنك: ${names.join('، ')}.` : undefined,
        unenforcedNote,
      },
    }
  }

  /*
    **النطاق قبل التسجيل.** لو رتّبنا كل الخزانة بالانسجام ثم صفّينا، لاخترنا
    أفضل فستان في الخزانة كلها وقلنا إنه من الصيف.
  */
  const scoped =
    session.closetScope.type === 'closet'
      ? input.wardrobe.filter((item) => item.wardrobeId === session.closetScope.closetId)
      : input.wardrobe

  const pool = scoped.filter((item) => !violatesSession(item, session))
  const scopeLabel = session.closetScope.closetName
    ? ` في خزانة ${session.closetScope.closetName}`
    : ''

  /* ---- سؤال عن الألوان ---- */
  if (intent.wantsColorAdvice) {
    /*
      النصيحة اللونية **نظريةٌ لا مخزون**.

      كانت تشترط قطعةً في الخزانة، فسؤالٌ عن «لون كعب يليق مع فستان أحمر»
      يفشل لأن الحذاء غير مسجَّل — ويُردّ بـ«ما لقيت حذاء»، جوابًا عن سؤال لم
      يُسأل. الآن اللون يكفي: من القطعة المثبَّتة إن وُجدت، أو من اسمٍ ذكرته.
    */
    const named = intent.requestedColors.map(resolveColorName).find(Boolean)

    const baseHex = anchor?.colorHex ?? named?.color.hex
    const baseName = anchor?.name ?? named?.color.name

    /*
      القريب يُقال قريبًا.

      «أحمر» ليس «عنّابي»، وردّه إليه بلا تنبيه يجعل الجواب يبدو عن سؤال آخر.
      فنسمّي ما استندنا إليه، وتعرف هي أننا لم نجد لونها بالضبط.
    */
    const nearNote =
      !anchor && named?.relation === 'family'
        ? ` (ما عندنا «${intent.requestedColors[0]}» بالضبط في لوحتنا، والأقرب «${named.color.name}»)`
        : ''

    if (!baseHex) {
      return {
        session,
        anchor,
        answer: {
          message: 'أي قطعة تقصدين؟ قولي لونها أو اختاريها من خزانتك وأقول لك وش يليق معها.',
          looks: [],
          pieces: [],
          unenforcedNote,
        },
      }
    }

    const advice = colorAdviceForHex(baseHex, pool, 6, anchor?.id)
    const top = advice.slice(0, 4)

    /*
      طبقتان مفصولتان: **ما يليق** ثم **ما عندك منه**.

      دمجهما يجعل النصيحة تبدو وعدًا بقطعة، فتبحث المستخدمة عمّا ليس عندها.
      والفصل يبقي النصيحة نافعة ولو خلت الخزانة.
    */
    const slot = intent.adviceSlot
    const families = new Set(top.map((entry) => entry.name))
    const matches = pool.filter(
      (item) =>
        item.id !== anchor?.id &&
        (!slot || slotOf(item) === slot) &&
        families.has(item.colorName),
    )

    const label = slot ? SLOT_NAME[slot] : 'قطعة'

    /** قطعٌ في الموضع المطلوب لكن لونها غير معروف — لا تُطابَق ولا تُنكَر. */
    const unknownInSlot = pool.filter(
      (item) =>
        item.id !== anchor?.id &&
        (!slot || slotOf(item) === slot) &&
        !ITEM_COLOR_NAMES.has(item.colorName),
    ).length
    const lines = [
      `مع ${baseName ? `«${baseName}»` : 'هذا اللون'}${nearNote}، أنسب الألوان: ${top
        .map((entry) => entry.name)
        .join('، ')}.`,
      matches.length > 0
        ? `وعندك ${matches.length} ${label} بهذي الألوان:`
        : /*
            «ما عندك» و«ما نعرف لونه» ليسا واحدًا.

            القطعة التي لونها «غير محدد» تسقط من كل مطابقة لونية — فتُقال
            «ما عندك حذاء» لمن عندها حذاء فعلاً. والفرق بيدها: تعرف أن تكمل
            بياناته بدل أن تظنّ خزانتها ناقصة.
          */
          unknownInSlot > 0
          ? `وعندك ${unknownInSlot} ${label} بلون غير محدَّد — حدّدي لونه وأقدر أطابقه.`
          : `وما عندك ${label} بهذي الألوان في خزانتك حاليًا.`,
    ]

    return {
      session,
      anchor,
      found: matches.length > 0 ? matches : undefined,
      answer: {
        message: lines.join(' '),
        // القطع الحقيقية وحدها تُعرض بطاقاتٍ — والنصيحة تبقى نصًّا
        looks: matches.slice(0, 4).map((item) => ({
          title: item.name,
          reason: item.colorName,
          itemIds: [item.id],
        })),
        pieces: [],
        unenforcedNote,
      },
    }
  }

  /* ---- بحثٌ عن قطعة، لا بناءُ إطلالة ---- */
  if (intent.wantsFind && session.requestedSlots.length > 0) {
    const wanted = session.requestedSlots
    const inSlot = pool.filter((item) => wanted.includes(slotOf(item)))
    const label = SLOT_NAME[wanted[0]]

    /*
      اللون المطلوب **قيدٌ صلب** لا وزنٌ في الترتيب.

      «فستان أحمر» كانت ترجع أربعة فساتين فيها الأسود والأبيض — لأن اللون لم
      يكن يُصفّي أصلاً. وفستانٌ أسود مهما علا وزنه ليس جوابًا عن «أحمر».

      وثلاث مراتب: المطابق، ثم القريب من عائلته مع تصريح، ثم لا شيء. والصمت
      عن المرتبة يجعل العنّابي يبدو أحمر.
    */
    const askedFor = intent.requestedColors.map(resolveColorName).find(Boolean)
    const exact = askedFor
      ? inSlot.filter((item) => item.colorName === askedFor.color.name)
      : inSlot

    const nearOnly = Boolean(askedFor) && exact.length === 0
    const found = nearOnly
      ? inSlot.filter(
          (item) => readColor(item.colorHex).family === readColor(askedFor!.color.hex).family,
        )
      : exact

    /** تصريحٌ حين لا نعطيها ما طلبته حرفيًّا. */
    const colorNote = !askedFor
      ? ''
      : nearOnly && found.length > 0
        ? `ما لقيت ${label} بلون «${intent.requestedColors[0]}» بالضبط، لكن هذا الأقرب: `
        : askedFor.relation === 'family'
          ? `«${intent.requestedColors[0]}» ما هو في لوحتنا، وأقرب لون عندنا «${askedFor.color.name}». `
          : ''

    if (found.length === 0) {
      return {
        session,
        anchor,
        answer: {
          message: askedFor
            ? `ما لقيت ${label} بلون «${intent.requestedColors[0]}»${scopeLabel}.`
            : `ما لقيت ${label}${scopeLabel}.`,
          looks: [],
          pieces: [],
          gap:
            session.closetScope.type === 'closet'
              ? 'تبين أشوف في باقي خزائنك؟'
              : undefined,
          unenforcedNote,
        },
      }
    }

    /*
      العدد يُقال كما هو — قطعة واحدة تُقال واحدة.

      اختراع ثلاثة خيارات من قطعة واحدة يوهم بسعةٍ ليست عندها.
    */
    return {
      session,
      anchor,
      found,
      answer: {
        message:
          colorNote +
          (found.length === 1
            ? `${colorNote ? '' : 'لقيت '}هذا ${label}${scopeLabel}.`
            : `لقيت لك ${found.length} ${label}${scopeLabel}:`),
        looks: found.slice(0, 6).map((item) => ({
          title: item.name,
          reason: item.colorName,
          itemIds: [item.id],
        })),
        pieces: [],
        gap: 'قولي «نسّقي الأول» وأبني إطلالة حوله.',
        unenforcedNote,
      },
    }
  }

  /*
    طلبت مرساةً غير موجودة — يُقال بصراحة **ولا يُرجَع للقديمة**.

    الرجوع للفستان بعد طلب الجينز هو العطل الأصلي بعينه: تظنّ أن طلبها فُهم
    ورُفض، والحقيقة أنه لم يُقرأ.
  */
  if (intent.requestedAnchorSlot && !anchor) {
    const wanted =
      (intent.requestedAnchorShape && SHAPE_NAME[intent.requestedAnchorShape]) ??
      SLOT_NAME[intent.requestedAnchorSlot]
    return {
      session: { ...session, anchorItemId: null },
      answer: {
        message: `ما لقيت ${wanted} في خزانتك.`,
        looks: [],
        pieces: [],
        gap: 'اختاري قطعة ثانية من خزانتك ونبني حولها.',
        unenforcedNote,
      },
    }
  }

  /*
    طلبت فئة للتنسيق بلا مرساة — نختار أفضل قطعة منها **من داخل النطاق**.

    «نسّقي لي فستان من خزنة الصيف»: الفستان يصير الأساس ثم نبني حوله. وبلا
    هذا الفرع كان الطلب يسقط إلى بناء إطلالة عامة تتجاهل الفئة كليًا — وهو
    سبب رجوع نفس خيارات الكاجوال.
  */
  if (!anchor && session.requestedSlots.length > 0 && !intent.wantsColorAdvice) {
    const wanted = session.requestedSlots[0]
    const candidates = pool.filter((item) => slotOf(item) === wanted)

    if (candidates.length === 0) {
      return {
        session,
        answer: {
          message: `ما لقيت ${SLOT_NAME[wanted]}${scopeLabel}.`,
          looks: [],
          pieces: [],
          gap:
            session.closetScope.type === 'closet'
              ? 'تبين أشوف في باقي خزائنك؟'
              : 'اختاري قطعة ثانية ونبني حولها.',
          unenforcedNote,
        },
      }
    }

    /*
      **قيدُ الفئة ليس مرساةَ قطعة.**

      كان أفضل مرشّح يُثبَّت مرساةً (`anchorItemId: picked.id`)، فتصير كل رسالة
      تالية بناءً حوله — ويرجع نفس الطقم مهما طلبت غيره. وهذا هو العطل الذي
      رأته: ثلاث رسائل، وثلاث مرات نفس الفستان ونفس الحذاء.

      الآن الفئة تبقى قيدًا، والقطعة تُعاد ترتيبها من الخزانة كل مرة — فيتبدّل
      الاختيار مع تبدّل السياق (مناسبة، رسمية، لون مستبعَد).
    */
    const outfits = buildOutfits(
      buildStylistContext({
        declared: input.declared,
        observed: input.observed,
        wardrobe: pool,
        occasion: session.occasion ?? undefined,
      }),
      3,
      intent.variation === 'none' ? [] : session.recentSignatures,
    ).filter((outfit) => outfit.itemIds.some((id) => candidates.some((item) => item.id === id)))

    if (outfits.length > 0) {
      const best = outfits[0]
      const repeated = session.recentSignatures.includes(signatureOf(best.itemIds))

      return {
        session: rememberRecommendation(session, best.itemIds),
        answer: {
          message: repeated
            ? 'هذا أقرب خيار مختلف عندك حاليًا.'
            : `من خزانتك، هذي ${outfits.length === 1 ? 'إطلالة' : 'إطلالات'} بـ${SLOT_NAME[wanted]}:`,
          looks: outfits.map(toLook),
          pieces: [],
          unenforcedNote,
        },
      }
    }

    // ما اكتملت إطلالة حول الفئة — نبني على أفضل مرشّح بلا تثبيته مرساةً
    const picked = candidates[0]
    const answer = styleAroundItem({
      anchor: picked,
      wardrobe: pool,
      declared: input.declared,
      observed: input.observed,
      occasion: session.occasion ?? undefined,
    })
    return {
      session: rememberRecommendation(session, [picked.id]),
      answer: { ...answer, unenforcedNote },
    }
  }

  /* ---- سؤال عن موضع واحد مع مرساة ---- */
  const partialSlot = intent.requestedSlots.find(
    (slot) => anchor && slot !== slotOf(anchor),
  )
  if (anchor && partialSlot && intent.requestedSlots.length <= 2) {
    const looks = partialLooks(anchor, partialSlot, pool, session)
    return {
      session,
      anchor,
      answer: {
        message: looks.length
          ? `خلّينا «${anchor.name}» الأساس. أفضل ${SLOT_NAME[partialSlot]} يضبط معه:`
          : `ما لقيت ${SLOT_NAME[partialSlot]} يضبط مع «${anchor.name}» في خزانتك.`,
        looks,
        pieces: [],
        gap: looks.length ? undefined : `جرّبي تضيفين ${SLOT_NAME[partialSlot]}.`,
        unenforcedNote,
      },
    }
  }

  /* ---- التنسيق حول المرساة ---- */
  if (anchor) {
    const answer = styleAroundItem({
      anchor,
      wardrobe: pool,
      declared: input.declared,
      observed: input.observed,
      occasion: session.occasion ?? undefined,
    })
    return { session, anchor, answer: { ...answer, unenforcedNote } }
  }

  /* ---- إطلالة كاملة بلا مرساة ---- */
  const context = buildStylistContext({
    declared: input.declared,
    observed: input.observed,
    wardrobe: pool,
    occasion: session.occasion ?? undefined,
  })

  const outfits = buildOutfits(
    context,
    3,
    intent.variation === 'none' ? [] : session.recentSignatures,
  )
  if (outfits.length > 0) {
    const best = outfits[0]
    const repeated = session.recentSignatures.includes(signatureOf(best.itemIds))

    return {
      session: rememberRecommendation(session, best.itemIds),
      answer: {
        message: repeated
          ? 'هذا أقرب خيار مختلف عندك حاليًا.'
          : 'من خزانتك، هذي إطلالات:',
        looks: outfits.map(toLook),
        pieces: [],
        unenforcedNote,
      },
    }
  }

  /*
    ما عندها ما يُنسَّق — يُقال، ولا يُبنى شيء من لا شيء.

    كان هنا سقوطٌ إلى المنطق النصّي القديم؛ وقد ذهب معه: مساعدةٌ تعِد بالفهم
    لا يصحّ أن تجيب بنظام آخر حين تعجز.
  */
  return {
    session,
    answer: {
      message: 'ما لقيت في خزانتك ما أبني منه إطلالة كاملة.',
      looks: [],
      pieces: [],
      gap: 'أضيفي كم قطعة وأقدر أنسّق لك منها.',
      unenforcedNote,
    },
  }
}
