/**
 * مجال الخزانة.
 *
 * القطعة هنا شيء تملكه المستخدمة فعلاً (أو تجرّبه قبل ما تقرر)، فما فيه سعر بيع
 * ولا مخزون ولا ألوان متعددة — القطعة الحقيقية لون واحد (المبدأ ١).
 */
import type { BodySlot, Gender } from '@/domain/shared/types'

export type { BodySlot, Gender }

/** الشكل المجسّم للقطعة — يحدّد كيف تُرسم وكيف تُلبس على الموديل. */
export type GarmentShape =
  | 'tee'
  | 'shirt'
  | 'blouse'
  | 'polo'
  | 'sweater'
  | 'hoodie'
  | 'jacket'
  | 'coat'
  | 'blazer'
  | 'abaya'
  | 'thobe'
  | 'dress'
  | 'skirt'
  | 'pants'
  | 'jeans'
  | 'shorts'
  | 'sneakers'
  | 'heels'
  | 'boots'
  | 'flats'
  | 'tote'
  | 'shoulderBag'
  | 'clutch'
  | 'scarf'
  | 'sunglasses'
  | 'belt'
  | 'cap'

export type WardrobeCategory = {
  id: string
  name: string
  nameLatin: string
  gender: Gender
  slot: BodySlot
  group: 'clothing' | 'shoes' | 'bags' | 'accessories'
}

export type Wardrobe = {
  id: string
  name: string
  nameLatin: string
  createdAt: string
  updatedAt: string
}

/** من وين جت القطعة. قطع `try` ضيوف — ما تنتمي لأي خزانة (المبدأ ١). */
export type ItemSource = 'wardrobe' | 'try'

export type WardrobeItem = {
  id: string
  name: string
  nameLatin?: string

  categoryId: string
  shape: GarmentShape
  colorHex: string
  colorName: string

  /** صورة القطعة الحقيقية. لو ما وُجدت، تُرسم من `shape` و`colorHex`. */
  imageUrl?: string
  /** بقية صور المنتج عند المتجر — تقدر المستخدمة تختار منها بدل الافتراضية */
  images?: string[]
  /**
   * هل في `imageUrl` عارضة من المتجر؟
   * البطاقة ما تعرض صورة فيها شخص — ترسم القطعة من شكلها ولونها بدلها.
   */
  imageHasModel?: boolean
  /** اختارت المستخدمة هذي الصورة بنفسها، فقرارها يسبق الفحص التلقائي */
  imageChosenByUser?: boolean

  /** فاضية لقطع التجربة */
  wardrobeId: string | null
  source: ItemSource

  size?: string
  brand?: string
  notes?: string
  favorite: boolean

  /** للقطع المستوردة فقط */
  storeId?: string
  sourceLink?: string
  /** سعر القطعة عند المتجر — معلومة تساعد على القرار، مب عرض بيع */
  price?: string

  addedAt: string
}

export type ItemSort = 'recent' | 'name' | 'category'

export type ItemFilter = {
  search?: string
  categoryIds?: string[]
  colorNames?: string[]
  slot?: BodySlot | 'all'
  favoritesOnly?: boolean
  sort?: ItemSort
}
