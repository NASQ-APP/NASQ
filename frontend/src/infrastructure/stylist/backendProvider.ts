/**
 * المزوّد البعيد — نموذج حقيقي خلف `agent-chat`.
 *
 * الترتيب هنا مقصود:
 * ١. نرسل السؤال والملف و**وصف** القطع. الخزانة في هذي النسخة تعيش على
 *    الجهاز ولا تُرفع لأي مكان، فالخادم ما يقدر يقرأها — والنموذج ما يقدر
 *    يختار من قائمة ما وصلته. اللي يرتحل وصف فقط: المعرّف والاسم والفئة
 *    والشكل واللون. **بلا صور ولا أسعار ولا روابط متاجر ولا مقاسات** —
 *    وهذا أقل ما يحتاجه التنسيق.
 * ٢. الرد يمرّ على `validateAgentAnswer` — تحقّق ثانٍ عندنا حتى لو تحقّق
 *    الخادم. المعرّف المخترع أو الممنوع يُسقَط هنا كمان.
 * ٣. أي فشل — شبكة، مهلة، مزوّد مطفأ، رد غير صالح — يرجع للقواعد المحلية.
 *    المستخدمة تحصل جوابًا دائمًا، وتعرف مصدره.
 *
 * **العنوان مستقلّ عن `apiBase`.** بقية الدوال تعيش على Supabase، والوكيل
 * يمرّ بوسيط التطوير المحلي حيث يعيش المفتاح. خلطهما يوجّه الوكيل للـstub
 * المنشور بدل النموذج، فنفصل العنوانين.
 */
import { ENDPOINTS, request } from '@/infrastructure/http/client'
import { validateAgentAnswer } from '@/domain/stylist/validate'
import { env } from '@/shared/config'
import { answerLocally } from './localProvider'
import type { RawAgentAnswer } from '@/domain/stylist/types'
import type { StylistProvider, StylistRequest } from './types'
import type { WardrobeItem } from '@/domain/wardrobe'

/** أقصى انتظار قبل ما نرجع للقواعد — الانتظار الطويل أسوأ من رد محلي فوري. */
const TIMEOUT_MS = 20_000

/**
 * وصف القطعة كما يراه النموذج.
 *
 * قائمة الحقول هنا **بيضاء لا سوداء**: نكتب اللي يطلع، فما ينزلق حقل جديد
 * إلى الشبكة لمجرد إضافته لـ`WardrobeItem`. الصورة والسعر ورابط المتجر
 * والمقاس ما لها مكان في التنسيق، فما تُرسل.
 *
 * `length` و`fit` ما لهما وجود في `WardrobeItem` هنا، فما نرسل حقلًا فاضيًا
 * يوهم النموذج بمعلومة ما نملكها.
 */
const describe = (item: WardrobeItem) => ({
  id: item.id,
  name: item.name,
  categoryId: item.categoryId,
  shape: item.shape,
  colorName: item.colorName,
})

export const backendStylist: StylistProvider = {
  id: 'agent-chat',

  async answer(input: StylistRequest) {
    const { question, selectedIds, style, declared, answeredNeeds, wardrobe, signal } = input

    try {
      const raw = await request<RawAgentAnswer>(ENDPOINTS.agentChat, {
        method: 'POST',
        base: env.agentBase,
        signal,
        timeoutMs: TIMEOUT_MS,
        body: {
          question,
          selectedItemIds: selectedIds,
          answeredNeeds,
          items: wardrobe.map(describe),
          styleProfile: {
            // الألوان المُلاحَظة أصدق من المُصرَّحة، ونرجع لها حين ما تكفي
            colors: (style.colors.length ? style.colors : declared.colors).map(
              (color) => color.name,
            ),
            tags: style.tags,
            contexts: declared.contexts,
            avoid: declared.avoid,
            gender: declared.gender,
            // سياق ليّن: يوضّح ذوقها، وما يفتح شيئًا أقفلته `avoid`
            note: declared.note,
          },
        },
      })

      const validated = validateAgentAnswer(raw, wardrobe, declared.avoid, answeredNeeds)
      return validated ?? answerLocally(input)
    } catch {
      return answerLocally(input)
    }
  },
}
