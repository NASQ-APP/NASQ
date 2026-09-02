/**
 * من يفهم الكلام — عقدٌ واحد، وتنفيذان.
 *
 * الواجهة لا تعرف OpenAI ولا مفتاحه ولا نموذجه. تعرف أنها ترسل رسالةً وسياقًا
 * وتستقبل نيّة. وهذا ما يجعل تبديل النموذج لاحقًا تغييرًا في ملف واحد لا في
 * المساعِدة كلها.
 *
 * ولهذا الفصل ثمرة ثانية: الاختبارات تحقن مزوّدًا مزيّفًا، فتفحص المسار كاملاً
 * بلا دولار واحد على OpenAI.
 */
import type { StylistSession } from '../session/session'
import type { TurnIntent } from './turnIntent'

/** ما يصل النموذج — أسماء عرض وفئات، لا معرّفات ولا صور. */
export type StylistSemanticContext = {
  anchorName?: string
  anchorCategory?: string
  closetName?: string
  requestedCategories?: string[]
  excludedCategories?: string[]
  excludedColors?: string[]
  occasion?: string
  formality?: string
  lastRecommendation?: string
}

/** النيّة كما يرجّعها النموذج — دلالات لا معرّفات. */
export type SemanticIntent = {
  task:
    | 'build_outfit'
    | 'find_items'
    | 'style_around_item'
    | 'refine_outfit'
    | 'replace_item'
    | 'remove_item'
    | 'color_advice'
    | 'compare_items'
    | 'clarify'
    | 'out_of_scope'
  isNewGoal: boolean
  requestedCategories: string[]
  excludedCategories: string[]
  requestedColors: string[]
  excludedColors: string[]
  closetRequest: { action: 'keep' | 'set' | 'clear'; name: string | null }
  anchorAction: 'keep' | 'replace' | 'clear'
  requestedAnchorCategory: string | null
  occasion: string | null
  desiredStyle: string[]
  formality: 'casual' | 'smart_casual' | 'formal' | null
  variation: 'none' | 'alternative' | 'replace_all' | 'refine'
  requestedChanges: { action: 'add' | 'remove' | 'replace'; category: string | null; description: string | null }[]
  needsClarification: boolean
  clarificationQuestion: string | null
}

export interface StylistIntentProvider {
  /** يرجّع النيّة، أو `undefined` حين يتعذّر الفهم — فيتولّى الاحتياطي. */
  extract(input: {
    message: string
    context: StylistSemanticContext
  }): Promise<SemanticIntent | undefined>
}

/** يبني السياق المضغوط من الجلسة — بلا خزانة ولا معرّفات. */
export function semanticContextOf(
  session: StylistSession,
  anchorName?: string,
  anchorCategory?: string,
  lastRecommendation?: string,
): StylistSemanticContext {
  return {
    anchorName,
    anchorCategory,
    closetName: session.closetScope.closetName,
    requestedCategories: session.requestedSlots,
    excludedCategories: session.excludedSlots,
    excludedColors: session.excludedColors,
    occasion: session.occasion ?? undefined,
    lastRecommendation,
  }
}

/* ------------------- من الدلالات إلى مفردات النطاق ------------------- */

import type { BodySlot } from '@/domain/wardrobe'
import { EMPTY_TURN_INTENT } from './turnIntent'

/**
 * كلمات النموذج إلى مواضع الجسم عندنا.
 *
 * النموذج يرجّع «dress» و«jeans»، والنطاق يعرف `full` و`bottom`. والترجمة هنا
 * لا في النموذج: قائمةٌ في برومبت تتفارق عن الشيفرة عند أول تعديل، والقائمة
 * في الشيفرة يحرسها المصرّف.
 */
const CATEGORY_SLOT: Record<string, { slot: BodySlot; shape?: string }> = {
  dress: { slot: 'full' },
  gown: { slot: 'full' },
  jumpsuit: { slot: 'full' },
  abaya: { slot: 'full' },
  top: { slot: 'top' },
  blouse: { slot: 'top' },
  shirt: { slot: 'top' },
  tshirt: { slot: 'top' },
  knit: { slot: 'top' },
  bottom: { slot: 'bottom' },
  jeans: { slot: 'bottom', shape: 'jeans' },
  pants: { slot: 'bottom', shape: 'pants' },
  trousers: { slot: 'bottom', shape: 'pants' },
  skirt: { slot: 'bottom', shape: 'skirt' },
  shorts: { slot: 'bottom', shape: 'shorts' },
  outer: { slot: 'outer' },
  jacket: { slot: 'outer' },
  blazer: { slot: 'outer' },
  coat: { slot: 'outer' },
  shoes: { slot: 'shoes' },
  /* أشكال الحذاء تُذكر بأسمائها: «بدون كعب» تمنع الكعب لا كل حذاء */
  heels: { slot: 'shoes', shape: 'heels' },
  sneakers: { slot: 'shoes', shape: 'sneakers' },
  flats: { slot: 'shoes', shape: 'flats' },
  boots: { slot: 'shoes', shape: 'boots' },
  sandals: { slot: 'shoes', shape: 'sandals' },
  bag: { slot: 'bag' },
  accessory: { slot: 'accessory' },
}

