/**
 * عقد مزوّد الستايليست.
 *
 * نفس الشكل للاثنين — المحلي والبعيد — فتبديل المزوّد ما يمسّ أي مكوّن.
 */
import type { AgentAnswer, ContextualNeed } from '@/domain/stylist/types'
import type { DeclaredStyle, UserStyleProfile } from '@/domain/style/types'
import type { WardrobeItem } from '@/domain/wardrobe'

export type StylistRequest = {
  question: string
  /** خزانة المستخدمة — المزوّد المحلي يقرأ منها، والبعيد يقرأ من الخادم */
  wardrobe: WardrobeItem[]
  selectedIds: string[]
  /** الذوق المُلاحَظ — يقرأه المزوّد المحلي كما كان دائمًا */
  style: UserStyleProfile
  /**
   * ما صرّحت به في التعارف — مصدر القيود والسياق.
   *
   * منفصل عن `style` لأن `UserStyleProfile` في هذي النسخة مُلاحَظ بحت
   * (ألوان وفئات)، والقيود (`avoid`) والسياقات والملاحظة تعيش في المُصرَّح.
   * الوكيل يحتاج الاثنين، والمحلي يكتفي بالأول.
   */
  declared: DeclaredStyle
  /** أسئلة سبق أن جاوبت عليها في هذا الخيط */
  answeredNeeds: ContextualNeed[]
  signal?: AbortSignal
}

export type StylistProvider = {
  id: string
  answer: (request: StylistRequest) => Promise<AgentAnswer>
}
