/**
 * المزوّد الحقيقي خلف الخادم (S-04).
 *
 * التوليد **غير متزامن**: الطلب يرجّع `job_id` فورًا، والحالة تُتابَع بالسؤال
 * الدوري عن `render_jobs`. ما فيه طلب معلّق ينتظر، فالواجهة ما تتعلّق أبدًا.
 * مفتاح المزوّد ما يمر بالمتصفح — يعيش داخل Edge Function حصريًا (§17).
 *
 * يُفعَّل بـ`VITE_TRYON_PROVIDER=backend`، وما يتغيّر أي مكوّن واجهة.
 */
import { ENDPOINTS, request } from '@/infrastructure/http/client'
import { TryOnFailure } from '@/domain/outfit'
import type {
  TryOnErrorCode,
  TryOnStageId,
  TryOnStatus,
  VirtualTryOnProvider,
  VirtualTryOnResult,
} from '@/domain/outfit'

type StartResponse = { jobId: string }

type StatusResponse = {
  status: TryOnStatus
  stage?: TryOnStageId
  resultImageUrl?: string
  errorCode?: TryOnErrorCode
  errorMessage?: string
}

const POLL_INTERVAL_MS = 1200
const MAX_ATTEMPTS = 100

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const backendTryOnProvider: VirtualTryOnProvider = {
  id: 'backend',
  label: 'مزوّد التوليد',
  capabilities: {
    savedModel: true,
    userPhoto: true,
    multiGarment: true,
    identityPreservation: true,
  },

  async generateTryOn(tryOnRequest, onStage, signal): Promise<VirtualTryOnResult> {
    const { jobId } = await request<StartResponse>(ENDPOINTS.tryOnStart, {
      method: 'POST',
      body: tryOnRequest,
      signal,
    })

    let lastStage: TryOnStageId | undefined

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (signal?.aborted) throw new TryOnFailure('provider-failure', 'أُلغيت العملية.')

      const job = await request<StatusResponse>(ENDPOINTS.tryOnStatus(jobId), { signal })

      if (job.stage && job.stage !== lastStage) {
        lastStage = job.stage
        onStage?.(job.stage)
      }

      if (job.status === 'completed' && job.resultImageUrl) {
        return {
          id: jobId,
          resultImageUrl: job.resultImageUrl,
          framing: tryOnRequest.framing,
          simulated: false,
          createdAt: new Date().toISOString(),
        }
      }

      if (job.status === 'failed') {
        throw new TryOnFailure(
          job.errorCode ?? 'provider-failure',
          job.errorMessage ?? 'ما قدرنا نجهّز الصورة الحين.',
        )
      }

      await delay(POLL_INTERVAL_MS)
    }

    throw new TryOnFailure('provider-timeout', 'أخذت وقت أطول من المتوقع.', 'جرّبي مرة ثانية.')
  },
}
