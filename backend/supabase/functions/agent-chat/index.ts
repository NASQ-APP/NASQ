/**
 * POST /agent-chat
 *
 * الوكيل — الستايليست (A-09 … A-12).
 *
 * قاعدة ملزمة (المبدأ ٢): **الاقتراح من خزانتك فقط.** الوكيل ما يقترح قطعة
 * ما تملكينها، ولو الخزانة ما تكفي يقول وش الناقص بدل ما يخترع. لهذا نمرّر له
 * قطع المستخدمة كسياق مغلق، ونرفض أي مخرج يشير لقطعة خارجها.
 */
import { handlePreflight } from '../_shared/cors.ts'
import { HandledError, fail, ok } from '../_shared/response.ts'
import { agentConfigured } from '../_shared/agent.ts'
import { readJson, requireUser, serviceClient } from '../_shared/supabase.ts'

type ChatRequest = {
  question: string
  threadId?: string
  selectedItemIds?: string[]
}

Deno.serve(async (request) => {
  const preflight = handlePreflight(request)
  if (preflight) return preflight

  try {
    const user = await requireUser(request)
    const { question } = await readJson<ChatRequest>(request)

    if (!question?.trim()) {
      throw new HandledError('invalid-request', 'اكتبي سؤالك أول.')
    }

    // سياق مغلق: قطع المستخدمة وحدها، وبدون قطع التجربة
    const { data: items } = await serviceClient()
      .from('items')
      .select('id, name, category_id, color_name, seasons, occasions')
      .eq('user_id', user.id)
      .eq('source', 'wardrobe')

    if (!items?.length) {
      return ok({
        message: 'خزانتك فاضية لين الحين.',
        looks: [],
        pieces: [],
        gap: 'أضيفي كم قطعة وأقدر أنسّق لك منها.',
      })
    }

    /*
      البوّابة كانت على `AGENT_PROVIDER` — **سرٌّ لا وجود له**.

      البنية المركزية (`_shared/agent.ts`) تُهيَّأ بـ`AGENT_API_KEY` وهو مضبوط
      فعلاً، فالدالة كانت ترجّع ٥٠٣ دائمًا لا لنقص مفتاح بل لشرطٍ يسأل عن
      إعداد من تصميم سابق. وهذا أسوأ من العطل: يبدو نقصَ تهيئة فيُبحَث عن
      مفتاح موجود أصلاً.

      والسؤال الآن من مالكه: `agentConfigured()` — مصدر واحد لا شرطان.
    */
    if (!agentConfigured()) {
      throw new HandledError(
        'not-supported-by-provider',
        'الوكيل يحتاج تفعيل المزوّد على الخادم.',
        503,
      )
    }

    // TODO(المرحلة ٤): استدعاء المزوّد بسياق `items` فقط، ثم **تصفية المخرج**:
    // أي معرّف قطعة خارج القائمة يُسقَط قبل ما يوصل الواجهة (المبدأ ٢).
    return ok({ message: '', looks: [], pieces: [], gap: undefined })
  } catch (error) {
    return fail(error)
  }
})
