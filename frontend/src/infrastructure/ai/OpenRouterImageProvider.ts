/**
 * OpenRouter — التنفيذ الوحيد الذي يعرف المزوّد.
 *
 * **هذا الملف هو الحد**: لا مكوّن ولا صفحة تعرف شكل الطلب. الكل يتكلم مع
 * `AIImageProvider`، فنقله لخادم لاحقًا = استبدال هذا الملف بعميل HTTP ينفّذ
 * نفس الواجهة، بلا لمس أي واجهة مستخدم.
 *
 * ولماذا OpenRouter بدل Gemini مباشرة: الحساب المجاني لـGemini يعطي حصة صفر
 * لنماذج الصور، والفوترة المباشرة تمرّ بوسيط إلزامي في السعودية. OpenRouter
 * يمرّر **نفس النموذج** برصيد مدفوع مسبقًا بلا هذا الطريق.
 *
 * ⚠️ **نموذج أولي محلي فقط.** المفتاح يُقرأ من `VITE_OPENROUTER_API_KEY`، وأي
 * متغيّر `VITE_` يُخبز في حزمة البناء ويقدر أي أحد يقرأه — وهنا المفتاح مربوط
 * برصيد حقيقي، فالكشف يعني استهلاك مال. غير صالح للنشر.
 *
 * الصيغة متوافقة مع OpenAI: الصور تدخل في `content` كـ`image_url`، وترجع في
 * `message.images` كـ`data:` URL جاهز للعرض بلا تحويل.
 */
import { env } from '@/shared/config'
import { failure } from '@/domain/tryon'
import {
  buildAdaptModelPrompt,
  buildRegeneratePrompt,
  buildRemoveGarmentPrompt,
  buildReplaceGarmentPrompt,
  buildTryOnPrompt,
} from '@/domain/tryon'
import type {
  AIImageProvider,
  AdaptModelInput,
  ImageReference,
  ImageResult,
  OnStage,
  RegenerateLookInput,
  RemoveGarmentInput,
  ReplaceGarmentInput,
  TryOnInput,
} from '@/domain/tryon'

const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

/** مهلة سخيّة: توليد الصور أبطأ من النص بكثير. */
const TIMEOUT_MS = 120_000

type ImagePart = { type: 'image_url'; image_url: { url: string } }
type TextPart = { type: 'text'; text: string }

type Payload = {
  error?: { code?: number; message?: string }
  choices?: {
    message?: {
      content?: string | null
      images?: { image_url?: { url?: string } }[]
    }
  }[]
}

/** أول صورة في الرد — ترجع كـ`data:` URL كاملاً فتُستعمل كما هي. */
function firstImage(payload: Payload): ImageResult | undefined {
  const url = payload.choices?.[0]?.message?.images?.[0]?.image_url?.url
  if (!url) return undefined
  return { image: url, createdAt: new Date().toISOString() }
}

/** حالة HTTP → سبب مفهوم. الرصيد المنتهي غير الضغط، وخلطهما يضلّل. */
function codeFor(status: number) {
  if (status === 401 || status === 403) return 'not-configured' as const
  if (status === 402) return 'no-credit' as const
  if (status === 429) return 'rate-limited' as const
  if (status === 408 || status === 504) return 'timeout' as const
  return 'provider-failure' as const
}

/**
 * النداء الوحيد.
 *
 * العمليات الخمس تختلف في **ترتيب الصور ونص البرومبت** فقط، فتشترك في هذي
 * الدالة بدل ما تتكرر خمس مرات وتتفرّق مع الوقت.
 */
