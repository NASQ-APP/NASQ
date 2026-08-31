/**
 * قراءة بيانات منتج من صفحة متجر.
 *
 * المتصفّح ممنوع من قراءة صفحة من نطاق ثانٍ (CORS)، فالقراءة تصير هنا.
 *
 * كان هذا المنطق يعيش في وسيط Vite — أداة تطوير ما توجد في البناء النهائي،
 * فالاستيراد ينكسر لحظة النشر. مكانه هنا، ومسار واحد للتطوير والإنتاج يعني
 * إن ما نجرّبه هو ما يشتغل عند المستخدمة.
 *
 * وما نطلب ولا نخزّن أي بيانات دخول، ونقرأ **صفحة واحدة اختارتها المستخدمة** —
 * مثل معاينة الرابط في تطبيقات المحادثة، مب سحبًا جماعيًا.
 */

export type Extracted = {
  extracted: boolean
  sourceLink: string
  storeId?: string
  name?: string
  brand?: string
  /** أفضل صورة اخترناها */
  imageUrl?: string
  /** كل الصور التي أعلنتها الصفحة، بترتيبها الأصلي */
  images?: string[]
  price?: string
  currency?: string
  color?: string
  reason?: string
}

const STORES: Record<string, string> = {
  'shein.com': 'shein',
  'namshi.com': 'namshi',
  'aliexpress.com': 'ali',
  'zara.com': 'zara',
  'noon.com': 'noon',
  'asos.com': 'asos',
  'vogacloset.com': 'voga',
}

const storeIdFor = (hostname: string): string | undefined => {
  const host = hostname.replace(/^www\./, '').toLowerCase()
  return Object.entries(STORES).find(([domain]) => host.endsWith(domain))?.[1]
}

const decode = (value: string): string =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim()

/** وسم meta بأي ترتيب للسمات. */
function meta(html: string, ...names: string[]): string {
  for (const name of names) {
    const a = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`,
      'i',
    ).exec(html)
    if (a?.[1]) return decode(a[1])
    const b = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`,
      'i',
    ).exec(html)
    if (b?.[1]) return decode(b[1])
  }
  return ''
}

/** Microdata — معيار ثالث بعد JSON-LD وOpenGraph. */
function microdata(html: string, prop: string): string {
  const withContent = new RegExp(
    `<[^>]+itemprop=["']${prop}["'][^>]*content=["']([^"']+)["']`,
    'i',
  ).exec(html)
  if (withContent?.[1]) return decode(withContent[1])
  const contentFirst = new RegExp(
    `<[^>]+content=["']([^"']+)["'][^>]*itemprop=["']${prop}["']`,
    'i',
  ).exec(html)
  return contentFirst?.[1] ? decode(contentFirst[1]) : ''
}

type Json = Record<string, unknown>

/** يمشي على JSON-LD ويرجع أول عقدة نوعها Product. */
function findProduct(node: unknown, depth = 0): Json | undefined {
  if (!node || depth > 6) return undefined
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findProduct(child, depth + 1)
      if (found) return found
    }
    return undefined
  }
  if (typeof node !== 'object') return undefined

  const obj = node as Json
  const type = obj['@type']
  const isProduct = Array.isArray(type)
    ? type.some((t) => String(t).toLowerCase() === 'product')
    : String(type ?? '').toLowerCase() === 'product'
  if (isProduct) return obj

  for (const key of ['@graph', 'mainEntity', 'itemListElement']) {
    const found = findProduct(obj[key], depth + 1)
    if (found) return found
  }
  return undefined
}

/** كل النصوص داخل قيمة قد تكون نصًا أو مصفوفة أو كائنًا. */
function allStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed) out.push(trimmed)
  } else if (Array.isArray(value)) {
    for (const entry of value) allStrings(entry, out)
  } else if (value && typeof value === 'object') {
    const obj = value as Json
    allStrings(obj.url ?? obj.contentUrl, out)
  }
  return out
}

/**
 * ترشيح أولي بالاسم فقط — الترجيح الحقيقي يصير في المتصفح بقراءة البكسلات
 * (`features/try-pieces/pick-image.ts`). هذا يفيد لما تفشل تلك القراءة، ولما
 * يسمّي المتجر ملفاته تسمية مفهومة. يرجع للصورة الأولى لو ما ظهرت دلالة.
 */
const PRODUCT_ONLY = /(flat|still|packshot|product|laydown|ghost)[-_./]?/i
const ON_MODEL = /(model|worn|onbody|on-body|lifestyle|outfit)[-_./]?/i

function bestImage(images: string[]): string | undefined {
  if (images.length === 0) return undefined
  const preferred = images.find((src) => PRODUCT_ONLY.test(src) && !ON_MODEL.test(src))
  if (preferred) return preferred
  const notOnModel = images.find((src) => !ON_MODEL.test(src))
  return notOnModel ?? images[0]
}

