/**
 * خزانة البداية.
 *
 * الخزانة فيها **قطع**، مو منتجات: كل سطر قطعة واحدة بلون واحد. موجودة عشان
 * التطبيق ما يكون غرفة فاضية عند أول فتح — والمستخدمة تقدر تمسحها من الإعدادات
 * وتصوّر قطعها الحقيقية.
 */
import { colorByName } from '@/domain/wardrobe/colors'
import type { GarmentShape, Wardrobe, WardrobeItem } from '@/domain/wardrobe/types'

const now = '2026-08-01T09:00:00.000Z'

export const SEED_WARDROBES: Wardrobe[] = [
  { id: 'w-summer', name: 'الصيف', nameLatin: 'Summer', createdAt: now, updatedAt: now },
  { id: 'w-winter', name: 'الشتاء', nameLatin: 'Winter', createdAt: now, updatedAt: now },
  { id: 'w-work', name: 'العمل والجامعة', nameLatin: 'Work', createdAt: now, updatedAt: now },
  { id: 'w-events', name: 'المناسبات', nameLatin: 'Occasions', createdAt: now, updatedAt: now },
  { id: 'w-travel', name: 'السفر', nameLatin: 'Travel', createdAt: now, updatedAt: now },
]

type Row = [
  name: string,
  categoryId: string,
  shape: GarmentShape,
  colorName: string,
  wardrobeId: string,
  brand?: string,
  size?: string,
]

