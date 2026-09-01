/**
 * مزوّد OpenRouter.
 *
 * قاعدة أمنية (§17): `OPENROUTER_API_KEY` يُقرأ من بيئة الدالة فقط، وما
 * يُرجَّع للمتصفح ولا يُسجَّل. ولا نسجّل الصور ولا base64 ولا ردّ المزوّد
 * الخام: كلها تحمل صور المستخدمة.
 *
 * **لماذا يستحق مكانًا هنا**: هو المزوّد الوحيد الذي اختُبر فعليًا في هذا
 * المشروع ونجح — صورة مولّدة بالقياس. وكان يعيش في دالة `tryon` منفصلة خارج
 * الراوتر، فصار للتوليد مساران لا يعرف أحدهما الآخر. مكانه الصحيح مزوّدًا
 * ثالثًا هنا، فيخضع لنفس الترتيب ونفس تصنيف الأخطاء ونفس السجلّ.
 *
 * الصيغة متوافقة مع OpenAI: الصور تدخل `content` كـ`image_url` بترتيب
 * البرومبت، وترجع في `message.images` كـ`data:` URL جاهز بلا تحويل — فلا
 * يحتاج تنزيلاً لاحقًا بخلاف Fal.
 */
import { optionalEnv } from '../env.ts'
import {
  classify,
  contentRefusal,
  transportFailure,
  type GenerateInput,
  type ImageGenerationProvider,
} from './types.ts'

const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

/**
 * قيمة ترويسة HTTP لا تقبل إلا ASCII.
 *
 * `X-Title` كانت تُبنى من `APP_NAME` مباشرة، و`APP_NAME` عربي («نَسّق»).
 * فيرمي `fetch` **TypeError عند بناء الطلب** — قبل أي اتصال، في مللي ثانيتين،
 * ويُصنَّف «المزوّد لا يُوصَل إليه» فيموت التوليد كله بسبب اسمٍ تجميلي.
 *
 * العطل كان كامنًا: الاستوديو ما كان يصل OpenRouter أصلاً (gemini ثم fal)،
 * فما ظهر إلا حين صار المزوّد الوحيد. والدالة القديمة `tryon` تكتب `'NASQ'`
 * ثابتًا فما مسّها.
 *
 * والتنظيف هنا لا في السرّ: الاسم العربي صحيح ومقصود، والخلل في حشره في
 * ترويسة. والترويسة تعريفية للوحة الاستهلاك، فإسقاط غير الـASCII منها لا
 * يفقد شيئًا — وسقوطها كاملة أهون من سقوط الطلب.
 */
export const sanitizeHeaderValue = (value: string, fallback = 'NASAQ'): string =>
  value.replace(/[^\x20-\x7E]/g, '').trim() || fallback

const key = () => optionalEnv('OPENROUTER_API_KEY')
const model = () => optionalEnv('OPENROUTER_IMAGE_MODEL', 'google/gemini-3.1-flash-image')

type Payload = {
  error?: { code?: number; message?: string }
  choices?: {
    message?: {
      content?: string | null
      images?: { image_url?: { url?: string } }[]
    }
  }[]
}

export const openRouterImageProvider: ImageGenerationProvider = {
  id: 'openrouter',

  // المودل له افتراضي صالح، فالمفتاح وحده يقرّر التهيئة
  isConfigured: () => Boolean(key()),

  async generate({ prompt, images, signal }: GenerateInput) {
    let response: Response
    try {
      response = await fetch(API_URL, {
        method: 'POST',
        signal,
        headers: {
          authorization: `Bearer ${key()}`,
          'content-type': 'application/json',
          // يعرّف التطبيق في لوحة OpenRouter — يفيد تتبّع الاستهلاك
          'X-Title': sanitizeHeaderValue(optionalEnv('APP_NAME', 'NASAQ')),
        },
        body: JSON.stringify({
          model: model(),
          // بدونها يرد النموذج بنص يصف الصورة بدل أن يولّدها
          modalities: ['image', 'text'],
          messages: [
            {
              role: 'user',
              content: [
                // الترتيب هو ترتيب البرومبت — يشير للصور بالرقم
                ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
                { type: 'text', text: prompt },
              ],
            },
          ],
        }),
      })
    } catch (error) {
      if (signal.aborted) throw classify(408)
      // انقطاع شبكة — عطل طريق يستاهل مزوّدًا ثانيًا
      console.error('openrouter unreachable', { name: (error as Error)?.name })
      throw transportFailure()
    }

    if (!response.ok) {
      // ما نسجّل الجسم: يحمل صدى للطلب وفيه صور المستخدمة
      console.error('openrouter rejected', { status: response.status })
      throw classify(response.status)
    }

    const payload = (await response.json()) as Payload

    // يرجّع أخطاء المزوّد أحيانًا داخل ردّ ٢٠٠ — نصنّفها بنفس السلّم
    if (payload.error) {
      console.error('openrouter provider error', { code: payload.error.code })
      throw classify(payload.error.code ?? 502)
    }

    const url = payload.choices?.[0]?.message?.images?.[0]?.image_url?.url
    if (url) return { image: url }

    // ردّ بنص بلا صورة = رفض النموذج التوليد. رفض محتوى لا عطل طريق، فما ننتقل
    if (payload.choices?.[0]?.message?.content) throw contentRefusal()

    console.error('openrouter returned no image')
    throw transportFailure()
  },
}
