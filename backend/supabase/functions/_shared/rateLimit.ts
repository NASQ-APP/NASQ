/**
 * حد بسيط للطلبات داخل نسخة الدالة الواحدة.
 *
 * غايته منع الضغط المتكرر على زر الرفع من استنزاف حصّة المزوّد. حد دقيق عبر
 * كل النسخ يحتاج جدولاً في القاعدة — يُضاف لما يصير فيه استخدام حقيقي يبرّره.
 */
const WINDOW_MS = 60_000

const hits = new Map<string, number[]>()

export function withinRateLimit(key: string, max: number): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS)

  if (recent.length >= max) {
    hits.set(key, recent)
    return false
  }

  recent.push(now)
  hits.set(key, recent)

  // تنظيف كسول حتى لا تكبر الخريطة بلا حدود
  if (hits.size > 500) {
    for (const [id, times] of hits) {
      if (times.every((at) => now - at >= WINDOW_MS)) hits.delete(id)
    }
  }

  return true
}
