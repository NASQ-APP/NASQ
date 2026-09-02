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
import { supabase } from '@/infrastructure/supabase'
import { pickBestImage } from './pick-image'
import { storeIdFromUrl } from './sources'
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
  /**
   * المتجر يرفض أي قارئ آلي — ليس عطلًا ولا تصلحه إعادة محاولة.
   * الواجهة تدخّل القطعة بما يقوله الرابط وتطلب إكمالها بدل ما تضيّعها.
   */
  blocked?: boolean
}

/**
 * ردّ القارئ الخام — قبل ما نحوّله لمفردات الخزانة.
 *
 * يجي من مصدرين: وسيط التطوير (لصق الرابط)، وإضافة المتصفح (زر «إضافة إلى
 * نَسّق» داخل صفحة المتجر). الشكل واحد، فالتحويل تحت مشترك بينهما.
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
  blocked?: boolean
}

/**
 * اسم معقول من الرابط وحده.
 *
 * المتاجر تكتب اسم المنتج في المسار: `buy-lola-casademunt-draped-dress-…`.
 * فلما يرفض المتجر قراءة صفحته، يبقى الرابط يحمل ما يكفي لاسم تعرفه
 * المستخدمة — أفضل من «قطعة من متجر خارجي».
 *
 * نسقط المقاطع التقنية (`buy`، المعرّفات الرقمية، اللاحقة) لأنها عنوان لا اسم.
 */
const SLUG_NOISE = /^(buy|shop|p|prd|dp|product|item|en|ar|sa|saudi|saudi-ar|women|men|clothing)$/i

/** كلمات مقطع واحد بعد تنظيفه من الضجيج التقني. */
function wordsOf(segment: string): string[] {
  return segment
    .replace(/\.(html?|php|aspx)$/i, '')
    .split(/[-_]/)
    .filter((word) => word && !/^\d+$/.test(word) && !SLUG_NOISE.test(word))
    // معرّف المنتج يجي مخلوطًا بالأرقام وما يُقرأ — نسقطه
    .filter((word) => !(/\d/.test(word) && /[a-z]/i.test(word) && word.length > 6))
}

export function nameFromUrl(link: string): string | undefined {
  try {
    const segments = new URL(link).pathname.split('/').filter(Boolean)
    if (segments.length === 0) return undefined

    /*
      نمشي من آخر المسار للخلف، ونأخذ أول مقطع يحمل كلامًا.

      بعض المتاجر تختم الرابط بمعرّف رقمي (ايسوس: `…/prd/12345678`)،
      فالاكتفاء بالمقطع الأخير يعطي لا شيء ويسقط القطعة على «قطعة من متجر».
      والمقطع اللي قبله غالبًا هو الاسم الوصفي.
    */
    for (const segment of segments.slice(-3).toReversed()) {
      const words = wordsOf(segment)
      // مقطع بكلمة واحدة غالبًا قسم لا اسم منتج
      if (words.length < 2) continue
      const name = words.join(' ').slice(0, 90)
      return name.charAt(0).toUpperCase() + name.slice(1)
    }
    return undefined
  } catch {
    return undefined
  }
}

/* ---------------------- تحويل لمفردات الخزانة ---------------------- */

/**
 * لون غير معروف — نقوله صراحة بدل ما نخمّن.
 *
 * رمادي هادئ لا أسود: القطعة بلا صورة تُرسم بلونها، والأسود يعطي مربّعًا
 * مصمتًا يبدو عطلًا — ويدّعي معرفة لون ما نعرفه.
 */
export const UNKNOWN_COLOR = { hex: '#B9B3AA', name: 'غير محدد' }

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

/**
 * لون القطعة — من حقل المتجر، **ثم من اسمها**.
 *
 * أغلب المتاجر لا تنشر حقل لون، فكانت كل قطعة مستوردة تدخل بلون «غير محدد» —
 * وأربعٌ وعشرون من سبع وثلاثين قطعة في خزانةٍ حقيقية كذلك. ونظرية الألوان لا
 * تملك ما تحسب عليه، فيضعف التنسيق كله لسببٍ في الاستيراد لا في المنسّق.
 *
 * والاسم يحمله عادةً: «نظارة شمسية مستطيلة - **أسود**». وقراءته منه ليست
 * تخمينًا: الكلمة مكتوبة، ونقرأ ما كُتب. وما لا نجد فيه لونًا يبقى غير محدَّد.
 */
function paletteColor(declared?: string, name?: string) {
  for (const source of [declared, name]) {
    if (!source) continue
    const match = COLOR_WORDS.find(([pattern]) => pattern.test(source))
    if (!match) continue
    const found = ITEM_COLORS.find((c) => c.name === match[1])
    if (found) return { hex: found.hex, name: found.name }
  }
  return UNKNOWN_COLOR
}