const firstString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value.trim() || undefined
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = firstString(entry)
      if (found) return found
    }
    return undefined
  }
  if (value && typeof value === 'object') {
    const obj = value as Json
    return firstString(obj.url ?? obj.contentUrl ?? obj.name)
  }
  return undefined
}

function fromJsonLd(html: string): Partial<Extracted> & { isProduct?: boolean } {
  const blocks = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )
  for (const block of blocks) {
    let parsed: unknown
    try {
      parsed = JSON.parse(block[1].trim())
    } catch {
      continue
    }
    const product = findProduct(parsed)
    if (!product) continue

    const offers = product.offers as Json | Json[] | undefined
    const offer = Array.isArray(offers) ? offers[0] : offers
    const price = offer ? firstString(offer.price ?? offer.lowPrice) : undefined

    const images = allStrings(product.image)
    return {
      isProduct: true,
      name: firstString(product.name),
      images,
      imageUrl: bestImage(images),
      brand: firstString(product.brand),
      color: firstString(product.color),
      price,
      currency: offer ? firstString(offer.priceCurrency) : undefined,
    }
  }
  return {}
}

export async function readProduct(rawUrl: string): Promise<Extracted> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return { extracted: false, sourceLink: rawUrl, reason: 'الرابط غير صالح.' }
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { extracted: false, sourceLink: rawUrl, reason: 'نقبل روابط http أو https فقط.' }
  }

  const storeId = storeIdFor(url.hostname)
  const storeName = url.hostname.replace(/^www\./, '')

  let html: string
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'ar,en;q=0.8',
      },
      signal: AbortSignal.timeout(15_000),
    })

    if (response.status === 429) {
      return {
        extracted: false,
        sourceLink: url.toString(),
        storeId,
        reason: `${storeName} يحجب القراءة الآلية الآن (429). جرّبي بعد شوي أو رابطًا من متجر ثانٍ.`,
      }
    }
    if (response.status === 403) {
      return {
        extracted: false,
        sourceLink: url.toString(),
        storeId,
        reason: `${storeName} رفض القراءة (403).`,
      }
    }
    if (!response.ok) {
      return {
        extracted: false,
        sourceLink: url.toString(),
        storeId,
        reason: `${storeName} رد بالحالة ${response.status}.`,
      }
    }
    html = (await response.text()).slice(0, 1_500_000)
  } catch {
    return {
      extracted: false,
      sourceLink: url.toString(),
      storeId,
      reason: 'ما قدرنا نفتح الرابط — تأكدي من الاتصال أو جرّبي رابطًا ثانيًا.',
    }
  }

  const ld = fromJsonLd(html)

  const ogType = meta(html, 'og:type').toLowerCase()
  const ogPrice =
    meta(html, 'product:price:amount', 'og:price:amount') || microdata(html, 'price')

  /* الصفحة لازم تعرّف نفسها كمنتج. بدون هذا الشرط يدخل عنوان الصفحة
     الرئيسية للمتجر كأنه اسم قطعة. */
  const declaresProduct = Boolean(ld.isProduct) || ogType.includes('product') || Boolean(ogPrice)
  if (!declaresProduct) {
    return {
      extracted: false,
      sourceLink: url.toString(),
      storeId,
      reason: `الصفحة ما فيها بيانات منتج — تأكدي إن الرابط لصفحة قطعة واحدة في ${storeName}، مب صفحة قسم أو الرئيسية.`,
    }
  }

  const name =
    ld.name ||
    meta(html, 'og:title', 'twitter:title') ||
    decode((/<title[^>]*>([^<]{2,180})<\/title>/i.exec(html)?.[1] ?? ''))

  if (!name) {
    return {
      extracted: false,
      sourceLink: url.toString(),
      storeId,
      reason: 'الصفحة تقول إنها منتج بس بلا اسم — ما نقدر نستوردها.',
    }
  }

  const declared = ld.images?.length
    ? ld.images
    : [meta(html, 'og:image', 'twitter:image')].filter(Boolean)

  const images: string[] = []
  for (const candidate of declared) {
    try {
      const absolute = new URL(candidate, url).toString()
      if (!images.includes(absolute)) images.push(absolute)
    } catch {
      // رابط صورة غير صالح — نتجاهله
    }
  }
  const imageUrl = bestImage(images)

  return {
    extracted: true,
    sourceLink: url.toString(),
    storeId,
    name,
    brand: ld.brand || meta(html, 'og:site_name', 'product:brand') || undefined,
    imageUrl,
    images: images.length ? images : undefined,
    price: ld.price || ogPrice || undefined,
    currency:
      ld.currency ||
      meta(html, 'product:price:currency', 'og:price:currency') ||
      microdata(html, 'priceCurrency') ||
      undefined,
    color: ld.color || microdata(html, 'color') || undefined,
  }
}