async function generate(
  images: ImageReference[],
  prompt: string,
  signal?: AbortSignal,
): Promise<ImageResult> {
  const key = env.openRouterApiKey
  if (!key) throw failure('not-configured')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  signal?.addEventListener('abort', () => controller.abort())

  // ترتيب الأجزاء يطابق ترقيم البرومبت: الصور بالتسلسل ثم النص
  const content: (ImagePart | TextPart)[] = [
    ...images.map((url): ImagePart => ({ type: 'image_url', image_url: { url } })),
    { type: 'text', text: prompt },
  ]

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        // يعرّفان التطبيق في لوحة OpenRouter — اختياريان ومفيدان لتتبّع الاستهلاك
        'HTTP-Referer': window.location.origin,
        'X-Title': 'NASQ',
      },
      body: JSON.stringify({
        model: env.openRouterImageModel,
        // بدونها يرد النموذج بنص يصف الصورة بدل أن يولّدها
        modalities: ['image', 'text'],
        messages: [{ role: 'user', content }],
      }),
    })

    if (!response.ok) {
      // جسم الرد قد يحمل صدى للطلب — نسجّل الحالة وحدها ولا نعرضها للمستخدمة
      console.error('[openrouter]', response.status, env.openRouterImageModel)
      throw failure(codeFor(response.status))
    }

    const payload = (await response.json()) as Payload

    // OpenRouter يرجّع أخطاء المزوّد أحيانًا داخل رد ٢٠٠
    if (payload.error) {
      console.error('[openrouter] provider error', payload.error.code)
      throw failure(codeFor(payload.error.code ?? 0))
    }

    const result = firstImage(payload)
    // رد بنص بلا صورة = رفض النموذج التوليد، لا عطل في الشبكة
    if (!result) {
      throw failure(payload.choices?.[0]?.message?.content ? 'blocked' : 'provider-failure')
    }
    return result
  } catch (error) {
    if (controller.signal.aborted) throw failure('timeout')
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export const openRouterImageProvider: AIImageProvider = {
  id: 'openrouter',

  async generateTryOn(input: TryOnInput, onStage?: OnStage, signal?: AbortSignal) {
    if (!input.personImage) throw failure('missing-person')
    if (input.garments.length === 0) throw failure('missing-garments')

    onStage?.('model')
    onStage?.('garments')
    // ترتيب الصور يطابق ترقيم البرومبت: الشخص أولًا ثم القطع بالتسلسل
    const images = [input.personImage, ...input.garments.map((garment) => garment.image)]

    onStage?.('compose')
    const result = await generate(
      images,
      buildTryOnPrompt(input.garments, input.bodyParameters, input.instruction),
      signal,
    )

    onStage?.('finalize')
    return result
  },

  async adaptModel(input: AdaptModelInput, onStage?: OnStage, signal?: AbortSignal) {
    onStage?.('model')
    return generate(
      [input.baseImage],
      buildAdaptModelPrompt(input.bodyParameters, input.refinement),
      signal,
    )
  },

  async replaceGarment(input: ReplaceGarmentInput, onStage?: OnStage, signal?: AbortSignal) {
    onStage?.('compose')
    // الإطلالة الحالية أولًا ثم القطعة الجديدة — البرومبت يشير إليهما بالرقم
    return generate(
      [input.currentLook, input.garment.image],
      buildReplaceGarmentPrompt(input.garment, input.keep),
      signal,
    )
  },

  async removeGarment(input: RemoveGarmentInput, onStage?: OnStage, signal?: AbortSignal) {
    onStage?.('compose')
    return generate([input.currentLook], buildRemoveGarmentPrompt(input.garment, input.keep), signal)
  },

  async regenerateLook(input: RegenerateLookInput, onStage?: OnStage, signal?: AbortSignal) {
    if (!input.personImage) throw failure('missing-person')
    if (input.garments.length === 0) throw failure('missing-garments')

    onStage?.('compose')
    const images = [
      input.personImage,
      ...input.garments.map((garment) => garment.image),
      ...(input.previousLook ? [input.previousLook] : []),
    ]

    const result = await generate(
      images,
      buildRegeneratePrompt(
        input.garments,
        Boolean(input.previousLook),
        input.bodyParameters,
        input.instruction,
      ),
      signal,
    )

    onStage?.('finalize')
    return result
  },
}
