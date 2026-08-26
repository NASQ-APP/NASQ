/**
 * الخدمة المركزية لتصنيف صورة القطعة (A-07).
 *
 * نفس عقد إزالة الخلفية: النداء الوحيد للخادم يعيش هنا، والمكوّنات ما تعرف
 * مزوّدًا ولا مسارًا. المفتاح في دالة الحافة حصريًا (§17).
 *
 * لو ما فيه مزوّد مفعّل، ترجّع `undefined` بهدوء — اللون يبقى يُقرأ محليًا،
 * وباقي الحقول تنتظر المستخدمة بدل ما نخترع لها قيمًا.
 */
import { ENDPOINTS } from '@/infrastructure/http/client'
import { env } from '@/shared/config'
import type { GarmentAnalysis } from '@/domain/images'

const TIMEOUT_MS = 30_000

export async function analyzeGarment(
  image: Blob,
  signal?: AbortSignal,
): Promise<GarmentAnalysis | undefined> {
  const body = new FormData()
  body.append('image', image, 'image')

  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(), TIMEOUT_MS)
  signal?.addEventListener('abort', () => timeout.abort(signal.reason))

  try {
    const response = await fetch(`${env.apiBase}${ENDPOINTS.imagesAnalyze}`, {
      method: 'POST',
      body,
      signal: timeout.signal,
      headers: env.supabaseAnonKey ? { apikey: env.supabaseAnonKey } : undefined,
    })

    if (!response.ok) return undefined

    const payload: unknown = await response.json()
    return isAnalysis(payload) ? payload : undefined
  } catch (error) {
    if (signal?.aborted) throw error
    // التصنيف كماليّ: فشله ما يوقف إضافة القطعة
    return undefined
  } finally {
    clearTimeout(timer)
  }
}

const isString = (value: unknown): value is string => typeof value === 'string'

function isAnalysis(payload: unknown): payload is GarmentAnalysis {
  if (!payload || typeof payload !== 'object') return false
  const value = payload as Record<string, unknown>
  return (
    (value.categoryId === undefined || isString(value.categoryId)) &&
    (value.shape === undefined || isString(value.shape)) &&
    (value.colorName === undefined || isString(value.colorName)) &&
    (value.name === undefined || isString(value.name)) &&
    (value.brand === undefined || isString(value.brand))
  )
}
