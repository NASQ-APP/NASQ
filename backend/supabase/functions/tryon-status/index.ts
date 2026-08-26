/**
 * GET /tryon-status?job_id=…
 *
 * حالة مهمة التوليد. الواجهة تفضّل Realtime، وهذا المسار احتياط للحالات
 * اللي ما يشتغل فيها الاتصال الحي.
 */
import { handlePreflight } from '../_shared/cors.ts'
import { HandledError, fail, ok } from '../_shared/response.ts'
import { requireUser, serviceClient } from '../_shared/supabase.ts'

Deno.serve(async (request) => {
  const preflight = handlePreflight(request)
  if (preflight) return preflight

  try {
    const user = await requireUser(request)
    const jobId = new URL(request.url).searchParams.get('job_id')
    if (!jobId) throw new HandledError('invalid-request', 'ينقص معرّف المهمة.')

    const { data: job } = await serviceClient()
      .from('render_jobs')
      .select('status, stage, result_url, error_code, error_message')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!job) throw new HandledError('invalid-request', 'ما لقينا هذي المهمة.', 404)

    return ok({
      status: job.status,
      stage: job.stage ?? undefined,
      resultImageUrl: job.result_url ?? undefined,
      errorCode: job.error_code ?? undefined,
      errorMessage: job.error_message ?? undefined,
    })
  } catch (error) {
    return fail(error)
  }
})
