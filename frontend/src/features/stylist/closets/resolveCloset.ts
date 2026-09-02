/**
 * «خزنة الصيف» — من كلامها إلى خزانة حقيقية.
 *
 * **بلا أي قائمة مواسم مكتوبة.** «الصيف» و«الشتاء» و«السفر» ليست مفاهيم عندنا،
 * بل **أسماء اختارتها المستخدمة لخزائنها**. فمن يكتب `if (name === 'الصيف')`
 * يعمل عند من سمّت خزانتها كذلك، ويفشل عند من سمّتها «الحر» أو «صيفياتي» —
 * والحلّ أن نطابق على خزائنها هي.
 *
 * وفرقٌ لا يجوز خلطه: **«من خزنة الصيف» عضوية، و«شي صيفي» وصف.** الأولى تحدّد
 * نطاق البحث بمعرّف، والثانية تصف القطعة. من خلطهما بحث في كل الخزانة عن
 * «صيفي» وأعطى قطعًا ليست في الخزانة المطلوبة أصلاً.
 */
import type { Wardrobe } from '@/domain/wardrobe'

export type ClosetScope = {
  type: 'all' | 'closet'
  closetId?: string
  closetName?: string
}

export const ALL_CLOSETS: ClosetScope = { type: 'all' }

/** تطبيع عربي — الهمزات والتاء المربوطة والتعريف والتشكيل. */
export const normalizeArabicName = (text: string): string =>
  text
    .replace(/[ـً-ْ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[ةه]/g, 'ه')
    .replace(/^ال/, '')
    .trim()

export type ClosetResolution =
  | { status: 'resolved'; scope: ClosetScope }
  | { status: 'not-found'; name: string }
  | { status: 'ambiguous'; name: string; matches: Wardrobe[] }

/**
 * يطابق الاسم المنطوق على خزائنها هي.
 *
 * ثلاث نتائج لا اثنتان: الغياب يُقال («ما لقيت خزنة باسم الصيف») ولا يُبحَث
 * في كل شيء بصمت — البحث الصامت في غير ما طُلب يعطي جوابًا يبدو صحيحًا وهو
 * عن سؤال آخر.
 */
export function resolveCloset(name: string, closets: Wardrobe[]): ClosetResolution {
  const wanted = normalizeArabicName(name)
  if (!wanted) return { status: 'not-found', name }

  const exact = closets.filter((closet) => normalizeArabicName(closet.name) === wanted)
  if (exact.length === 1) {
    return {
      status: 'resolved',
      scope: { type: 'closet', closetId: exact[0].id, closetName: exact[0].name },
    }
  }
  if (exact.length > 1) return { status: 'ambiguous', name, matches: exact }

  // التطابق الجزئي احتياطًا: «صيفياتي» تُطابق «صيف»
  const partial = closets.filter((closet) => {
    const closetName = normalizeArabicName(closet.name)
    return closetName.includes(wanted) || wanted.includes(closetName)
  })

  if (partial.length === 1) {
    return {
      status: 'resolved',
      scope: { type: 'closet', closetId: partial[0].id, closetName: partial[0].name },
    }
  }
  if (partial.length > 1) return { status: 'ambiguous', name, matches: partial }

  return { status: 'not-found', name }
}
