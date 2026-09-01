/**
 * الوكيل النصّي/البصري — **المكان الوحيد الذي يعرف مفاتيح الوكيل**.
 *
 * قاعدة أمنية (§17): المفاتيح تُقرأ هنا فقط. أي ملف آخر يطلب نموذجًا يمرّ من
 * هذي البوابة، فما تتناثر قراءة الأسرار ولا يتسرّب مفتاح إلى سجلّ أو رد.
 *
 * **مفتاحان لا واحد**: `AGENT_API_KEY` و`AGENT_API_KEY2`. المزوّدون يحدّون
 * الطلبات لكل مفتاح، فالثاني ليس نسخة احتياطية بل يضاعف السقف. نبدأ بالأول
 * وننتقل للثاني عند حدّ المعدّل (429) وحده — لا عند كل فشل، لأن مفتاحًا ثانيًا
 * لا يصلح طلبًا خاطئًا.
 *
 * الواجهة متوافقة مع OpenAI (`/chat/completions`) — وهي ما يتكلمه Groq وأكثر
 * المزوّدين، فتبديل المزوّد يصير تغيير `AGENT_API_BASE` لا تغيير شيفرة.
 */
import { optionalEnv, requireEnv } from './env.ts'
import { HandledError } from './response.ts'

export const AGENT_TIMEOUT_MS = 30_000

/** جزء من رسالة — نص أو صورة. الصور تُمرَّر كـdata URL. */
export type AgentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }

export type AgentMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string | AgentPart[]
}

export type AgentRequest = {
  model: string
  messages: AgentMessage[]
  maxTokens?: number
  /** يفرض ردًّا JSON — نستعمله متى ما كان المخرَج مبنيَنًا */
  json?: boolean
  signal: AbortSignal
}

const API_BASE = () => optionalEnv('AGENT_API_BASE', 'https://api.groq.com/openai/v1')

/** المفاتيح المتاحة بالترتيب — الثاني اختياري. */
function keys(): string[] {
  const primary = requireEnv('AGENT_API_KEY')
  const secondary = optionalEnv('AGENT_API_KEY2')
  return secondary ? [primary, secondary] : [primary]
}

/** هل الوكيل مهيّأ أصلاً؟ الغياب ليس خطأ — الميزات التي تعتمده تتنحّى بهدوء. */
export const agentConfigured = (): boolean => Boolean(optionalEnv('AGENT_API_KEY'))

/**
 * نداء واحد للوكيل.
 *
 * يرجّع نصّ الرد الخام. التفسير (JSON أو غيره) مسؤولية من طلب — الوكيل ما
 * يفترض شكل المخرَج.
 */
export async function agentChat(request: AgentRequest): Promise<string> {
  const available = keys()

  for (const [index, key] of available.entries()) {
    const response = await fetch(`${API_BASE()}/chat/completions`, {
      method: 'POST',
      signal: request.signal,
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        max_tokens: request.maxTokens ?? 600,
        ...(request.json ? { response_format: { type: 'json_object' } } : {}),
        messages: request.messages,
      }),
    })

    // حدّ المعدّل وحده يستحق مفتاحًا آخر: الطلب سليم والسقف امتلأ
    if (response.status === 429 && index < available.length - 1) {
      console.warn('[agent] rate limited, switching key', { model: request.model })
      continue
    }

    if (response.status === 429) {
      throw new HandledError('rate-limited', 'وصلنا حد المعالجة الحالي.', 429)
    }

    if (!response.ok) {
      // ما نسجّل الجسم: قد يحمل صدى للصورة أو للمحتوى
      console.error('[agent] rejected', { status: response.status, model: request.model })
      throw new HandledError('provider-failed', 'تعذّر تنفيذ الطلب.', 502)
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    return payload.choices?.[0]?.message?.content ?? ''
  }

  // لا يُبلَغ: الحلقة إمّا ترجع أو ترمي
  throw new HandledError('provider-failed', 'تعذّر تنفيذ الطلب.', 502)
}
