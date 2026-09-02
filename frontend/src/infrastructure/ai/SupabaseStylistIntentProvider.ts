/**
 * فهم الكلام عبر الخادم — **والمتصفّح لا يعرف المزوّد ولا مفتاحه**.
 *
 * لا `VITE_OPENAI_API_KEY` ولا نداء مباشر لـ`api.openai.com`. أي مفتاح يصل
 * حزمة الواجهة يصير عامًّا: `VITE_` تُحقَن في البناء، والبناء يُنزَّل.
 *
 * والفشل هنا **صامت عمدًا**: يرجّع `undefined` فيتولّى المحلّل المحلي. تعذُّر
 * الفهم الذكي ليس عطلاً تراه المستخدمة — المساعدة تكمل بفهم أضعف، لا تتوقّف.
 */
import { supabase } from '@/infrastructure/supabase'
import type {
  SemanticIntent,
  StylistIntentProvider,
  StylistSemanticContext,
} from '@/features/stylist/intent/provider'

export const supabaseStylistIntentProvider: StylistIntentProvider = {
  async extract(input: { message: string; context: StylistSemanticContext }) {
    if (!supabase) return undefined

    try {
      const { data, error } = await supabase.functions.invoke('stylist-intent', {
        body: { message: input.message, context: input.context },
      })

      if (error) return undefined

      const intent = (data as { intent?: SemanticIntent } | null)?.intent
      return intent ?? undefined
    } catch {
      // شبكة منقطعة أو دالة غير منشورة — الاحتياطي يتولّى
      return undefined
    }
  },
}
