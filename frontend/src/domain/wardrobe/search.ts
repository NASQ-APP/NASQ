/**
 * تطبيع النص العربي قبل البحث.
 *
 * المستخدمة تكتب «قميص ابيض» وتتوقّع تلقى «قميص أبيض». والفرق بين الألفات
 * والتاء المربوطة والياء المقصورة إملائي، ما يغيّر المقصود — فنوحّدها على
 * الطرفين قبل المقارنة.
 *
 * منطق نقي: نصّ يدخل ونصّ يخرج، بلا حالة ولا DOM.
 */

/** التشكيل والتطويل — زخرفة تُسقط قبل المقارنة. */
const DIACRITICS = /[ً-ْٰـ]/g

const FOLD: Record<string, string> = {
  أ: 'ا',
  إ: 'ا',
  آ: 'ا',
  ٱ: 'ا',
  ة: 'ه',
  ى: 'ي',
  ئ: 'ي',
  ؤ: 'و',
}

export function normalizeArabic(value: string): string {
  return value
    .replace(DIACRITICS, '')
    .replace(/[أإآٱةىئؤ]/g, (letter) => FOLD[letter] ?? letter)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * هل يطابق النص كل كلمات الاستعلام؟
 * الكلمات تُطابَق مستقلة، فـ«ابيض قميص» تلقى «قميص أبيض».
 */
export function matchesQuery(haystack: string, query: string): boolean {
  const needle = normalizeArabic(query)
  if (!needle) return true

  const target = normalizeArabic(haystack)
  return needle.split(' ').every((word) => target.includes(word))
}
