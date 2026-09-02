/**
 * عقد النيّة — **دلالات فقط، لا معرّفات**.
 *
 * النموذج يفهم الكلام ولا يعرف خزانتها. فما يخرج منه أسماءٌ وفئات: «فستان»،
 * «الصيف». والتطبيق وحده يحوّلها إلى معرّفات حقيقية بعد التحقّق من الملكية.
 * هذي هي الحدود التي تمنع الهلوسة **بالبنية** لا بالرجاء.
 *
 * والتحقّق هنا صارم عمدًا: `response_format: json_object` يضمن أن النصّ JSON،
 * ولا يضمن أن حقوله هي حقولنا. ونيّةٌ نصفها مفهوم أخطر من نيّة مرفوضة — لأن
 * نصفها المفهوم يقنعنا بالباقي.
 */

export const TASKS = [
  'build_outfit',
  'find_items',
  'style_around_item',
  'refine_outfit',
  'replace_item',
  'remove_item',
  'color_advice',
  'compare_items',
  'clarify',
  /**
   * خارج نطاق نَسَق — «حل لي واجب الرياضيات».
   *
   * يُصنَّف دلاليًّا لا بقائمة كلمات ممنوعة: «الجو بارد وش ألبس؟» داخل النطاق
   * و«كم درجة الحرارة؟» خارجه، والفرق في المعنى لا في الكلمات.
   */
  'out_of_scope',
] as const

export type StylistTask = (typeof TASKS)[number]

export const FORMALITIES = ['casual', 'smart_casual', 'formal'] as const

/**
 * ما نوع التغيير على التوصية القائمة؟
 *
 * `none` طلبٌ جديد · `alternative` «عطني تنسيق ثاني» · `replace_all` «غيّريها
 * كلها» · `refine` «نفسها بس غيّري الحذاء». وبلا هذا التمييز تُقرأ كل رسالة
 * طلبًا جديدًا فيُعاد نفس الطقم ويُقدَّم كأنه غيره.
 */
export const VARIATIONS = ['none', 'alternative', 'replace_all', 'refine'] as const
export type Variation = (typeof VARIATIONS)[number]
export type Formality = (typeof FORMALITIES)[number]

export type ClosetRequest = { action: 'keep' | 'set' | 'clear'; name: string | null }
export type AnchorAction = 'keep' | 'replace' | 'clear'

export type RequestedChange = {
  action: 'add' | 'remove' | 'replace'
  category: string | null
  description: string | null
}

export type AIStylistIntent = {
  task: StylistTask
  isNewGoal: boolean
  requestedCategories: string[]
  excludedCategories: string[]
  requestedColors: string[]
  excludedColors: string[]
  closetRequest: ClosetRequest
  anchorAction: AnchorAction
  requestedAnchorCategory: string | null
  occasion: string | null
  desiredStyle: string[]
  formality: Formality | null
  variation: Variation
  requestedChanges: RequestedChange[]
  needsClarification: boolean
  clarificationQuestion: string | null
}

/* ------------------------------ التحقّق ------------------------------ */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * مصفوفة نصوص — والعنصر غير النصّي **يُسقَط** لا يُسقِط الرسالة.
 *
 * كان أي عنصر غريب يُبطل المصفوفة فتُرفض النيّة كلها. و`null` شاردٌ في
 * `requestedColors` لا يغيّر معنى الجملة، ورفضُها لأجله يعيد المستخدمة إلى
 * «ما قدرت أفهم طلبك» عن كلامٍ مفهوم. أما ما ليس مصفوفةً أصلاً فخطأ عقد يُرفض.
 */
