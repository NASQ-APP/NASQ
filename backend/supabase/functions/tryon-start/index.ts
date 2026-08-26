/**
 * POST /tryon-start
 *
 * يبدأ مهمة توليد ويرجّع معرّفها **فورًا** (S-04). المتابعة عبر Realtime على
 * جدول `render_jobs` أو عبر /tryon-status. لا طلب معلّق ينتظر.
 *
 * هنا — ولا مكان غيره — يعيش مفتاح مزوّد التوليد (§17).
 */
import { handlePreflight } from '../_shared/cors.ts'
import { HandledError, fail, ok } from '../_shared/response.ts'
import { DAILY_RENDER_LIMIT, TRYON_PROVIDER } from '../_shared/env.ts'
import { readJson, requireUser, serviceClient } from '../_shared/supabase.ts'
import { requestHash } from '../_shared/hash.ts'

type TryOnRequest = {
  source: 'model' | 'photo'
  outfitId?: string
  modelId?: string
  modelSeed?: number
  selectedItems: unknown[]
  neutralFillers: unknown[]
  framing: string
  preserveIdentity: boolean
}

Deno.serve(async (request) => {
  const preflight = handlePreflight(request)
  if (preflight) return preflight

  try {
    const user = await requireUser(request)
    const payload = await readJson<TryOnRequest>(request)

    if (!payload.selectedItems?.length) {
      throw new HandledError('unsupported-item', 'اختاري قطعة واحدة على الأقل.')
    }

    const db = serviceClient()

    // ---- السقف اليومي (S-09) ----
    const { data: usedToday } = await db.rpc('render_jobs_today', { target_user: user.id })
    if ((usedToday ?? 0) >= DAILY_RENDER_LIMIT()) {
      throw new HandledError(
        'limit-reached',
        'وصلتِ حد التوليد اليومي.',
        429,
      )
    }

    // ---- الكاش: نفس القطع + نفس الموديل = ما يتولّد مرتين (S-09) ----
    const hash = await requestHash(payload)
    const { data: cached } = await db
      .from('render_jobs')
      .select('id, result_url')
      .eq('user_id', user.id)
      .eq('request_hash', hash)
      .eq('status', 'completed')
      .limit(1)
      .maybeSingle()

    if (cached?.result_url) {
      return ok({ jobId: cached.id, cached: true })
    }

    // ---- مهمة جديدة ----
    const { data: job, error } = await db
      .from('render_jobs')
      .insert({
        user_id: user.id,
        outfit_id: payload.outfitId ?? null,
        status: 'processing',
        stage: 'analyze',
        provider: TRYON_PROVIDER(),
        prompt: payload,
        request_hash: hash,
      })
      .select('id')
      .single()

    if (error || !job) {
      throw new HandledError('provider-failure', 'ما قدرنا نبدأ التوليد الحين.', 500)
    }

    // TODO(المرحلة ٣): استدعاء مزوّد التوليد هنا وتحديث المهمة عند رجوع النتيجة.
    // المفتاح يُقرأ من بيئة الدالة، وما يمر بالمتصفح أبدًا.
    // البنية جاهزة: المهمة موجودة والواجهة تتابعها عبر Realtime من الآن.

    return ok({ jobId: job.id, cached: false })
  } catch (error) {
    return fail(error)
  }
})