/** التصنيف ما تنشره المتاجر عادة — نستنتجه من الاسم. */
const CATEGORY_WORDS: [RegExp, string][] = [
  /*
    الترتيب مقصود: **اسم القطعة قبل اسم القماش**.

    «جاكيت جينز» كانت تُقرأ جينزًا لأن `جينز` تسبق `جاكيت` في القائمة — فيدخل
    الجاكيت الخزانة قطعةً سفلية. والقماش صفةٌ للقطعة لا القطعة نفسها، فما يسمّي
    القطعة يُفحص أولاً.
  */
  [/abaya|عباي/i, 'women-abayas'],
  [/dress|فستان/i, 'women-dresses'],
  [/jacket|blazer|جاكيت|بليزر/i, 'women-jackets'],
  [/coat|معطف/i, 'women-coats'],
  [/skirt|تنور/i, 'women-skirts'],
  [/short|شورت/i, 'women-shorts'],
  [/jean|denim|جينز/i, 'women-jeans'],
  [/pant|trouser|بنطلون|سروال/i, 'women-pants'],
  [/blouse|بلوز/i, 'women-blouses'],
  [/shirt|top|tee|t-shirt|قميص|تيشرت/i, 'women-shirts'],
  [/hoodie|sweat|هودي/i, 'women-hoodies'],
  [/shoe|heel|sneaker|boot|sandal|حذاء|كعب|جزم|صندل/i, 'women-shoes'],
  [/bag|purse|tote|clutch|حقيب|شنط/i, 'women-bags'],
  [
    /scarf|belt|sunglass|eyewear|glasses|watch|jewel|necklace|earring|bracelet|hat|cap|شال|طرح|حزام|اكسسوار|إكسسوار|نظار|ساع[ةه]|قلاد|حلق|سوار|قبع/i,
    'women-accessories',
  ],
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

/**
 * فئة مرجّحة من الاسم — يستعملها اللصق والإضافة والإدخال اليدوي معًا.
 *
 * حتى لمّا يحجب المتجر صفحته، يبقى اسم المنتج في الرابط — وفيه كلمة تقول
 * وش هي: `dress`، `skirt`، `heels`. فنخمّن منها بدل ما نسقط على أول فئة في القائمة.
 */
/**
 * فئة القطعة من اسمها — أو **لا شيء**.
 *
 * كان الرجوع عند الفشل إلى `CATEGORIES[0]`، وهي `women-tshirts`. فكل اسمٍ لا
 * يطابق نمطًا يدخل الخزانة **تيشيرتًا**: نظّارة شمسية صارت قطعةً علوية، ثم
 * قادت إطلالة كاملة في المنسّق. والخطأ لم يكن في المنسّق — كان في هذا السطر.
 *
 * و`undefined` تعني «اسألي»: تخمينٌ خاطئ يُخزَّن ويُبنى عليه، والسؤال لحظةٌ
 * واحدة تصحّح القطعة إلى الأبد.
 */
export function guessCategoryId(name: string): string | undefined {
  const hit = CATEGORY_WORDS.find(([pattern]) => pattern.test(name))
  const id = hit?.[1]
  return CATEGORIES.some((c) => c.id === id) ? id : undefined
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
  // الشكل يتبع الموضع؛ وبلا فئة نبقيه عامًّا حتى تُحسم الفئة
  const slot = categoryId ? (categoryById(categoryId)?.slot ?? 'top') : 'accessory'
  const color = paletteColor(raw.color, name)

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
 * القراءة تصير في دالة `items-from-url` على الخادم، لأن المتصفّح ممنوع من
 * قراءة صفحة من نطاق ثانٍ (CORS).
 *
 * **نفس المسار في التطوير والإنتاج**: كان وسيط Vite يقرأها أثناء التطوير، وهو
 * أداة ما توجد في البناء النهائي — فينكسر الاستيراد لحظة النشر وما يظهر ذلك في
 * أي تجربة محلية. مسار واحد يعني إن ما نجرّبه هو ما يشتغل عند المستخدمة.
 */
export async function importFromUrl(url: string): Promise<ImportedProduct> {
  const link = url.trim()
  if (!link) return { extracted: false, sourceLink: link, reason: 'الصقي رابط القطعة أولًا.' }

  const db = supabase
  if (!db) {
    return { extracted: false, sourceLink: link, reason: 'الخادم غير مهيّأ.' }
  }

  try {
    const { data, error } = await db.functions.invoke('items-from-url', { body: { url: link } })

    if (error) {
      /*
        فشل النداء نفسه — **نعامله حجبًا**.

        المتاجر اللي تُسقط الاتصال تخلي الدالة تنتظر حتى تردّ البوابة 502 قبل ما
        يوصلنا ردّها. والنتيجة واحدة من ناحية المستخدمة: ما قدرنا نقرأ الصفحة،
        والمخرج إدخال يدوي لا إعادة محاولة. فما نفرّق بينهما في الواجهة.
      */
      const body = await error.context?.json?.().catch(() => undefined)
      const message = typeof body?.message === 'string' ? body.message : undefined
      return {
        extracted: false,
        blocked: true,
        sourceLink: link,
        storeId: storeIdFromUrl(link),
        reason: message ?? 'ما قدرنا نقرأ صفحة المنتج.',
      }
    }

    const raw = data as RawProduct
    // الخادم ما تعرّف على المتجر؟ الرابط وحده يكفي لمعرفته
    const product = await productFromRaw({ ...raw, storeId: raw.storeId ?? storeIdFromUrl(link) })
    return raw.blocked ? { ...product, blocked: true, reason: raw.reason } : product
  } catch {
    return {
      extracted: false,
      blocked: true,
      sourceLink: link,
      storeId: storeIdFromUrl(link),
      reason: 'ما قدرنا نقرأ صفحة المنتج.',
    }
  }
}
