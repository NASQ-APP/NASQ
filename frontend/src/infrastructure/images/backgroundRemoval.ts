/**
 * الخدمة المركزية لإزالة خلفية الصور.
 *
 * هذا **المكان الوحيد** في الفرونت-إند اللي يعرف كيف تُزال الخلفية. أي مكوّن
 * رفع ينادي `removeImageBackground` ولا يعرف شيئًا عن المزوّد ولا عن المسار.
 *
 * مزوّدان خلف نفس الواجهة، يُختاران بـ`VITE_BACKGROUND_REMOVAL`:
 *
 * | المزوّد | وين يشتغل | يحتاج مفتاح؟ | متى يناسب |
 * |---|---|---|---|
 * | `local` (افتراضي) | المتصفح | لا | خلفية شبه موحّدة — الحالة الشائعة |
 * | `backend` | دالة الحافة | نعم | خلفية مزدحمة تحتاج نموذجًا حقيقيًا |
 *
 * قاعدة أمنية (§17): مفتاح المزوّد الخارجي يعيش في دالة الحافة حصريًا. ما فيه
 * مفتاح في الفرونت-إند ولا في أي متغيّر يبدأ بـ`VITE_` — والمتغيّر هنا اختيار
 * وضع فقط، مو سرًّا.
 */
import { imageError, type ImageError } from '@/domain/images'
import { ENDPOINTS } from '@/infrastructure/http/client'
import { env } from '@/shared/config'

/** يُرمى بدل الأخطاء الخام عشان الواجهة تعرض رسالة مفهومة دائمًا. */
export class ImageProcessingError extends Error {
  readonly detail: ImageError

  constructor(detail: ImageError) {
    super(detail.message)
    this.name = 'ImageProcessingError'
    this.detail = detail
  }
}

const fail = (code: Parameters<typeof imageError>[0]): never => {
  throw new ImageProcessingError(imageError(code))
}

const REQUEST_TIMEOUT_MS = 45_000

/** رموز الخادم → رموز المجال. أي رمز غير معروف يُقرأ كفشل عام. */
const SERVER_CODES: Record<string, Parameters<typeof imageError>[0]> = {
  'not-configured': 'removal-unavailable',
  'unsupported-type': 'unsupported-type',
  'too-large': 'too-large',
  'no-subject': 'removal-empty',
  timeout: 'removal-timeout',
  'rate-limited': 'removal-failed',
}

/**
 * ترسل الصورة للخادم وترجّع نسخة بخلفية شفافة.
 *
 * @throws {ImageProcessingError} دائمًا برسالة عربية جاهزة للعرض.
 * الإلغاء عبر `signal` يرمي `AbortError` الأصلي — المنادي يميّزه ويتجاهله.
 */
export async function removeImageBackground(file: Blob, signal?: AbortSignal): Promise<Blob> {
  if (env.backgroundRemoval !== 'backend') {
    const { removeBackgroundLocally } = await import('./localBackgroundRemoval')
    return removeBackgroundLocally(file)
  }
  return removeBackgroundOnServer(file, signal)
}

/** مسار الخادم — مُصدَّر عشان يُختبر مستقلًا عن اختيار المزوّد. */
export async function removeBackgroundOnServer(
  file: Blob,
  signal?: AbortSignal,
): Promise<Blob> {
  const body = new FormData()
  body.append('image', file, 'image')

  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS)
  signal?.addEventListener('abort', () => timeout.abort(signal.reason))

  let response: Response
  try {
    response = await fetch(`${env.apiBase}${ENDPOINTS.imagesRemoveBackground}`, {
      method: 'POST',
      body,
      signal: timeout.signal,
      headers: env.supabaseAnonKey ? { apikey: env.supabaseAnonKey } : undefined,
    })
  } catch (error) {
    // إلغاء المستخدمة يمر كما هو؛ انقطاع الشبكة يصير خطأ مفهوم
    if (signal?.aborted) throw error
    if (timeout.signal.aborted) return fail('removal-timeout')
    return fail('removal-failed')
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const code = await readErrorCode(response)
    return fail(SERVER_CODES[code] ?? 'removal-failed')
  }

  const blob = await response.blob()
  if (blob.size === 0 || !blob.type.startsWith('image/')) return fail('removal-empty')

  return blob
}

/** الخادم يرجّع JSON عند الخطأ. لو ما رجّع، نكتفي بحالة HTTP. */
async function readErrorCode(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json()
    if (payload && typeof payload === 'object' && 'code' in payload) {
      return String((payload as { code: unknown }).code)
    }
  } catch {
    // جسم غير JSON — نكمّل بالحالة وحدها
  }
  return response.status === 503 ? 'not-configured' : String(response.status)
}
