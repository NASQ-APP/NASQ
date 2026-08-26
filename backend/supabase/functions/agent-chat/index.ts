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
import { optionalEnv } from '../_shared/env.ts'
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

    if (!optionalEnv('AGENT_PROVIDER')) {
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
