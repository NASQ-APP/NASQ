/**
 * جلسة المحادثة — ما يتذكّره المساعد بين رسالة وأخرى.
 *
 * **العطل الذي تعالجه**: ما كان فيه جلسة أصلاً. المرساة كانت تُقرأ في كل رسالة
 * من `useStudio().selection` — حالة **الاستوديو** المحفوظة في التخزين. فالقطعة
 * التي فُتح بها الاستوديو تبقى مثبَّتة إلى الأبد: تقولين «لا ما أبي فستان»
 * فيُعاد قراءة الفستان من التخزين ويُقترح ثالثة.
 *
 * وهنا القاعدة: **اختيار المستخدمة من صفحة القطعة يبدأ الجلسة، ولا يحكمها.**
 * بعد أول رسالة تصير الجلسة هي المصدر، وكلامها يعدّلها.
 *
 * والتعديل يمرّ من مكان واحد — `applyIntent` — لا من المكوّنات: قاعدةٌ موزّعة
 * على أزرار تتفارق عند أول تعديل.
 */
import { slotOf } from '@/domain/outfit'
import { ALL_CLOSETS, resolveCloset, type ClosetScope } from '../closets/resolveCloset'
import type { BodySlot, Wardrobe, WardrobeItem } from '@/domain/wardrobe'
import type { TurnIntent } from '../intent/turnIntent'
import type { StylistOccasion } from '../context/stylistContext'

export type StylistSession = {
  anchorItemId: string | null
  /**
   * هل المرساة **اختيار صريح** من المستخدمة؟
   *
   * الفرق هو العطل بعينه: «نسّقي هذي القطعة» تثبيتٌ تريده، أما التقاط المحرّك
   * لفستانٍ ردًّا على «أبي فستان» فاختيارُ لحظة لا عقد. وتحويل الثاني إلى
   * مرساة يجعل كل رسالة تالية تُبنى عليه — فيرجع نفس الطقم مهما قالت.
   *
   * قيدُ الفئة (`dress`) ليس مرساةَ قطعة (`dress_12`).
   */
  anchorExplicit: boolean
  /** مواضع طلبتها صراحةً — تُبنى الإطلالة حولها */
  requestedSlots: BodySlot[]
  requestedShapes: string[]
  /** ما رفضته — يبقى مرفوضًا لبقيّة الجلسة */
  excludedSlots: BodySlot[]
  excludedColors: string[]
  excludedItemIds: string[]
  occasion: StylistOccasion | null
  /**
   * نطاق البحث — كل الخزائن أو خزانة بعينها.
   *
   * «من خزنة الصيف» **عضوية** لا وصف: تحدّد أين نبحث بمعرّف حقيقي. وخلطها
   * بـ«شي صيفي» يعطي قطعًا من خزائن أخرى ويقول إنها من الصيف.
   */
  closetScope: ClosetScope
  /** الاسم الذي قالته ولم نجد له خزانة — يُقال لها ولا يُبتلع */
  unknownClosetName?: string
  /** معرّفات آخر توصية عُرضت — أساسُ «نفسها بس…» و«عطني غيرها» */
  previousItemIds: string[]
  /**
   * بصمات ما عُرض مؤخّرًا — معرّفات مرتّبة مجموعة بفاصلة.
   *
   * تمنع تقديم الطقم نفسه على أنه خيار جديد. ومحدودة الطول عمدًا: حفظُ كل
   * تاريخ المحادثة يستنزف الخزانة الصغيرة حتى ما يبقى ما يُعرَض.
   */
  recentSignatures: string[]
}

/** بصمة توصية — معرّفات مرتّبة، فترتيب العرض لا يجعل الطقم طقمين. */
export const signatureOf = (itemIds: readonly string[]): string => itemIds.toSorted().join(',')

/** كم توصية نتذكّر قبل أن نسمح بتكرارها. */
const MEMORY = 4

export const EMPTY_SESSION: StylistSession = {
  anchorItemId: null,
  anchorExplicit: false,
  previousItemIds: [],
  recentSignatures: [],
  requestedSlots: [],
  requestedShapes: [],
  excludedSlots: [],
  excludedColors: [],
  excludedItemIds: [],
  occasion: null,
  closetScope: ALL_CLOSETS,
}

const merge = <T,>(current: T[], incoming: T[]): T[] => [...new Set([...current, ...incoming])]

/**
 * يطبّق نيّة الرسالة على الجلسة.
 *
 * **الأحدث يغلب الأقدم.** هذي هي القاعدة كلها: طلبٌ صريح الآن يتقدّم على
 * مرساة قديمة، وعلى سياق سابق، وعلى تفضيل مخزَّن. وبلا هذي القاعدة يصير
 * المساعد متمسّكًا بما فهمه أول مرة مهما قالت له.
 */
