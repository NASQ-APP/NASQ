/**
 * قراءة قطعة من رابط متجر.
 *
 * الشكل الراجع هنا **مطابق لعقد `items-from-url`** في الباك-إند، عشان الربط
 * لاحقًا يكون تبديل جسم دالة واحدة — بدون أي لمسة في الصفحات أو البطاقات.
 *
 * القراءة الفعلية تصير خارج المتصفح، لأن المتصفح ممنوع من قراءة صفحة من نطاق
 * ثانٍ (CORS). حاليًا يقرأها وسيط Vite على جهاز المطوّرة (تطوير فقط).
 *
 * ما فيه بيانات تجريبية: إمّا بيانات المنتج الحقيقية، أو سبب واضح للفشل.
 */
import { CATEGORIES, ITEM_COLORS, categoryById, shapesForSlot } from '@/domain/wardrobe'
import { DEV_IMPORT_PATH } from '../../../vite-plugins/import-path'
import { pickBestImage } from './pick-image'
import type { GarmentShape } from '@/domain/wardrobe'

/** ردّ `items-from-url` — نفس الحقول ونفس المعاني. */
export type ImportedProduct = {
  /** هل نجح استخراج بيانات المنتج من الصفحة؟ */
  extracted: boolean
  /** معرّف المتجر لو تعرّفنا عليه من النطاق */
  storeId?: string
  sourceLink: string

  name?: string
  brand?: string
  /** صورة المنتج الحقيقية. غيابها ليس خطأ — القطعة تُرسم من `shape` و`colorHex`. */
  imageUrl?: string
  /** كل صور المنتج — عشان تقدر المستخدمة تختار غير الافتراضية */
  images?: string[]
  /**
   * ما لقينا صورة للقطعة وحدها: كل صور المتجر عليها عارضة.
   * `undefined` = ما فحصناها — لا نعرف، وما نتظاهر إننا نعرف.
   */
  imageHasModel?: boolean
  /** معلومة تساعد على القرار — مب عرض بيع */
  price?: string

  categoryId?: string
  shape?: GarmentShape
  colorHex?: string
  colorName?: string

  /** سبب مقروء لو ما نجح الاستخراج */
  reason?: string
}

/**
 * ردّ القارئ الخام — قبل ما نحوّله لمفردات الخزانة.
 *
 * يجي من مصدرين: وسيط التطوير (لصق الرابط)، وإضافة المتصفح (زر «إضافة إلى
 * نَسَق» داخل صفحة المتجر). الشكل واحد، فالتحويل تحت مشترك بينهما.
 */
export type RawProduct = {
  extracted: boolean
  sourceLink: string
  storeId?: string
  name?: string
  brand?: string
  imageUrl?: string
  images?: string[]
  price?: string
  currency?: string
  color?: string
  reason?: string
}

/* ---------------------- تحويل لمفردات الخزانة ---------------------- */

/** لون غير معروف — نقوله صراحة بدل ما نخمّن. */
const UNKNOWN_COLOR = { hex: '#B9B3AA', name: 'غير محدد' }

/** أسماء الألوان كما تكتبها المتاجر. */
const COLOR_WORDS: [RegExp, string][] = [
  [/black|أسود/i, 'أسود'],
  [/off.?white|أبيض مكسور/i, 'أبيض مكسور'],
  [/white|أبيض/i, 'أبيض'],
  [/cream|ivory|كريمي|عاجي/i, 'كريمي'],
  [/beige|بيج/i, 'بيج'],
  [/camel|tan|جملي/i, 'جملي'],
  [/brown|بني/i, 'بني'],
  [/grey|gray|رمادي/i, 'رمادي'],
  [/charcoal|فحمي/i, 'فحمي'],
  [/navy|كحلي/i, 'كحلي'],
  [/olive|زيتي/i, 'زيتي'],
  [/denim|دينم/i, 'دينم'],
  [/blue|أزرق/i, 'أزرق'],
  [/sand|رملي/i, 'رملي'],
  [/burgundy|maroon|عنّاب/i, 'عنّابي'],
  [/green|أخضر/i, 'أخضر باهت'],
  [/pink|rose|وردي/i, 'وردي هادئ'],
]

function paletteColor(declared?: string) {
  if (!declared) return UNKNOWN_COLOR
  const match = COLOR_WORDS.find(([pattern]) => pattern.test(declared))
  if (!match) return UNKNOWN_COLOR
  const found = ITEM_COLORS.find((c) => c.name === match[1])
  return found ? { hex: found.hex, name: found.name } : UNKNOWN_COLOR
}

