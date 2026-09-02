/**
 * نيّة المستخدمة — بنية صريحة لا كلمات مفتاحية.
 *
 * الاستخراج الحالي **قاعديّ لا لغويّ**: يقرأ ما وصل من الواجهة (قطعة مثبَّتة،
 * زرّ مضغوط) لا من نصّ الرسالة. وهذا فرقٌ يستحق التصريح — مطابقة الكلمات
 * (`includes('دوام')`) تفشل مع «عندي اجتماع مهم بكرة» وتنجح مع «ما عندي دوام»،
 * وكلاهما خطأ صامت.
 *
 * والاستخراج اللغوي يحتاج نموذجًا، ومكانه `agent-chat` على الخادم — فالمفتاح
 * لا ينزل للمتصفح. هذي البنية هي عقده: ما يملؤه النموذج، وما تستهلكه المحرّكات
 * بعده. فالمحرّك جاهز قبل أن يصل النموذج، ولا يتغيّر حين يصل.
 */
import type { StylistOccasion } from '../context/stylistContext'

export type StylistTask =
  | 'build_outfit'
  | 'style_around_item'
  | 'compare_items'
  | 'replace_item'
  | 'color_advice'
  | 'make_more_formal'
  | 'make_more_casual'
  | 'make_bolder'
  | 'make_calmer'
  | 'weather_outfit'
  | 'travel_outfit'
  | 'weekly_outfits'

/** مستوى الرسمية المطلوب — يعدّل ترتيب المرشّحات ولا يستبعد. */
export type Formality = 'casual' | 'smart_casual' | 'formal'

export type StylistIntent = {
  task: StylistTask
  occasion?: StylistOccasion
  formality?: Formality
  /** القطعة المثبَّتة — معرّف من الخزانة، لا اسم يُبحث عنه */
  anchorItemId?: string
  /** موضع يُطلب تبديله في إطلالة قائمة */
  replaceSlot?: string
  /** معرّفان للمقارنة */
  compareItemIds?: string[]
  /** هل ينقص المحرّك معلومة لا يمكن افتراضها؟ */
  needsClarification: boolean
}

export const DEFAULT_INTENT: StylistIntent = {
  task: 'build_outfit',
  needsClarification: false,
}

/**
 * نيّة من فعل الواجهة — مؤكَّدة لأنها ليست تفسيرًا.
 *
 * ضغطها «نسّقي هذي القطعة» على قطعة بعينها **يقول** ما تريد بلا لبس. وهذا
 * أوثق مصدر للنيّة عندنا اليوم، وأولى من تخمين نصّ.
 */
export const intentFromAnchor = (anchorItemId: string): StylistIntent => ({
  task: 'style_around_item',
  anchorItemId,
  needsClarification: false,
})

export const intentForColorAdvice = (anchorItemId: string): StylistIntent => ({
  task: 'color_advice',
  anchorItemId,
  needsClarification: false,
})

export const intentForCompare = (ids: string[]): StylistIntent => ({
  task: 'compare_items',
  compareItemIds: ids,
  needsClarification: ids.length < 2,
})
