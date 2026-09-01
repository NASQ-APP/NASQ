/**
 * مزوّد Fal.
 *
 * قاعدة أمنية (§17): `FAL_KEY` يُقرأ من بيئة الدالة فقط، وما يُرجَّع للمتصفح
 * ولا يُسجَّل. ولا نسجّل الصور ولا base64 ولا ردّ المزوّد الخام: كلها تحمل
 * صور المستخدمة.
 *
 * **اسم المودل من البيئة لا من الشيفرة** (`FAL_MODEL`): Fal يبدّل مساراته
 * ويطرح نسخًا جديدة، فتثبيت الاسم هنا يعني نشر دالة لتغيير سطر إعداد.
 *
 * ثلاثة أشكال للرد نتعامل معها كلها:
 *   ١. **متزامن** — `fal.run` يرجّع `{ images: [{ url }] }` في نفس الطلب.
 *   ٢. **طابور** — يرجّع `status_url` فنستفسر عنه حتى `COMPLETED` ثم نقرأ
 *      `response_url`. المودلات الثقيلة تسلك هذا الطريق تحت الضغط.
 *   ٣. **مصفوفة أو صورة واحدة** — `images[]` أو `image` أو `url` مجرّدًا،
 *      وكل عنصر إما كائن فيه `url` أو نصًّا مباشرًا.
 *
 * ونستعمل REST لا الـSDK: الـSDK مبني على npm ويجرّ اعتماديات لا تلزم داخل
 * Deno، والعقد هنا ثلاثة مسارات معروفة — فالمكسب لا يوازي الوزن.
 */
import { optionalEnv } from '../env.ts'
import {
  MAX_RESULT_BYTES,
  classify,
  encodeBase64,
  transportFailure,
  type GenerateInput,
  type ImageGenerationProvider,
} from './types.ts'

/** أقصى انتظار للطابور — يبقى تحت مهلة الدالة فيبقى الخطأ مفهومًا. */
const POLL_TIMEOUT_MS = 100_000

/** فترة الاستفسار: أقصر يضغط بلا فائدة، وأطول يضيّع ثواني على نتيجة جاهزة. */
const POLL_INTERVAL_MS = 1_500

type FalImage = { url?: string; content_type?: string }

type FalPayload = {
  images?: (FalImage | string)[]
  image?: FalImage | string
  url?: string
  status?: string
  request_id?: string
  status_url?: string
  response_url?: string
}

const key = () => optionalEnv('FAL_KEY')
const model = () => optionalEnv('FAL_MODEL')

const authHeaders = () => ({
  authorization: `Key ${key()}`,
  'content-type': 'application/json',
})

/** يلتقط أول رابط صورة مهما كان شكل الرد. */
function firstImageUrl(payload: FalPayload): string | undefined {
  const fromEntry = (entry: FalImage | string | undefined): string | undefined => {
    if (typeof entry === 'string') return entry
    if (entry && typeof entry === 'object' && typeof entry.url === 'string') return entry.url
    return undefined
  }

  for (const candidate of payload.images ?? []) {
    const url = fromEntry(candidate)
    if (url) return url
  }
  return fromEntry(payload.image) ?? (typeof payload.url === 'string' ? payload.url : undefined)
}

/** ينزّل الصورة ويحوّلها `data:` URL — الرابط عند Fal مؤقّت. */
async function toDataUrl(url: string, signal: AbortSignal): Promise<string> {
  // بعض المودلات ترجّع الصورة مضمّنة بلا رابط خارجي
  if (url.startsWith('data:')) return url

  const response = await fetch(url, { signal })
  if (!response.ok) {
    console.error('fal image fetch failed', { status: response.status })
    throw transportFailure('ما قدرنا نقرأ الصورة المولّدة.')
  }

  const buffer = await response.arrayBuffer()
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_RESULT_BYTES) {
    throw transportFailure('الصورة المولّدة غير صالحة.')
  }

  const type = response.headers.get('content-type')?.split(';')[0] || 'image/png'
  return `data:${type};base64,${encodeBase64(new Uint8Array(buffer))}`
}

/**
 * يتابع طلبًا دخل الطابور حتى ينتهي.
 *
 * الحالات الفاشلة تُنهي الانتظار فورًا: الاستمرار في الاستفسار عن طلب مات
 * يستهلك مهلة الدالة كلها ثم يعطي «انتهى الوقت» بدل السبب الحقيقي — والأهم
 * أنه يمنع الانتقال للمزوّد الثاني وقد بقي وقت يكفيه.
 */
async function waitForQueue(payload: FalPayload, signal: AbortSignal): Promise<FalPayload> {
  const statusUrl = payload.status_url
  const responseUrl = payload.response_url
  if (!statusUrl) throw transportFailure()

  const deadline = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < deadline) {
    if (signal.aborted) throw classify(408)
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

    const response = await fetch(statusUrl, { headers: authHeaders(), signal })
    if (!response.ok) {
      console.error('fal status rejected', { status: response.status })
      throw classify(response.status)
    }

    const state = (await response.json()) as FalPayload
    const status = String(state.status ?? '').toUpperCase()

    if (status === 'COMPLETED' || status === 'OK') {
      // بعض المسارات ترجّع النتيجة مع الحالة، وبعضها يخبّئها خلف response_url
      if (firstImageUrl(state)) return state
      if (!responseUrl) throw transportFailure()

      const result = await fetch(responseUrl, { headers: authHeaders(), signal })
      if (!result.ok) {
        console.error('fal result rejected', { status: result.status })
        throw classify(result.status)
      }
      return (await result.json()) as FalPayload
    }

    if (status === 'FAILED' || status === 'ERROR' || status === 'CANCELLED') {
      // ما نسجّل التفاصيل: قد تحمل صدى للطلب وفيه صور المستخدمة
      console.error('fal job failed', { status })
      throw transportFailure()
    }
  }

  throw classify(408)
}

export const falImageProvider: ImageGenerationProvider = {
  id: 'fal',

  isConfigured: () => Boolean(key() && model()),

  async generate({ prompt, images, signal }: GenerateInput) {
    const base = optionalEnv('FAL_API_BASE', 'https://fal.run').replace(/\/+$/, '')

    let response: Response
    try {
      response = await fetch(`${base}/${model()}`, {
        method: 'POST',
        signal,
        headers: authHeaders(),
        body: JSON.stringify({
          prompt,
          // الاسم القياسي لمودلات التحرير في Fal؛ الترتيب هو ترتيب البرومبت
          image_urls: images,
          num_images: 1,
        }),
      })
    } catch (error) {
      if (signal.aborted) throw classify(408)
      // انقطاع شبكة — عطل طريق يستاهل مزوّدًا ثانيًا
      console.error('fal unreachable', { name: (error as Error)?.name })
      throw transportFailure()
    }

    if (!response.ok) {
      // ما نسجّل الجسم: يحمل صدى للطلب وفيه صور المستخدمة
      console.error('fal rejected', { status: response.status })
      throw classify(response.status)
    }

    let payload = (await response.json()) as FalPayload

    // دخل الطابور: نتابعه حتى ينتهي بدل ما نرجّع «ما فيه صورة»
    if (!firstImageUrl(payload) && (payload.status_url || payload.request_id)) {
      payload = await waitForQueue(payload, signal)
    }

    const url = firstImageUrl(payload)
    // رد ناجح بلا صورة: عطل مزوّد لا رفض محتوى — Fal يرد ٤٢٢ صريحًا لو رفض
    if (!url) throw transportFailure()

    return { image: await toDataUrl(url, signal) }
  },
}
