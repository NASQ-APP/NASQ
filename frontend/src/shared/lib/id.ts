/** معرّف قصير فريد للعناصر المنشأة في المتصفح. */
export const uid = (prefix = 'id'): string =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`

/**
 * بذرة رقمية ثابتة من نص (FNV-1a).
 * نفس المواصفات ← نفس البذرة ← نفس الشخص في كل توليد (المبدأ ٣).
 */
export function seedFrom(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h % 1_000_000)
}

/**
 * معرّف UUID.
 *
 * صفوف القاعدة مفاتيحها `uuid`، ونولّده **عندنا** لا عند الخادم: فالواجهة
 * ترسم القطعة فورًا بمعرّفها النهائي، وما نحتاج نستبدل معرّفًا مؤقتًا بعد ردّ الخادم.
 * وإعادة الإرسال تصير آمنة: نفس المفتاح يعني نفس الصف، مو صفًا ثانيًا.
 */
export const uuid = (): string => crypto.randomUUID()
