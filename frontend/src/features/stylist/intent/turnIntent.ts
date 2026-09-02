/**
 * عقد النيّة — ما يستهلكه المحرّك.
 *
 * عاش هذا العقد داخل المحلّل المعجمي، فلمّا صار الفهم على النموذج كان لا بدّ
 * أن ينفصل: العقد يبقى، والمحلّل ذهب. وهذا ما يجعل تبديل من **يملأ** النيّة
 * بلا أثر على من **يقرؤها**.
 */
import type { BodySlot } from '@/domain/wardrobe'

/** طلب الخزانة كما يصل من النموذج — اسمًا لا معرّفًا. */
export type ClosetRequest =
  | { action: 'keep' }
  | { action: 'clear' }
  | { action: 'set'; name: string }

export type AnchorAction = 'keep' | 'replace' | 'clear'

export type Variation = 'none' | 'alternative' | 'replace_all' | 'refine'

export type TurnIntent = {
  /** مواضع طلبتها صراحةً — «أبي جينز وتوب» */
  requestedSlots: BodySlot[]
  /** أشكال بعينها — «جينز» أدقّ من «سفلي» */
  requestedShapes: string[]
  /** مواضع رفضتها — «بدون فستان» */
  excludedSlots: BodySlot[]
  /** ألوان رفضتها — «لا أبي أسود» */
  excludedColors: string[]
  /**
   * ألوان ذكرتها إيجابًا — «فستان أحمر».
   *
   * تُستعمل أساسًا للنصيحة اللونية حين لا تكون القطعة في الخزانة: السؤال عن
   * «فستان أحمر» لا يشترط امتلاكه.
   */
  requestedColors: string[]
  /** الموضع الذي تسأل عنه — «وش لون **كعب**» تعطي `shoes` */
  adviceSlot?: BodySlot
  /**
   * خارج نطاق نَسَق — يُردّ بحدود المساعدة، **ولا تُمَسّ الجلسة**.
   *
   * سؤالٌ عن عاصمة فرنسا لا يجوز أن يمحو إطلالةً تُبنى، ولا أن يُشغّل بحثًا في
   * الخزانة. والفصل بين «لا أجيب» و«أنسى ما كنّا فيه» فرقٌ تحسّه المستخدمة.
   */
  outOfScope: boolean
  /** سؤال توضيحي واحد قصير — حين يغيّر الغموضُ الفئةَ أو اللون أو العملية */
  clarification?: string
  anchorAction: AnchorAction
  /** الموضع الذي تريده مرساةً جديدة */
  requestedAnchorSlot?: BodySlot
  requestedAnchorShape?: string
  occasion?: 'work' | 'casual' | 'evening' | 'travel'
  /** طلبت بديلاً عمّا عُرض — «عطيني غيرها» */
  wantsAlternative: boolean
  /**
   * ما نوع التغيير المطلوب على التوصية القائمة؟
   *
   * `none` طلبٌ جديد · `alternative` «عطني تنسيق ثاني» · `replace_all`
   * «غيّريها كلها» · `refine` «نفسها بس غيّري الحذاء».
   *
   * وبلا هذا التمييز كانت كل رسالة تُقرأ طلبًا جديدًا يُبنى من نفس المرساة،
   * فيرجع نفس الطقم ويُقدَّم كأنه خيار آخر.
   */
  variation: Variation
  /** ما تريد الإبقاء عليه من التوصية القائمة — «نفس الفستان» */
  preserveSlots: BodySlot[]
  /** ما تريد تبديله منها — «غيّري الحذاء» */
  replaceSlots: BodySlot[]
  /** سؤال عن الألوان وحدها */
  wantsColorAdvice: boolean
  /**
   * «دور لي فستان» — بحثٌ عن قطعة لا بناءُ إطلالة.
   *
   * الخلط بينهما يجعل المساعد يقرّر عنها: تسأل «وين فساتيني؟» فيبني طقمًا
   * كاملاً لم تطلبه. والعرض ثم التنسيق ترتيبٌ طبيعي: تشوف، تختار، ثم ننسّق.
   */
  wantsFind: boolean
  /**
   * هل هذا **هدف جديد** أم صقلٌ لما قبله؟
   *
   * «أبي فستان» بعد «إطلالة كاجوال» هدفٌ جديد: بنية الإطلالة تغيّرت كلها.
   * و«نفسها بس غيّري الحذاء» صقل. ودمج الاثنين يعطي فستانًا فوق بنطلون —
   * وهو ما كان يحصل حرفيًا.
   */
  isNewGoal: boolean
  closetRequest: ClosetRequest
}

export const EMPTY_TURN_INTENT: TurnIntent = {
  requestedSlots: [],
  requestedShapes: [],
  excludedSlots: [],
  excludedColors: [],
  requestedColors: [],
  anchorAction: 'keep',
  wantsAlternative: false,
  variation: 'none',
  outOfScope: false,
  preserveSlots: [],
  replaceSlots: [],
  wantsColorAdvice: false,
  wantsFind: false,
  isNewGoal: false,
  closetRequest: { action: 'keep' },
}
