/**
 * مدير المزوّدين — من يجرّب، ومتى ننتقل لغيره.
 *
 * **بالتتابع لا بالتوازي، ومحاولة واحدة لكل مزوّد.** نداءان في وقت واحد
 * يولّدان صورتين ويخصمان رصيدين لطلب واحد، والمستخدمة تشوف واحدة. والإعادة
 * على نفس المزوّد تضاعف الخصم على عطل قائم — فالانتقال يكون لغيره أو نتوقف.
 *
 * والانتقال **مشروط بنوع الخطأ**: عطل عند المزوّد (ضغط، رصيد، مهلة، ٥xx)
 * يستاهل غيره؛ أما خطأ في الطلب (صورة تالفة، رفض محتوى، بيانات ناقصة) فالثاني
 * يرفضه بنفس السبب. التصنيف كله في `types.ts` فما يتفرّق بين مزوّد وآخر.
 *
 * الترتيب من `IMAGE_PROVIDER_PRIORITY` (مثلاً `fal,gemini`)، وغير المهيَّأ
 * يُسقَط قبل أي محاولة — فما نحرق محاولة على مزوّد بلا مفتاح.
 */
import { optionalEnv } from '../env.ts'
import { falImageProvider } from './fal.ts'
import { geminiImageProvider } from './gemini.ts'
import { openRouterImageProvider } from './openRouter.ts'
import {
  ProviderError,
  isRetryable,
  type GenerateInput,
  type ImageGenerationProvider,
  type ProviderId,
} from './types.ts'

export type { ImageGenerationProvider, ProviderId } from './types.ts'
export { ProviderError, classify, contentRefusal, transportFailure } from './types.ts'

const REGISTRY: Record<ProviderId, ImageGenerationProvider> = {
  fal: falImageProvider,
  gemini: geminiImageProvider,
  openrouter: openRouterImageProvider,
}

/**
 * الترتيب الافتراضي: Fal ثم Gemini ثم OpenRouter.
 *
 * متحفّظ عمدًا — الترتيب يقرّر أين يذهب رصيد المستخدمة، فلا يُقلَب من الشيفرة.
 * من أراد OpenRouter أولاً (وهو المزوّد المُختبَر فعليًا عندنا) يضبط
 * `IMAGE_PROVIDER_PRIORITY=openrouter,fal,gemini`.
 */
const DEFAULT_PRIORITY = 'fal,gemini,openrouter'

const isProviderId = (value: string): value is ProviderId => value in REGISTRY

/**
 * المزوّدون المرشَّحون بالترتيب.
 *
 * الأسماء المكرّرة تُسقَط: `fal,fal` في الإعداد يعني محاولتين على نفس المزوّد،
 * وهذا بالضبط ما نمنعه.
 */
export function providersInOrder(
  registry: Record<ProviderId, ImageGenerationProvider> = REGISTRY,
): ImageGenerationProvider[] {
  // إعداد فاضٍ يرجع للافتراضي بدل ما يعطّل التوليد كله بصمت
  const configured = optionalEnv('IMAGE_PROVIDER_PRIORITY').trim() || DEFAULT_PRIORITY

  const ordered: ProviderId[] = []
  for (const name of configured.split(',')) {
    const id = name.trim().toLowerCase()
    if (isProviderId(id) && !ordered.includes(id)) ordered.push(id)
  }

  return ordered.map((id) => registry[id]).filter((provider) => provider.isConfigured())
}

export type GenerationOutcome = {
  image: string
  provider: ProviderId
  usedFallback: boolean
  durationMs: number
}

/**
 * يجرّب المزوّدين بالترتيب حتى ينجح واحد.
 *
 * `candidates` تُحقن في الاختبار؛ الإنتاج يقرأها من البيئة. والسجل يحمل ما
 * يفيد التشخيص وحده — مزوّدًا ومدةً ونوع خطأ — بلا مفاتيح ولا صور ولا برومبت:
 * البرومبت يحمل أسماء قطع المستخدمة وقياساتها.
 */
export async function generateImage(
  input: GenerateInput,
  candidates: ImageGenerationProvider[] = providersInOrder(),
): Promise<GenerationOutcome> {
  if (candidates.length === 0) {
    throw new ProviderError('not-configured', 'التجربة الافتراضية غير مفعّلة.', 503, false)
  }

  const startedAt = Date.now()
  let lastError: unknown

  for (const [index, provider] of candidates.entries()) {
    const attemptedAt = Date.now()
    try {
      const { image } = await provider.generate(input)
      console.info('image generated', {
        provider: provider.id,
        usedFallback: index > 0,
        durationMs: Date.now() - startedAt,
      })
      return {
        image,
        provider: provider.id,
        usedFallback: index > 0,
        durationMs: Date.now() - startedAt,
      }
    } catch (error) {
      lastError = error
      const code = error instanceof ProviderError ? error.code : 'unknown'
      const retryable = isRetryable(error)
      console.error('image generation failed', {
        provider: provider.id,
        code,
        retryable,
        attemptMs: Date.now() - attemptedAt,
      })

      // خطأ الطلب يتوقف هنا: الثاني يرفضه بنفس السبب ويستهلك رصيدًا بلا فائدة
      if (!retryable) throw error
    }
  }

  console.error('all image providers failed', {
    tried: candidates.length,
    durationMs: Date.now() - startedAt,
  })
  throw lastError instanceof ProviderError
    ? lastError
    : new ProviderError('provider-failure', 'ما قدرنا نجهّز الإطلالة هالمرة.', 502, false)
}