function strings(value: unknown): string[] | undefined {
  if (value == null) return []
  if (!Array.isArray(value)) return undefined
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

const nullableString = (value: unknown): string | null | undefined => {
  if (value == null) return null
  if (typeof value !== 'string') return undefined
  return value.trim() || null
}

function closetRequest(value: unknown): ClosetRequest | undefined {
  if (value == null) return { action: 'keep', name: null }
  if (!isRecord(value)) return undefined

  const action = value.action
  if (action !== 'keep' && action !== 'set' && action !== 'clear') return undefined

  const name = nullableString(value.name)
  if (name === undefined) return undefined

  /*
    «حدّد» بلا اسم تناقض — لكنه تناقضٌ لا يستحق إسقاط الرسالة.

    كان يُرفض، فتضيع جملةٌ كاملة لأن النموذج ملأ حقلاً بلا قيمة. وقراءتها
    «أبقِ النطاق كما هو» تحفظ المعنى ولا تخمّن خزانة.
  */
  if (action === 'set' && !name) return { action: 'keep', name: null }
  return { action, name }
}

function changes(value: unknown): RequestedChange[] | undefined {
  if (value == null) return []
  if (!Array.isArray(value)) return undefined

  const parsed: RequestedChange[] = []
  for (const entry of value) {
    if (!isRecord(entry)) return undefined
    const action = entry.action
    if (action !== 'add' && action !== 'remove' && action !== 'replace') return undefined

    const category = nullableString(entry.category)
    const description = nullableString(entry.description)
    if (category === undefined || description === undefined) return undefined

    parsed.push({ action, category, description })
  }
  return parsed
}

/**
 * ما رفضناه ولماذا — **اسم الحقل ونوعه، بلا قيمته**.
 *
 * كان الرفض صامتًا: «بنية غير صالحة» بلا حقل ولا سبب. فحين رُفضت جملةٌ مركّبة
 * حقيقية لم يكن في السجل ما يقول أي حقل خذلنا — وضاع الوقت في الظنّ أن النموذج
 * لم يفهم، والحقيقة أن عقدنا كان أضيق من كلامها.
 */
export type ParseFailure = { field: string; got: string }

const typeOf = (value: unknown): string =>
  value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value

export type ParseResult =
  | { ok: true; intent: AIStylistIntent }
  | { ok: false; reason: ParseFailure }

/**
 * يقرأ النصّ ويرجّع نيّة صالحة — أو سببَ الرفض.
 *
 * صارمٌ حيث يغيّر الرفضُ سلوكًا (التعدادات)، ومتسامحٌ حيث لا يغيّر: عنصرٌ فارغ
 * في مصفوفة أسماء يُسقَط ولا يُسقِط الرسالة كلها. رفضُ نيّةٍ مفهومة لأجل `null`
 * شارد يجعل المستخدمة تعيد صياغة جملة صحيحة.
 */
export function parseIntentResult(raw: string): ParseResult {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return { ok: false, reason: { field: 'json', got: 'unparseable' } }
  }
  if (!isRecord(value)) return { ok: false, reason: { field: 'root', got: typeOf(value) } }

  const task = value.task
  if (typeof task !== 'string' || !TASKS.includes(task as StylistTask)) {
    return { ok: false, reason: { field: 'task', got: typeOf(value.task) } }
  }

  const anchorAction = value.anchorAction ?? 'keep'
  if (anchorAction !== 'keep' && anchorAction !== 'replace' && anchorAction !== 'clear') {
    return { ok: false, reason: { field: 'anchorAction', got: typeOf(anchorAction) } }
  }

  const formality = value.formality ?? null
  if (formality !== null && !FORMALITIES.includes(formality as Formality)) {
    return { ok: false, reason: { field: 'formality', got: typeOf(formality) } }
  }

  const variation = value.variation ?? 'none'
  if (typeof variation !== 'string' || !VARIATIONS.includes(variation as Variation)) {
    return { ok: false, reason: { field: 'variation', got: typeOf(variation) } }
  }

  const requestedCategories = strings(value.requestedCategories)
  const excludedCategories = strings(value.excludedCategories)
  const requestedColors = strings(value.requestedColors)
  const excludedColors = strings(value.excludedColors)
  const desiredStyle = strings(value.desiredStyle)
  if (
    !requestedCategories ||
    !excludedCategories ||
    !requestedColors ||
    !excludedColors ||
    !desiredStyle
  ) {
    return { ok: false, reason: { field: 'categories/colors', got: 'not-array' } }
  }

  const closet = closetRequest(value.closetRequest)
  if (!closet) return { ok: false, reason: { field: 'closetRequest', got: typeOf(value.closetRequest) } }

  const requestedChanges = changes(value.requestedChanges)
  if (!requestedChanges) {
    return { ok: false, reason: { field: 'requestedChanges', got: typeOf(value.requestedChanges) } }
  }

  const requestedAnchorCategory = nullableString(value.requestedAnchorCategory)
  const occasion = nullableString(value.occasion)
  const clarificationQuestion = nullableString(value.clarificationQuestion)
  if (
    requestedAnchorCategory === undefined ||
    occasion === undefined ||
    clarificationQuestion === undefined
  ) {
    return { ok: false, reason: { field: 'anchorCategory/occasion/clarification', got: 'not-string' } }
  }

  const isNewGoal = value.isNewGoal ?? false
  const needsClarification = value.needsClarification ?? false
  if (typeof isNewGoal !== 'boolean' || typeof needsClarification !== 'boolean') {
    return { ok: false, reason: { field: 'isNewGoal/needsClarification', got: typeOf(isNewGoal) } }
  }

  return {
    ok: true,
    intent: {
    task: task as StylistTask,
    isNewGoal,
    requestedCategories,
    excludedCategories,
    requestedColors,
    excludedColors,
    closetRequest: closet,
    anchorAction,
    requestedAnchorCategory,
    occasion,
    desiredStyle,
    formality: formality as Formality | null,
    variation: variation as Variation,
    requestedChanges,
    needsClarification,
    clarificationQuestion,
    },
  }
}

/** الشكل القديم — يبقى لمن لا يحتاج السبب. */
export const parseIntent = (raw: string): AIStylistIntent | undefined => {
  const result = parseIntentResult(raw)
  return result.ok ? result.intent : undefined
}