const slotOfCategory = (name: string) => CATEGORY_SLOT[name.trim().toLowerCase()]

/**
 * مواضع التغيير المطلوب — «غيّري الحذاء» تعطي `shoes` في `replaceSlots`.
 *
 * والفئة المجهولة تُهمَل هنا أيضًا: تبديلُ ما لا نعرف موضعه يمسّ قطعة لم
 * تُقصَد.
 */
const slotsOfChanges = (
  changes: SemanticIntent['requestedChanges'],
  which: 'keep' | 'replace',
): BodySlot[] => {
  const wanted = which === 'replace' ? ['replace', 'remove'] : ['add']
  const slots: BodySlot[] = []
  for (const change of changes) {
    if (!wanted.includes(change.action) || !change.category) continue
    const mapped = slotOfCategory(change.category)
    if (mapped && !slots.includes(mapped.slot)) slots.push(mapped.slot)
  }
  return slots
}

const OCCASIONS: Record<string, TurnIntent['occasion']> = {
  work: 'work',
  office: 'work',
  formal: 'work',
  evening: 'evening',
  dinner: 'evening',
  wedding: 'evening',
  party: 'evening',
  casual: 'casual',
  social: 'casual',
  outing: 'casual',
  coffee: 'casual',
  travel: 'travel',
}

/**
 * يترجم نيّة النموذج إلى النيّة التي يفهمها المحرّك.
 *
 * الفئة المجهولة **تُهمَل ولا تُخمَّن**: «kimono» لا نعرف موضعها، وإسقاطها على
 * `top` يبني إطلالة على افتراض لم يقله أحد.
 */
/**
 * هل يحمل الدور ما يكفي للتنفيذ؟
 *
 * أي إشارة صريحة تغيّر النتيجة: طلب بديل، أو لون، أو فئة، أو مناسبة، أو درجة
 * رسمية. وجودُ واحدة منها يعني أن السؤال عن المقصود صار سؤالًا عمّا نعرفه.
 */
function actionable(semantic: SemanticIntent): boolean {
  return (
    semantic.variation !== 'none' ||
    semantic.requestedCategories.length > 0 ||
    semantic.excludedCategories.length > 0 ||
    semantic.requestedColors.length > 0 ||
    semantic.excludedColors.length > 0 ||
    Boolean(semantic.occasion) ||
    Boolean(semantic.formality)
  )
}

