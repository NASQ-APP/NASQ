/**
 * POST /search
 *
 * البحث الدلالي داخل خزانة المستخدمة وحدها (A-08).
 * يخدم البحث بالمعنى («بلوزة بيضا») و«عندك مثله» (W-11).
 */
import { handlePreflight } from '../_shared/cors.ts'
import { HandledError, fail, ok } from '../_shared/response.ts'
import { optionalEnv } from '../_shared/env.ts'
import { readJson, requireUser } from '../_shared/supabase.ts'

type SearchRequest = { query: string; limit?: number }

Deno.serve(async (request) => {
  const preflight = handlePreflight(request)
  if (preflight) return preflight

  try {
    await requireUser(request)
    const { query } = await readJson<SearchRequest>(request)

    if (!query?.trim()) throw new HandledError('invalid-request', 'اكتبي كلمة البحث.')

    if (!optionalEnv('EMBEDDING_PROVIDER')) {
      throw new HandledError(
        'not-supported-by-provider',
        'البحث الدلالي يحتاج تفعيل مزوّد التمثيل على الخادم.',
        503,
      )
    }

    // TODO(المرحلة ٤): تمثيل السؤال ثم استدعاء `search_items` — الدالة نفسها
    // تحصر النتائج بقطع المستخدمة عبر auth.uid().
    return ok({ items: [] })
  } catch (error) {
    return fail(error)
  }
})