/** التصنيف ما تنشره المتاجر عادة — نستنتجه من الاسم. */
const CATEGORY_WORDS: [RegExp, string][] = [
  [/abaya|عباي/i, 'women-abayas'],
  [/dress|فستان/i, 'women-dresses'],
  [/skirt|تنور/i, 'women-skirts'],
  [/jean|denim|جينز/i, 'women-jeans'],
  [/short|شورت/i, 'women-shorts'],
  [/pant|trouser|بنطلون|سروال/i, 'women-pants'],
  [/blouse|بلوز/i, 'women-blouses'],
  [/shirt|top|tee|t-shirt|قميص|تيشرت/i, 'women-shirts'],
  [/jacket|blazer|جاكيت|بليزر/i, 'women-jackets'],
  [/coat|معطف/i, 'women-coats'],
  [/hoodie|sweat|هودي/i, 'women-hoodies'],
  [/shoe|heel|sneaker|boot|sandal|حذاء|كعب|جزم|صندل/i, 'women-shoes'],
  [/bag|purse|tote|clutch|حقيب|شنط/i, 'women-bags'],
  [/scarf|belt|شال|طرح|حزام|اكسسوار/i, 'women-accessories'],
]

/**
 * ذيل العنوان الدعائي: «… for Women | Best Price UAE».
 * نقصّ المقطع الأخير فقط لو كان عبارة ترويجية معروفة، عشان ما نقصّ اسم قطعة
 * فيه شرطة عمودية أصلاً. مكانه هنا لأنه تطبيع يخص كل المصادر — اللصق والإضافة.
 */
const SEO_TAIL = /best price|buy online|shop online|online shopping|free (?:delivery|shipping)/i

function cleanName(raw: string): string {
  const parts = raw.split(/\s*[|｜]\s*/)
  while (parts.length > 1 && SEO_TAIL.test(parts.at(-1) as string)) parts.pop()
  return parts.join(' | ').replace(/\s{2,}/g, ' ').trim() || raw.trim()
}

function guessCategoryId(name: string): string {
  const hit = CATEGORY_WORDS.find(([pattern]) => pattern.test(name))
  const id = hit?.[1]
  return CATEGORIES.some((c) => c.id === id) ? (id as string) : CATEGORIES[0].id
}

/** يحوّل ردّ أي قارئ إلى قطعة جاهزة للخزانة. مشترك بين اللصق والإضافة. */
export async function productFromRaw(raw: RawProduct): Promise<ImportedProduct> {
  if (!raw.extracted || !raw.name) {
    return {
      extracted: false,
      sourceLink: raw.sourceLink,
      storeId: raw.storeId,
      reason: raw.reason ?? 'ما قدرنا نقرأ بيانات المنتج من الرابط.',
    }
  }

  const name = cleanName(raw.name)
  const categoryId = guessCategoryId(name)
  const slot = categoryById(categoryId)?.slot ?? 'top'
  const color = paletteColor(raw.color)

  /* ترجيح صورة القطعة وحدها على صورة العارضة. لو فشل الترجيح نرجع لصورة
     المتجر الأولى — ما نترك القطعة بلا صورة. */
  const images = raw.images ?? (raw.imageUrl ? [raw.imageUrl] : [])
  const picked = await pickBestImage(images)

  return {
    extracted: true,
    storeId: raw.storeId,
    sourceLink: raw.sourceLink,
    name,
    brand: raw.brand,
    imageUrl: picked.best ?? raw.imageUrl,
    images: images.length > 1 ? images : undefined,
    /* ما نكتب الوسم إلا لو قرأنا الصور فعلًا. فشل القراءة يترك الحقل
       `undefined`: «ما قدرنا نقرأ» ≠ «فيها شخص». */
    imageHasModel: picked.readable ? !picked.foundProductOnly : undefined,
    price: raw.price,
    categoryId,
    shape: shapesForSlot(slot)[0].id,
    colorHex: color.hex,
    colorName: color.name,
  }
}

/**
 * تقرأ القطعة من الرابط.
 *
 * عند ربط Supabase: استبدلي جسم الدالة بـ
 *   return request<ImportedProduct>(ENDPOINTS.itemsFromUrl, { method: 'POST', body: { url } })
 * الصفحات والبطاقات ما تتغيّر — تستهلك نفس `ImportedProduct`.
 */
export async function importFromUrl(url: string): Promise<ImportedProduct> {
  const link = url.trim()
  if (!link) return { extracted: false, sourceLink: link, reason: 'الصقي رابط القطعة أولًا.' }

  if (!import.meta.env.DEV) {
    return {
      extracted: false,
      sourceLink: link,
      reason: 'قراءة الروابط متاحة أثناء التطوير فقط لين نربط الخادم.',
    }
  }

  try {
    const response = await fetch(DEV_IMPORT_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: link }),
    })
    if (!response.ok) {
      return { extracted: false, sourceLink: link, reason: 'قارئ الروابط ما استجاب.' }
    }
    return await productFromRaw((await response.json()) as RawProduct)
  } catch {
    return { extracted: false, sourceLink: link, reason: 'ما قدرنا نوصل لقارئ الروابط.' }
  }
}