export function applyIntent(
  session: StylistSession,
  intent: TurnIntent,
  wardrobe: WardrobeItem[],
  closets: Wardrobe[] = [],
): StylistSession {
  /*
    الهدف الجديد **يستبدل** بنية الإطلالة ولا يُضاف إليها.

    «إطلالة كاجوال» تعطي [علوي، سفلي]، ثم «أبي فستان» تعطي [قطعة كاملة].
    ودمجهما — وهو ما كان يحصل — يطلب الثلاثة معًا: فستانًا فوق بنطلون. فمع
    الهدف الجديد نبدأ من طلبه وحده، ومع الصقل نراكم.
  */
  const structural = intent.isNewGoal
    ? { requestedSlots: intent.requestedSlots, requestedShapes: intent.requestedShapes }
    : {
        requestedSlots: merge(session.requestedSlots, intent.requestedSlots),
        requestedShapes: merge(session.requestedShapes, intent.requestedShapes),
      }

  const next: StylistSession = {
    ...session,
    ...structural,
    excludedSlots: merge(session.excludedSlots, intent.excludedSlots),
    excludedColors: merge(session.excludedColors, intent.excludedColors),
    occasion: intent.occasion ?? session.occasion,
    unknownClosetName: undefined,
  }

  /* ---- نطاق الخزانة ---- */
  if (intent.closetRequest.action === 'clear') {
    next.closetScope = ALL_CLOSETS
  } else if (intent.closetRequest.action === 'set') {
    const resolution = resolveCloset(intent.closetRequest.name, closets)
    if (resolution.status === 'resolved') {
      next.closetScope = resolution.scope
    } else {
      /*
        الاسم المجهول **يُقال ولا يُبتلع**.

        البحث في كل الخزانة بعد طلب خزانة بعينها يعطي جوابًا يبدو صحيحًا وهو
        عن سؤال آخر — والمستخدمة تظنّ أن قطعها في الصيف وهي في غيره.
      */
      next.unknownClosetName = intent.closetRequest.name
    }
  }

  /*
    القطعة الكاملة تُلغي العلوي والسفلي.

    فستانٌ مع بنطلون ليس خيارًا بل تناقض، والقاعدة هنا لا في المحرّك: من طلبت
    فستانًا لا تريد بنطلونًا معه.
  */
  if (next.requestedSlots.includes('full')) {
    next.requestedSlots = next.requestedSlots.filter(
      (slot) => slot !== 'top' && slot !== 'bottom',
    )
  }

  /*
    الموضع المرفوض يُنظَّف من المطلوب أيضًا.

    «أبي فستان» ثم «لا ما أبي فستان» — لو بقي في المطلوب لتصارع الطلبان
    وبقي الفستان يظهر. والأحدث يغلب.
  */
  next.requestedSlots = next.requestedSlots.filter((slot) => !next.excludedSlots.includes(slot))

  if (intent.anchorAction === 'clear') {
    next.anchorItemId = null
    next.anchorExplicit = false
  }

  if (intent.anchorAction === 'replace' && intent.requestedAnchorSlot) {
    // تسمية القطعة التي تُبنى حولها («خلي الجينز») تثبيتٌ صريح
    next.anchorItemId = pickAnchor(wardrobe, intent, next)?.id ?? null
    next.anchorExplicit = Boolean(next.anchorItemId)
  }

  /*
    طلبُ البديل يحرّر ما التقطه المحرّك، ويُبقي ما ثبّتته هي.

    «عطني تنسيق ثاني» بعد فستانٍ اختاره المحرّك يعني: ابحثي من جديد. وبعد
    فستانٍ ثبّتته هي يعني: نفس الفستان بتوليفة أخرى. والفرق كله في من اختار.
  */
  if (
    (intent.variation === 'alternative' || intent.variation === 'replace_all') &&
    !next.anchorExplicit
  ) {
    next.anchorItemId = null
  }

  /*
    والمرساة تسقط إن صارت مرفوضة — ولو لم يُطلب إسقاطها صراحةً.

    «بدون فستان» والمرساة فستان: النيّة لم تقل «امسحي المرساة»، لكن إبقاءها
    يناقض ما قالته حرفيًا.
  */
  if (next.anchorItemId) {
    const anchor = wardrobe.find((item) => item.id === next.anchorItemId)
    if (anchor && violatesSession(anchor, next)) next.anchorItemId = null
  }

  return next
}

/**
 * يسجّل ما عُرض — فلا يُقدَّم مرة أخرى على أنه جديد.
 *
 * الذاكرة محدودة عمدًا: خزانةٌ فيها فستانان لا تحتمل استبعادًا أبديًّا، فبعد
 * أربع توصيات يُسمح بالعودة. الأدب أن نقول «هذا أقرب ما عندك» لا أن نصمت.
 */
export function rememberRecommendation(
  session: StylistSession,
  itemIds: string[],
): StylistSession {
  if (itemIds.length === 0) return session

  const signature = signatureOf(itemIds)
  return {
    ...session,
    previousItemIds: itemIds,
    recentSignatures: [signature, ...session.recentSignatures.filter((s) => s !== signature)].slice(
      0,
      MEMORY,
    ),
  }
}

/** يختار مرساة من الخزانة تطابق ما طُلب — ولا يخترع. */
export function pickAnchor(
  wardrobe: WardrobeItem[],
  intent: TurnIntent,
  session: StylistSession,
): WardrobeItem | undefined {
  const slot = intent.requestedAnchorSlot
  if (!slot) return undefined

  const candidates = wardrobe.filter(
    (item) => !session.excludedItemIds.includes(item.id) && !violatesSession(item, session),
  )

  /*
    الشكل أدقّ من الموضع — **والموضع يكفي حين لا شكل**.

    كانت المطابقة على الشكل وحده، فطلبٌ بلا شكل مميّز («نسّقي لي هذا الفستان»)
    يقارن `item.shape === undefined` فلا يطابق شيئًا أبدًا. فكل تثبيت لفئة بلا
    شكل — فستان، توب، شنطة — كان يفشل صامتًا ويُقرأ «ما لقيت».
  */
  if (intent.requestedAnchorShape) {
    const byShape = candidates.find((item) => item.shape === intent.requestedAnchorShape)
    if (byShape) return byShape
  }

  return candidates.find((item) => slotOf(item) === slot)
}

/** هل تخالف القطعة ما استقرّت عليه الجلسة؟ */
export function violatesSession(item: WardrobeItem, session: StylistSession): boolean {
  if (session.excludedItemIds.includes(item.id)) return true
  if (session.excludedColors.includes(item.colorName)) return true
  return session.excludedSlots.includes(slotOf(item))
}
