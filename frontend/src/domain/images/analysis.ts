/**
 * تعبئة حقول القطعة من صورتها (A-07).
 *
 * كل حقل **اقتراح قابل للتعديل، مو أمرًا نهائيًا**. الذكاء يخطئ، فالمستخدمة
 * تشوف ما اقترحه وتعدّله قبل الحفظ.
 *
 * منطق نقي: يحوّل ما يرجّعه المزوّد لقيم يعرفها التطبيق، ويرمي أي شي ما يطابق
 * فئاتنا بدل ما يخترع فئة جديدة.
 */
import { CATEGORIES, ITEM_COLORS, categoryById, shapesForSlot } from '@/domain/wardrobe'
import type { Gender, GarmentShape } from '@/domain/wardrobe'

/** ما يرجّعه المزوّد — كله اختياري لأن أي حقل ممكن ما يتعرّف عليه. */
export type GarmentAnalysis = {
  categoryId?: string
  shape?: string
  colorName?: string
  /** اسم مقترح بالعربي */
  name?: string
  brand?: string
  /** ثقة المزوّد بين ٠ و١ — نستخدمها للتنبيه لا للرفض */
  confidence?: number
}

/** الحقول الجاهزة للتطبيق على المسودّة، بعد التحقق من كل قيمة. */
export type FieldSuggestion = {
  categoryId?: string
  shape?: GarmentShape
  colorName?: string
  colorHex?: string
  name?: string
  brand?: string
  /** أسماء الحقول اللي تعبّت فعلاً — تُعلَّم في الواجهة كاقتراح */
  filled: string[]
}

const isKnownColor = (name?: string) => ITEM_COLORS.some((color) => color.name === name)

/**
 * يحوّل مخرج المزوّد لقيم صالحة. أي قيمة ما نعرفها تُسقط بصمت — الحقل يبقى
 * فاضيًا وتعبّيه المستخدمة، وهذا أفضل من قيمة مخترعة (المبدأ ٤).
 */
export function toFieldSuggestion(analysis: GarmentAnalysis, gender: Gender): FieldSuggestion {
  const filled: string[] = []
  const suggestion: FieldSuggestion = { filled }

  const category = CATEGORIES.find(
    (item) => item.id === analysis.categoryId && item.gender === gender,
  )
  if (category) {
    suggestion.categoryId = category.id
    filled.push('categoryId')

    // الشكل لازم ينتمي لموضع الفئة نفسها، وإلا نأخذ أول شكل فيها
    const allowed = shapesForSlot(category.slot)
    const shape = allowed.find((option) => option.id === analysis.shape)
    suggestion.shape = shape?.id ?? allowed[0].id
    if (shape) filled.push('shape')
  }

  if (isKnownColor(analysis.colorName)) {
    const color = ITEM_COLORS.find((item) => item.name === analysis.colorName)!
    suggestion.colorName = color.name
    suggestion.colorHex = color.hex
    filled.push('colorName')
  }

  const name = analysis.name?.trim()
  if (name) {
    suggestion.name = name.slice(0, 60)
    filled.push('name')
  }

  const brand = analysis.brand?.trim()
  if (brand) {
    suggestion.brand = brand.slice(0, 40)
    filled.push('brand')
  }

  return suggestion
}

/** اسم عربي بسيط من الشكل واللون — يُستعمل لما ما يقترح المزوّد اسمًا. */
export function nameFrom(categoryId: string | undefined, colorName: string | undefined): string {
  const shapeName = categoryId ? shapeLabel(categoryId) : undefined
  return [shapeName, colorName].filter(Boolean).join(' ')
}

function shapeLabel(categoryId: string): string | undefined {
  const category = categoryById(categoryId)
  if (!category) return undefined
  return shapesForSlot(category.slot).find((shape) => shape.id)?.name
}
