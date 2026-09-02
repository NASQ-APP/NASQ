/**
 * نداء OpenAI — **لهذي الدالة وحدها**.
 *
 * لماذا هنا لا في `_shared/`: `_shared/agent.ts` طبقة Groq العامة بمفتاحها
 * (`AGENT_API_KEY`) ونماذجها، وتخدم مزايا أخرى. وضع OpenAI فيها يخلط مزوّدين
 * في ملف واحد ويجعل تعديلًا لأجل المساعِدة يُعاد نشره مع كل دالة تستورده.
 *
 * والفصل مقصود ومرئي: مساعدة التنسيق تقرأ `OPENAI_API_KEY`، وما عداها يبقى
 * على Groq بلا مساس.
 *
 * قاعدة أمنية: المفتاح يُقرأ من بيئة الدالة، وما يُرجَّع للمتصفح ولا يُسجَّل.
 */
import { optionalEnv } from '../_shared/env.ts'

const API_URL = 'https://api.openai.com/v1/chat/completions'

/** مهلة قصيرة عمدًا: فهم «أبي فستان» ما يستاهل انتظارًا طويلاً. */
export const INTENT_TIMEOUT_MS = 8_000

export const stylistKey = (): string => optionalEnv('OPENAI_API_KEY')
export const stylistModel = (): string => optionalEnv('STYLIST_OPENAI_MODEL', 'gpt-4o-mini')

export const stylistConfigured = (): boolean => Boolean(stylistKey())

/** أصناف الفشل — كلها تنتهي بالاحتياطي المحلي، لكن السجل يفرّق بينها. */
export type FailureKind =
  | 'not-configured'
  | 'timeout'
  | 'rate-limited'
  | 'quota-exhausted'
  | 'auth'
  | 'bad-request'
  | 'model-not-found'
  | 'provider-error'
  | 'network'
  | 'malformed'

export class IntentError extends Error {
  constructor(readonly kind: FailureKind) {
    super(kind)
  }
}

/**
 * أسماء نفاد الرصيد عند OpenAI — **أكثر من واحد**.
 *
 * كان الفحص على `insufficient_quota` وحده، فجاء الإنتاج بـ
 * `credit_balance_exhausted` وسقط على «ضغط». والفرق ليس تسمية: الضغط يُنتظَر،
 * ونفاد الرصيد لا يزول إلا بالدفع — فانتظاره تكرارٌ لما لن ينجح على حساب فارغ.
 *
 * وهي قائمة لأنها ستطول: المزوّد يبدّل صياغاته، ومقارنة واحدة تكسر عند أول
 * صياغة جديدة. ومن رأى صياغة رابعة يضيفها هنا لا في شرطٍ متشعّب.
 */
const QUOTA_CODES = new Set([
  'insufficient_quota',
  'credit_balance_exhausted',
  'billing_hard_limit_reached',
])

/**
 * الرمز وحده لا يكفي — **٤٢٩ عند OpenAI معنيان**.
 *
 * والتمييز في `error.code` داخل الجسم — وهو حقلٌ آمن: صنفٌ ثابت بلا مفتاح ولا
 * صدى لكلام المستخدمة. ولا نقرأ `error.message`: قد يردّد ما أُرسل.
 *
 * مُصدَّرة لتُختبَر: تصنيفٌ يقرّر «أنعيد المحاولة أم لا» لا يصحّ أن يُتحقَّق
 * منه بنداء حيّ للمزوّد.
 */
export const classify = (status: number, code?: string): FailureKind => {
  if (status === 429) return code && QUOTA_CODES.has(code) ? 'quota-exhausted' : 'rate-limited'
  if (status === 401 || status === 403) return 'auth'
  if (status === 404) return 'model-not-found'
  if (status === 400) return 'bad-request'
  return 'provider-error'
}

/**
 * هل تنفع الإعادة؟
 *
 * صريحةٌ لا مشتقّة من الرمز: نفادُ الرصيد و`400` و`401` كلها تعود بنفس الجواب
 * مهما أُعيدت، وإعادتها تُنفق وقت المستخدمة على ما لا يتغيّر.
 */
export const isRetryable = (kind: FailureKind): boolean =>
  kind === 'rate-limited' || kind === 'timeout' || kind === 'network' || kind === 'provider-error'

/** يقرأ صنف الخطأ وحده من جسم الردّ — بلا نصّه. */
async function upstreamCode(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { error?: { code?: unknown; type?: unknown } }
    const code = body.error?.code ?? body.error?.type
    return typeof code === 'string' ? code : undefined
  } catch {
    return undefined
  }
}

/**
 * نداء واحد يرجّع نصّ JSON خامًا. التحقّق مسؤولية من طلب.
 *
 * `response_format: json_object` يضمن **شكلاً** لا **صحّةً**: النموذج قد يرجّع
 * JSON سليم البناء بحقول لا نعرفها. فالتحقّق بعده لا بديل عنه.
 */
export async function extractIntentJson(
  system: string,
  user: string,
  signal: AbortSignal,
): Promise<string> {
  if (!stylistConfigured()) throw new IntentError('not-configured')

  let response: Response
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      signal,
      headers: {
        authorization: `Bearer ${stylistKey()}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: stylistModel(),
        temperature: 0,
        // سقف ضيّق: المخرَج بنية صغيرة، والفائض كلفة بلا فائدة
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    })
  } catch (error) {
    if (signal.aborted) throw new IntentError('timeout')
    console.error('stylist intent unreachable', { name: (error as Error)?.name })
    throw new IntentError('network')
  }

  if (!response.ok) {
    /*
      الحالة **والصنف** — لا الجسم.

      كان يُسجَّل الرمز وحده، فصارت كل إخفاقات OpenAI تبدو واحدة في السجل
      وتصل الواجهة ٥٠٢ مبهمة: لا نعرف أنفدَ الرصيد أم ضاق المعدّل أم بطل
      المفتاح. والصنف يحسمها بلا أن يكشف شيئًا.
    */
    const code = await upstreamCode(response)
    console.error('stylist intent rejected', {
      feature: 'stylist',
      provider: 'openai',
      stage: 'upstream-response',
      upstream_status: response.status,
      error_category: code ?? 'unknown',
    })
    throw new IntentError(classify(response.status, code))
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[]
  }

  const content = payload.choices?.[0]?.message?.content
  if (!content) throw new IntentError('malformed')
  return content
}