export function toTurnIntent(semantic: SemanticIntent): TurnIntent {
  const requestedSlots: BodySlot[] = []
  const requestedShapes: string[] = []
  let anchorSlot: BodySlot | undefined
  let anchorShape: string | undefined

  /*
    فئة السؤال اللوني **موضوعُ سؤال لا قيدُ إطلالة**.

    «وش لون كعب يليق مع فستان أحمر» تذكر `shoes`، وكانت تُكتب في قيود الجلسة.
    فتبقى بعد انتهاء السؤال، وتُقرأ في الدور التالي طلبًا لحذاء — فتُجاب
    «طلّعي لي فستاني الأحمر» بـ«ما لقيت حذاء». حالةٌ عابرة تسرّبت فصارت قيدًا.

    الآن تذهب إلى `adviceSlot` وحده، وتموت بموت الدور.
  */
  const structural = semantic.task === 'color_advice' || semantic.task === 'compare_items'

  if (!structural) {
    for (const name of semantic.requestedCategories) {
      const mapped = slotOfCategory(name)
      if (!mapped) continue
      if (!requestedSlots.includes(mapped.slot)) requestedSlots.push(mapped.slot)
      if (mapped.shape && !requestedShapes.includes(mapped.shape)) {
        requestedShapes.push(mapped.shape)
      }
    }
  }

  /*
    الكلمة المستبعَدة: شكلٌ أم موضع؟

    «بدون كعب» تسمّي شكلًا داخل موضع، فاستبعاد الموضع كلّه يخفي المسطّح
    والسنيكر معه. و«بدون فستان» تسمّي الموضع نفسه، فيُستبعد كاملاً. والفرق
    مقروء من الخريطة: ما له `shape` شكلٌ، وما ليس له موضع.
  */
  const excludedSlots: BodySlot[] = []
  const excludedShapes: string[] = []
  for (const name of semantic.excludedCategories) {
    const mapped = slotOfCategory(name)
    if (!mapped) continue
    if (mapped.shape) {
      if (!excludedShapes.includes(mapped.shape)) excludedShapes.push(mapped.shape)
    } else if (!excludedSlots.includes(mapped.slot)) {
      excludedSlots.push(mapped.slot)
    }
  }
  const anchorMapped = semantic.requestedAnchorCategory
    ? slotOfCategory(semantic.requestedAnchorCategory)
    : undefined
  if (anchorMapped) {
    anchorSlot = anchorMapped.slot
    anchorShape = anchorMapped.shape
  } else if (requestedSlots.length > 0 && semantic.anchorAction === 'replace') {
    anchorSlot = requestedSlots[0]
    anchorShape = requestedShapes[0]
  }

  const occasion = semantic.occasion
    ? OCCASIONS[semantic.occasion.trim().toLowerCase()]
    : undefined

  return {
    ...EMPTY_TURN_INTENT,
    requestedSlots,
    requestedShapes,
    excludedSlots,
    excludedShapes,
    excludedColors: semantic.excludedColors,
    requestedColors: semantic.requestedColors,
    /*
      الفئة المذكورة في سؤال لوني هي **موضوع السؤال** لا قيدَ إطلالة.

      «وش لون كعب يليق» تسأل عن الحذاء؛ ومعاملتها طلبَ حذاء تجعل الجواب
      «ما لقيت حذاء في خزانتك» — ردًّا على سؤال لم يُسأل.
    */
    adviceSlot:
      semantic.task === 'color_advice' || semantic.task === 'compare_items'
        ? semantic.requestedCategories.map(slotOfCategory).find(Boolean)?.slot
        : undefined,
    anchorAction: semantic.anchorAction,
    requestedAnchorSlot: anchorSlot,
    requestedAnchorShape: anchorShape,
    occasion,
    wantsFind: semantic.task === 'find_items',
    outOfScope: semantic.task === 'out_of_scope',
    /*
      الاستيضاح **حين لا نملك ما ننفّذه**، لا كلما سأل النموذج.

      كان يكفي `needsClarification` لإيقاف الدور، فتقول «أبي اقتراح ثاني
      مختلف» ويصلنا معها `variation: 'alternative'` — أي أن المطلوب مفهوم
      تمامًا — ومع ذلك نردّ بسؤال بدل الإطلالة. والمستخدمة كرّرت طلبها فرأت
      سؤالًا كل مرة، لا اقتراحًا.

      فالسؤال يبقى للغموض الحقيقي: حين ما يحمل الدور بديلًا مطلوبًا، ولا لونًا،
      ولا فئة، ولا مناسبة، ولا رسمية. وعندها فقط السؤال أصدق من التخمين.
    */
    clarification:
      semantic.needsClarification && semantic.clarificationQuestion && !actionable(semantic)
        ? semantic.clarificationQuestion
        : undefined,
    /*
      النصيحة اللونية مهمّةٌ حين تُسأل وحدها، و**مُعدِّلٌ** حين تُذكر مع طلب
      إطلالة. «أبي فستان أحمر وش يليق معه» تريد الاثنين، وإجبارها على أحدهما
      يعطيها نصف ما طلبت.
    */
    wantsColorAdvice: semantic.task === 'color_advice' || semantic.task === 'compare_items',
    wantsAlternative: semantic.variation !== 'none',
    variation: semantic.variation,
    preserveSlots: slotsOfChanges(semantic.requestedChanges, 'keep'),
    replaceSlots: slotsOfChanges(semantic.requestedChanges, 'replace'),
    isNewGoal: semantic.isNewGoal,
    closetRequest:
      semantic.closetRequest.action === 'set' && semantic.closetRequest.name
        ? { action: 'set', name: semantic.closetRequest.name }
        : { action: semantic.closetRequest.action === 'clear' ? 'clear' : 'keep' },
  }
}
