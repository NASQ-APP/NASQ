/**
 * نظام الفئات — مقود بالبيانات: نموذج الإضافة وفلاتر الخزانة وطبقات التجربة
 * كلها تقرأ من هنا، فإضافة فئة جديدة ما تحتاج لمس أي مكوّن واجهة.
 */
import type { BodySlot, Gender, WardrobeCategory } from './types'

export const CATEGORIES: WardrobeCategory[] = [
  // ---------- women ----------
  { id: 'women-tshirts', name: 'تيشيرتات', nameLatin: 'T-Shirts', gender: 'female', slot: 'top', group: 'clothing' },
  { id: 'women-shirts', name: 'قمصان', nameLatin: 'Shirts', gender: 'female', slot: 'top', group: 'clothing' },
  { id: 'women-blouses', name: 'بلوزات', nameLatin: 'Blouses', gender: 'female', slot: 'top', group: 'clothing' },
  { id: 'women-tops', name: 'توبات', nameLatin: 'Tops', gender: 'female', slot: 'top', group: 'clothing' },
  { id: 'women-sweaters', name: 'كنزات', nameLatin: 'Sweaters', gender: 'female', slot: 'top', group: 'clothing' },
  { id: 'women-hoodies', name: 'هوديز', nameLatin: 'Hoodies', gender: 'female', slot: 'top', group: 'clothing' },
  { id: 'women-jackets', name: 'جاكيتات', nameLatin: 'Jackets', gender: 'female', slot: 'outer', group: 'clothing' },
  { id: 'women-coats', name: 'معاطف', nameLatin: 'Coats', gender: 'female', slot: 'outer', group: 'clothing' },
  { id: 'women-dresses', name: 'فساتين', nameLatin: 'Dresses', gender: 'female', slot: 'full', group: 'clothing' },
  { id: 'women-abayas', name: 'عبايات', nameLatin: 'Abayas', gender: 'female', slot: 'full', group: 'clothing' },
  { id: 'women-skirts', name: 'تنانير', nameLatin: 'Skirts', gender: 'female', slot: 'bottom', group: 'clothing' },
  { id: 'women-pants', name: 'بناطيل', nameLatin: 'Pants', gender: 'female', slot: 'bottom', group: 'clothing' },
  { id: 'women-jeans', name: 'جينز', nameLatin: 'Jeans', gender: 'female', slot: 'bottom', group: 'clothing' },
  { id: 'women-shorts', name: 'شورتات', nameLatin: 'Shorts', gender: 'female', slot: 'bottom', group: 'clothing' },
  { id: 'women-shoes', name: 'أحذية', nameLatin: 'Shoes', gender: 'female', slot: 'shoes', group: 'shoes' },
  { id: 'women-bags', name: 'حقائب', nameLatin: 'Bags', gender: 'female', slot: 'bag', group: 'bags' },
  { id: 'women-accessories', name: 'إكسسوارات', nameLatin: 'Accessories', gender: 'female', slot: 'accessory', group: 'accessories' },

  // ---------- men ----------
  { id: 'men-tshirts', name: 'تيشيرتات', nameLatin: 'T-Shirts', gender: 'male', slot: 'top', group: 'clothing' },
  { id: 'men-shirts', name: 'قمصان', nameLatin: 'Shirts', gender: 'male', slot: 'top', group: 'clothing' },
  { id: 'men-polos', name: 'بولو', nameLatin: 'Polos', gender: 'male', slot: 'top', group: 'clothing' },
  { id: 'men-sweaters', name: 'كنزات', nameLatin: 'Sweaters', gender: 'male', slot: 'top', group: 'clothing' },
  { id: 'men-hoodies', name: 'هوديز', nameLatin: 'Hoodies', gender: 'male', slot: 'top', group: 'clothing' },
  { id: 'men-jackets', name: 'جاكيتات', nameLatin: 'Jackets', gender: 'male', slot: 'outer', group: 'clothing' },
  { id: 'men-coats', name: 'معاطف', nameLatin: 'Coats', gender: 'male', slot: 'outer', group: 'clothing' },
  { id: 'men-suits', name: 'بدل', nameLatin: 'Suits', gender: 'male', slot: 'full', group: 'clothing' },
  { id: 'men-thobes', name: 'ثياب', nameLatin: 'Thobes', gender: 'male', slot: 'full', group: 'clothing' },
  { id: 'men-pants', name: 'بناطيل', nameLatin: 'Pants', gender: 'male', slot: 'bottom', group: 'clothing' },
  { id: 'men-jeans', name: 'جينز', nameLatin: 'Jeans', gender: 'male', slot: 'bottom', group: 'clothing' },
  { id: 'men-shorts', name: 'شورتات', nameLatin: 'Shorts', gender: 'male', slot: 'bottom', group: 'clothing' },
  { id: 'men-shoes', name: 'أحذية', nameLatin: 'Shoes', gender: 'male', slot: 'shoes', group: 'shoes' },
  { id: 'men-bags', name: 'حقائب', nameLatin: 'Bags', gender: 'male', slot: 'bag', group: 'bags' },
  { id: 'men-accessories', name: 'إكسسوارات', nameLatin: 'Accessories', gender: 'male', slot: 'accessory', group: 'accessories' },
]

export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id)
export const categoriesForGender = (gender: Gender) => CATEGORIES.filter((c) => c.gender === gender)
/**
 * موضع الفئة من الجسم — **والمجهول لا يقود إطلالة**.
 *
 * كان الافتراض `'top'`: أي فئة خارج الجدول تُقرأ قطعةً علوية بصمت. وهذا فسّر
 * عطلين ظهرا معًا في الاستعمال الحقيقي — نظّارة شمسية «تقود الإطلالة» لأنها
 * حُسبت توبًا، وحذاء لوفر لا يُلقى في بحث الأحذية لأنه حُسب توبًا كذلك.
 *
 * و`'accessory'` هو الافتراض الآمن: القطعة المجهولة تُضاف ولا تُبنى عليها.
 * فأسوأ ما يحدث أن تُهمَل، لا أن تحتلّ موضع قطعة أساسية وتفسد الإطلالة كلها.
 *
 * والعلاج الجذري أن تُصنَّف القطعة صحيحًا عند الإضافة — وهذا يبقى في مكانه.
 */
export const slotOfCategory = (id: string): BodySlot =>
  categoryById(id)?.slot ?? 'accessory'

/** فلاتر مواضع الجسم فوق شبكة الخزانة. */
export const SLOT_FILTERS = [
  { slot: 'all', name: 'الكل', nameLatin: 'All' },
  { slot: 'top', name: 'علوي', nameLatin: 'Tops' },
  { slot: 'bottom', name: 'سفلي', nameLatin: 'Bottoms' },
  { slot: 'full', name: 'فساتين وثياب', nameLatin: 'One-piece' },
  { slot: 'outer', name: 'جاكيتات', nameLatin: 'Outerwear' },
  { slot: 'shoes', name: 'أحذية', nameLatin: 'Shoes' },
  { slot: 'bag', name: 'حقائب', nameLatin: 'Bags' },
  { slot: 'accessory', name: 'إكسسوارات', nameLatin: 'Accessories' },
] as const

/** المناسبات المستخدمة عند حفظ إطلالة وعند سؤال الستايليست. */
export const OCCASIONS = [
  { id: 'daily', name: 'يومي' },
  { id: 'university', name: 'الجامعة' },
  { id: 'work', name: 'العمل' },
  { id: 'travel', name: 'السفر' },
  { id: 'event', name: 'مناسبة' },
] as const

export const occasionName = (id: string) => OCCASIONS.find((o) => o.id === id)?.name ?? id
