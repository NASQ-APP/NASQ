/**
 * عقد الوكيل.
 *
 * الشكل واحد سواء جاء الرد من نموذج على الخادم أو من قواعد محلية — فالواجهة
 * ما تعرف الفرق إلا من `source`، وهو الوحيد الذي تعلنه للمستخدمة.
 */

/**
 * ما ينقص الوكيل ليجاوب.
 *
 * **قائمة مغلقة عن قصد.** لو تركناها نصًّا حرًّا لاخترع النموذج أسئلة ما
 * نعرف نتصرّف بجوابها. كل قيمة هنا لها سؤال مكتوب عندنا وجواب نحفظه.
 */
export type ContextualNeed = 'destination' | 'occasionType' | 'budget'

export const CONTEXTUAL_NEEDS: ContextualNeed[] = ['destination', 'occasionType', 'budget']

/** السؤال الذي نعرضه لكل حاجة — نصّنا نحن، مب نصّ النموذج. */
export const NEED_QUESTION: Record<ContextualNeed, string> = {
  destination: 'وين مسافرة؟ الوجهة تغيّر الجو والملابس.',
  occasionType: 'أي نوع مناسبة؟ عشاء، عرس، ولا اجتماع؟',
  budget: 'كم ميزانيتك تقريبًا للقطعة؟',
}

/** إطلالة مقترحة — معرّفات فقط، والقطع تُقرأ من الخزانة عند العرض. */
export type AgentLook = {
  title: string
  reason: string
  itemIds: string[]
}

export type AgentAnswer = {
  message: string
  looks: AgentLook[]
  /** قطع مفردة تُقترح لتنسّق مع شيء مختار أصلًا */
  pieces: string[]
  /** يظهر لما تكون الخزانة فعلًا ما تغطّي الطلب */
  gap?: string
  /** سؤال واحد لما تنقص معلومة — بلا تخمين */
  need?: ContextualNeed
  /** من جاوب: نموذج على الخادم أو قواعد محلية. تعلنه الواجهة كما هو. */
  source: 'agent' | 'local'
}

/** ما يرسله الخادم قبل التحقق — كل حقوله موضع شك. */
export type RawAgentAnswer = {
  message?: unknown
  looks?: unknown
  pieces?: unknown
  gap?: unknown
  need?: unknown
}