const ROWS: Row[] = [
  // ---------------- summer ----------------
  ['قميص كتان أبيض', 'women-shirts', 'shirt', 'أبيض', 'w-summer', 'COS', 'M'],
  ['تيشيرت قطن عاجي', 'women-tshirts', 'tee', 'أبيض مكسور', 'w-summer', '', 'M'],
  ['توب كريمي مضلّع', 'women-tops', 'tee', 'كريمي', 'w-summer', '', 'S'],
  ['بلوزة رملية', 'women-blouses', 'blouse', 'رملي', 'w-summer', '', 'M'],
  ['تنورة بيج ميدي', 'women-skirts', 'skirt', 'بيج', 'w-summer', '', 'M'],
  ['بنطلون كتان كريمي', 'women-pants', 'pants', 'كريمي', 'w-summer', '', 'M'],
  ['شورت كتان رملي', 'women-shorts', 'shorts', 'رملي', 'w-summer', '', 'M'],
  ['فستان أبيض سادة', 'women-dresses', 'dress', 'أبيض', 'w-summer', '', 'M'],
  ['فستان ميدي أخضر باهت', 'women-dresses', 'dress', 'أخضر باهت', 'w-summer', '', 'M'],
  ['صندل جملي', 'women-shoes', 'flats', 'جملي', 'w-summer', '', '38'],
  ['حقيبة قش بيج', 'women-bags', 'tote', 'بيج', 'w-summer'],
  ['نظارة شمسية بنية', 'women-accessories', 'sunglasses', 'بني', 'w-summer'],
  ['عباية كتان بيج', 'women-abayas', 'abaya', 'بيج', 'w-summer', '', 'M'],

  // ---------------- winter ----------------
  ['كنزة صوف رمادية', 'women-sweaters', 'sweater', 'رمادي', 'w-winter', '', 'M'],
  ['كنزة عنّابية', 'women-sweaters', 'sweater', 'عنّابي', 'w-winter', '', 'M'],
  ['تيشيرت كحلي بأكمام', 'women-tshirts', 'tee', 'كحلي', 'w-winter', '', 'M'],
  ['معطف جملي طويل', 'women-coats', 'coat', 'جملي', 'w-winter', '', 'M'],
  ['جاكيت زيتي', 'women-jackets', 'jacket', 'زيتي', 'w-winter', '', 'M'],
  ['بنطلون صوف كحلي', 'women-pants', 'pants', 'كحلي', 'w-winter', '', 'M'],
  ['جينز غامق', 'women-jeans', 'jeans', 'فحمي', 'w-winter', '', 'M'],
  ['بوت بني', 'women-shoes', 'boots', 'بني', 'w-winter', '', '38'],
  ['وشاح كريمي', 'women-accessories', 'scarf', 'كريمي', 'w-winter'],
  ['عباية كتف سوداء', 'women-abayas', 'abaya', 'أسود', 'w-winter', '', 'M'],

  // ---------------- work / university ----------------
  ['تيشيرت أسود', 'women-tshirts', 'tee', 'أسود', 'w-work', '', 'M'],
  ['قميص أوفر سايز رمادي', 'women-shirts', 'shirt', 'رمادي', 'w-work', '', 'L'],
  ['توب أبيض بيسك', 'women-tops', 'tee', 'أبيض', 'w-work', '', 'S'],
  ['بلوزة ساتان كريمية', 'women-blouses', 'blouse', 'كريمي', 'w-work', '', 'M'],
  ['بنطلون أسود واسع', 'women-pants', 'pants', 'أسود', 'w-work', '', 'M'],
  ['بنطلون رمادي مستقيم', 'women-pants', 'pants', 'رمادي', 'w-work', '', 'M'],
  ['جينز فاتح', 'women-jeans', 'jeans', 'أزرق دينم', 'w-work', '', 'M'],
  ['بليزر فحمي', 'women-jackets', 'blazer', 'فحمي', 'w-work', '', 'M'],
  ['سنيكرز أبيض', 'women-shoes', 'sneakers', 'أبيض', 'w-work', '', '38'],
  ['حذاء أسود مسطّح', 'women-shoes', 'flats', 'أسود', 'w-work', '', '38'],
  ['حقيبة كتف سوداء', 'women-bags', 'shoulderBag', 'أسود', 'w-work'],
  ['شنطة لابتوب رملية', 'women-bags', 'tote', 'رملي', 'w-work'],
  ['حزام جلد بني', 'women-accessories', 'belt', 'بني', 'w-work'],

  // ---------------- occasions ----------------
  ['فستان أسود طويل', 'women-dresses', 'dress', 'أسود', 'w-events', '', 'M'],
  ['فستان عاجي', 'women-dresses', 'dress', 'أبيض مكسور', 'w-events', '', 'M'],
  ['عباية مطرزة كحلية', 'women-abayas', 'abaya', 'كحلي', 'w-events', '', 'M'],
  ['كعب أسود', 'women-shoes', 'heels', 'أسود', 'w-events', '', '38'],
  ['كعب جملي', 'women-shoes', 'heels', 'جملي', 'w-events', '', '38'],
  ['كلتش رملي', 'women-bags', 'clutch', 'رملي', 'w-events'],

  // ---------------- travel ----------------
  ['قميص أبيض للسفر', 'women-shirts', 'shirt', 'أبيض', 'w-travel', '', 'M'],
  ['تيشيرت رمادي', 'women-tshirts', 'tee', 'رمادي', 'w-travel', '', 'M'],
  ['هودي أسود', 'women-hoodies', 'hoodie', 'أسود', 'w-travel', '', 'L'],
  ['بنطلون أسود مريح', 'women-pants', 'pants', 'أسود', 'w-travel', '', 'M'],
  ['جينز كحلي', 'women-jeans', 'jeans', 'كحلي', 'w-travel', '', 'M'],
  ['جاكيت خفيف بيج', 'women-jackets', 'jacket', 'بيج', 'w-travel', '', 'M'],
  ['سنيكرز رمادي', 'women-shoes', 'sneakers', 'رمادي', 'w-travel', '', '38'],
  ['حقيبة سفر بنية', 'women-bags', 'tote', 'بني', 'w-travel'],
]

export const SEED_ITEMS: WardrobeItem[] = ROWS.map(
  ([name, categoryId, shape, colorName, wardrobeId, brand, size], i) => ({
    id: `seed-${i.toString().padStart(2, '0')}`,
    name,
    categoryId,
    shape,
    colorHex: colorByName(colorName).hex,
    colorName,
    wardrobeId,
    source: 'wardrobe' as const,
    size,
    brand: brand || undefined,
    favorite: i % 11 === 0,
    addedAt: now,
  }),
)
