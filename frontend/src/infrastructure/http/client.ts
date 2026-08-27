/**
 * عميل HTTP وحيد لكل نداءات الخادم.
 *
 * كل استدعاء يمر من هنا، فربط الواجهة بالباك-إند يبقى تغييرًا في ملف واحد.
 * الرؤوس والأخطاء والمهلة تُعالج مرة وحدة بدل ما تتكرر في كل فيتشر.
 */
import { env } from '@/shared/config'

export class ApiError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  /** رمز جلسة المستخدمة عند تفعيل الحسابات (المرحلة ١) */
  accessToken?: string
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 30_000

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, accessToken, timeoutMs = DEFAULT_TIMEOUT_MS } = options

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  signal?.addEventListener('abort', () => controller.abort())

  try {
    const response = await fetch(`${env.apiBase}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        ...(env.supabaseAnonKey ? { apikey: env.supabaseAnonKey } : {}),
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      throw new ApiError(
        payload?.code ?? 'request-failed',
        payload?.message ?? 'تعذّر الاتصال بالخادم.',
        response.status,
      )
    }
    return payload as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (controller.signal.aborted) throw new ApiError('timeout', 'انتهت مهلة الطلب.')
    throw new ApiError('network', 'ما قدرنا نوصل للخادم.')
  } finally {
    clearTimeout(timer)
  }
}

/**
 * مسارات Edge Functions في الباك-إند — مصدر واحد يمنع تناثر النصوص.
 * التعريف الكامل لكل مسار في `backend/supabase/functions`.
 */
export const ENDPOINTS = {
  itemsProcess: '/items-process',
  imagesRemoveBackground: '/images-remove-background',
  imagesAnalyze: '/images-analyze',
  itemsFromUrl: '/items-from-url',
  agentChat: '/agent-chat',
  search: '/search',
  share: (token: string) => `/share?token=${encodeURIComponent(token)}`,
} as const
