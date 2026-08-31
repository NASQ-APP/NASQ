/**
 * الترجمة بين صفوف القاعدة وأنواع المجال.
 *
 * القاعدة تكتب `snake_case` والمجال `camelCase`، وهذا الملف هو **الحدّ الوحيد**
 * بينهما: لا صفحة تعرف اسم عمود، ولا استعلام يعرف نوع مجال. لو تغيّر عمود
 * تغيّر هنا وحده.
 *
 * ثلاثة فروق تستاهل الانتباه:
 *
 * ١. **الخزانة علاقة لا عمود.** القطعة في القاعدة تنتمي لخزائن (جدول
 *    `item_closets`) بينما المجال يعرف خزانة واحدة. نقرأ أول ارتباط ونكتب
 *    ارتباطًا واحدًا — التعدّد متاح في القاعدة لو احتجناه لاحقًا بلا هجرة.
 *
 * ٢. **السعر نصّ لا رقم.** `price` في القاعدة `numeric` للحساب، والمجال يعرض
 *    ما كتبه المتجر كما هو («٢٩٩ ر.س»). فنستعمل `price_label`.
 *
 * ٣. **الحقول الفارغة `null` لا `undefined`.** المجال يستعمل `undefined`،
 *    وPostgres يستعمل `null`. التحويل هنا في الاتجاهين.
 */
import type { GarmentShape, ItemSource, Wardrobe, WardrobeItem } from '@/domain/wardrobe'
import type { Tables, TablesInsert } from '@/infrastructure/supabase'

type ClosetRow = Tables<'closets'>
type ItemRow = Tables<'items'>

/** صفّ قطعة مع خزائنها — شكل ما يرجّعه استعلام القراءة المتداخل. */
export type ItemRowWithClosets = ItemRow & {
  item_closets: { closet_id: string }[] | null
}

const orNull = <T,>(value: T | undefined): T | null => value ?? null
const orUndefined = <T,>(value: T | null): T | undefined => value ?? undefined

/* ---------------- الخزائن ---------------- */

export const toWardrobe = (row: ClosetRow): Wardrobe => ({
  id: row.id,
  name: row.name,
  nameLatin: row.name_latin,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const toClosetInsert = (
  wardrobe: Wardrobe,
  userId: string,
  sortOrder: number,
): TablesInsert<'closets'> => ({
  id: wardrobe.id,
  user_id: userId,
  name: wardrobe.name,
  name_latin: wardrobe.nameLatin,
  sort_order: sortOrder,
  created_at: wardrobe.createdAt,
  updated_at: wardrobe.updatedAt,
})

/* ---------------- القطع ---------------- */

export const toItem = (row: ItemRowWithClosets): WardrobeItem => ({
  id: row.id,
  name: row.name,
  nameLatin: orUndefined(row.name_latin),

  categoryId: row.category_id,
  shape: row.shape as GarmentShape,
  colorHex: row.color_hex,
  colorName: row.color_name,

  imageUrl: orUndefined(row.image_url),
  images: row.images.length > 0 ? row.images : undefined,
  imageHasModel: row.image_has_model,
  imageChosenByUser: row.image_chosen_by_user,

  // قطعة التجربة ضيفة — ما تنتمي لخزانة حتى لو انربطت بواحدة سهوًا
  wardrobeId: row.source === 'try' ? null : (row.item_closets?.[0]?.closet_id ?? null),
  source: row.source as ItemSource,

  size: orUndefined(row.size),
  brand: orUndefined(row.brand),
  notes: orUndefined(row.notes),
  favorite: row.is_favorite,

  storeId: orUndefined(row.store_id),
  sourceLink: orUndefined(row.source_link),
  price: orUndefined(row.price_label),

  addedAt: row.created_at,
})

export const toItemInsert = (item: WardrobeItem, userId: string): TablesInsert<'items'> => ({
  id: item.id,
  user_id: userId,
  name: item.name,
  name_latin: orNull(item.nameLatin),

  category_id: item.categoryId,
  shape: item.shape,
  color_hex: item.colorHex,
  color_name: item.colorName,

  image_url: orNull(item.imageUrl),
  images: item.images ?? [],
  image_has_model: item.imageHasModel ?? false,
  image_chosen_by_user: item.imageChosenByUser ?? false,

  source: item.source,
  size: orNull(item.size),
  brand: orNull(item.brand),
  notes: orNull(item.notes),
  is_favorite: item.favorite,

  store_id: orNull(item.storeId),
  source_link: orNull(item.sourceLink),
  price_label: orNull(item.price),

  created_at: item.addedAt,
})

/**
 * التعديل الجزئي: نترجم **الحقول الموجودة فقط**.
 *
 * لو بنينا الصفّ كاملًا ثم أرسلناه، صار كل تعديل يكتب كل عمود — فيمحو تعديلًا
 * وصل من جهاز ثاني بين القراءة والكتابة. الترجمة الانتقائية تحصر الكتابة فيما
 * قصدته المستخدمة فعلاً.
 */
export function toItemPatch(patch: Partial<WardrobeItem>): Partial<TablesInsert<'items'>> {
  const row: Partial<TablesInsert<'items'>> = {}

  if ('name' in patch) row.name = patch.name
  if ('nameLatin' in patch) row.name_latin = orNull(patch.nameLatin)
  if ('categoryId' in patch) row.category_id = patch.categoryId
  if ('shape' in patch) row.shape = patch.shape
  if ('colorHex' in patch) row.color_hex = patch.colorHex
  if ('colorName' in patch) row.color_name = patch.colorName
  if ('imageUrl' in patch) row.image_url = orNull(patch.imageUrl)
  if ('images' in patch) row.images = patch.images ?? []
  if ('imageHasModel' in patch) row.image_has_model = patch.imageHasModel ?? false
  if ('imageChosenByUser' in patch) row.image_chosen_by_user = patch.imageChosenByUser ?? false
  if ('source' in patch) row.source = patch.source
  if ('size' in patch) row.size = orNull(patch.size)
  if ('brand' in patch) row.brand = orNull(patch.brand)
  if ('notes' in patch) row.notes = orNull(patch.notes)
  if ('favorite' in patch) row.is_favorite = patch.favorite
  if ('storeId' in patch) row.store_id = orNull(patch.storeId)
  if ('sourceLink' in patch) row.source_link = orNull(patch.sourceLink)
  if ('price' in patch) row.price_label = orNull(patch.price)

  return row
}
