/**
 * تصنيف المهمة واختيار النموذج — **القرار المركزي**.
 *
 * لا واجهة ولا دالة تختار نموذجًا بنفسها. تصف المهمة، ويقرّر هذا الملف. فتغيير
 * سياسة الاختيار لاحقًا يمسّ ملفًا واحدًا لا عشرة مواضع.
 *
 * **التصنيف من بنية الطلب لا من كلماته.** «هل مع الطلب صورة؟» حقيقة، و«هل
 * الكلمة صورة موجودة في النص؟» تخمين — والثاني يخطئ في الاتجاهين: يرفع مهمة
 * بسيطة لنموذج غالٍ لأنها ذكرت كلمة، ويترك مهمة بصرية لنموذج نصّي لأنها لم
 * تذكرها. فالفعل الذي طلبته الواجهة هو الإشارة الأولى، والنص إشارة ثانوية
 * تُستعمل لتقدير **التعقيد** داخل المحادثة فقط.
 */
import { optionalEnv } from './env.ts'

export type AITaskType =
  | 'simple_chat'
  | 'wardrobe_question'
  | 'styling_request'
  | 'garment_analysis'
  | 'image_generation'
  | 'virtual_try_on'
  | 'image_editing'

export type TaskComplexity = 'simple' | 'advanced'

/** الطبقات الثلاث — الأسماء تُقرأ من البيئة فتتغيّر بلا نشر شيفرة. */
export type ModelTier = 'fast' | 'reasoning' | 'vision'

/**
 * ما تصفه الواجهة عن الطلب.
 * كلها حقائق بنيوية عدا `text`، وهو إشارة ثانوية لتقدير التعقيد.
 */
export type TaskInput = {
  /** الفعل الذي طلبته الواجهة — الإشارة الأقوى وأصدقها */
  operation:
    | 'chat'
    | 'analyze-garment'
    | 'style-outfit'
    | 'generate-image'
    | 'edit-image'
  /** هل مع الطلب صورة فعلاً — حقيقة لا استنتاج من النص */
  hasImage?: boolean
  /** عدد قطع الخزانة الداخلة في السياق */
  wardrobeSize?: number
  /** عدد القطع التي اختارتها المستخدمة */
  selectedItemCount?: number
  /** نصّ المستخدمة — يُقاس طوله وتركيبه، ولا تُطابَق كلماته بقائمة */
  text?: string
}

export type TaskProfile = {
  taskType: AITaskType
  complexity: TaskComplexity
  requiresVision: boolean
  requiresImageGeneration: boolean
  requiresWardrobeContext: boolean
}

export type Routing = {
  profile: TaskProfile
  tier: ModelTier
  model: string
}

/**
 * تعقيد المحادثة من **تركيب النص لا معناه**.
 *
 * ثلاث إشارات محايدة للغة: الطول، وعدد الجمل، وعدد القيود المعطوفة. سؤال قصير
 * واحد بسيط، وطلب طويل بعدة شروط يحتاج استدلالاً. لا قائمة كلمات مفتاحية —
 * القوائم تشيخ وتنكسر مع كل صياغة جديدة.
 */
function conversationComplexity(text?: string): TaskComplexity {
  const value = text?.trim() ?? ''
  if (!value) return 'simple'

  const words = value.split(/\s+/).length
  const clauses = value.split(/[.،؟!?\n]+/).filter((part) => part.trim()).length
  // العطف يدلّ على قيود متراكمة: «كذا و كذا و بشرط»
  const conjunctions = (value.match(/\s(و|أو|ثم|بس|لكن|مع)\s/g) ?? []).length

  const signals = (words > 25 ? 1 : 0) + (clauses > 2 ? 1 : 0) + (conjunctions > 2 ? 1 : 0)
  return signals >= 2 ? 'advanced' : 'simple'
}

/** يصف المهمة قبل اختيار أي نموذج. */
export function classifyTask(input: TaskInput): TaskProfile {
  switch (input.operation) {
    case 'analyze-garment':
      return {
        taskType: 'garment_analysis',
        complexity: 'advanced',
        requiresVision: true,
        requiresImageGeneration: false,
        requiresWardrobeContext: false,
      }

    case 'generate-image':
      return {
        taskType: input.hasImage ? 'virtual_try_on' : 'image_generation',
        complexity: 'advanced',
        requiresVision: false,
        requiresImageGeneration: true,
        requiresWardrobeContext: false,
      }

    case 'edit-image':
      return {
        taskType: 'image_editing',
        complexity: 'advanced',
        requiresVision: false,
        requiresImageGeneration: true,
        requiresWardrobeContext: false,
      }

    case 'style-outfit':
      return {
        taskType: 'styling_request',
        complexity: 'advanced',
        requiresVision: Boolean(input.hasImage),
        requiresImageGeneration: false,
        requiresWardrobeContext: true,
      }

    case 'chat':
    default: {
      // المحادثة وحدها غامضة، فهنا يُستعمل النص — لتقدير التعقيد لا لتحديد النوع
      const needsWardrobe = (input.wardrobeSize ?? 0) > 0 || (input.selectedItemCount ?? 0) > 0
      const complexity = conversationComplexity(input.text)
      return {
        taskType: needsWardrobe ? 'wardrobe_question' : 'simple_chat',
        // سؤال عن خزانة كبيرة يحمل سياقًا أطول، فيستحق نموذجًا أقدر
        complexity: complexity === 'advanced' || (input.wardrobeSize ?? 0) > 40 ? 'advanced' : 'simple',
        requiresVision: Boolean(input.hasImage),
        requiresImageGeneration: false,
        requiresWardrobeContext: needsWardrobe,
      }
    }
  }
}

/** اسم النموذج لكل طبقة — من البيئة، وبأسماء افتراضية معقولة. */
const MODEL_FOR: Record<ModelTier, () => string> = {
  fast: () => optionalEnv('AGENT_MODEL_FAST', optionalEnv('AGENT_MODEL', 'llama-3.1-8b-instant')),
  reasoning: () =>
    optionalEnv('AGENT_MODEL_REASONING', optionalEnv('AGENT_MODEL', 'llama-3.3-70b-versatile')),
  vision: () =>
    optionalEnv('AGENT_MODEL_VISION', optionalEnv('AGENT_MODEL', 'llama-3.2-90b-vision-preview')),
}

/**
 * الطبقة المناسبة للمهمة.
 *
 * الرؤية تسبق كل شيء: مهمة بصرية على نموذج نصّي تفشل مهما كان قويًا. ثم
 * التعقيد. والبسيط يبقى على السريع — استعمال الأقوى بلا حاجة يدفع ثمنًا
 * ووقتًا بلا مقابل.
 */
export function tierFor(profile: TaskProfile): ModelTier {
  if (profile.requiresVision) return 'vision'
  return profile.complexity === 'advanced' ? 'reasoning' : 'fast'
}

/**
 * القرار الكامل: صنّف، اختر الطبقة، اقرأ اسم النموذج.
 *
 * ويُسجَّل القرار — الفعل المطلوب والطبقة والنموذج. بلا مفاتيح وبلا محتوى:
 * السجلّ لتتبّع الاختيار لا لتخزين ما أرسلته المستخدمة.
 */
export function routeTask(input: TaskInput): Routing {
  const profile = classifyTask(input)
  const tier = tierFor(profile)
  const model = MODEL_FOR[tier]()

  console.info('[router]', {
    operation: input.operation,
    taskType: profile.taskType,
    complexity: profile.complexity,
    tier,
    model,
  })

  return { profile, tier, model }
}
