/**
 * زر «إضافة إلى دولابي» داخل صفحة المنتج.
 *
 * يشتغل على صفحة المتجر بعد ما يبنيها الجافاسكربت، فيقرأ الصفحة اللي تشوفها
 * المستخدمة فعلًا. هذا يحل ما عجز عنه القارئ في الخادم: زارا وعلي إكسبرس
 * كانوا يرجّعون هيكلًا فاضيًا، ونون وشي إن كانوا يردّون ٤٠٣ أو كابتشا — لأننا
 * كنا نطلب الصفحة من برّا. هنا ما نطلب شيئًا، نقرأ صفحة مفتوحة أصلًا.
 *
 * ما نلمس بيانات الدخول ولا الكوكيز، ولا نقرأ إلا لما تضغط المستخدمة الزر.
 */

const STORES = {
  'shein.com': 'shein',
  'namshi.com': 'namshi',
  'aliexpress.com': 'ali',
  'zara.com': 'zara',
  'noon.com': 'noon',
  'asos.com': 'asos',
  'vogacloset.com': 'voga',
}

/**
 * مسارات صفحات المنتج — إشارة مساندة لما تنقص البيانات المنظّمة.
 * `.html` في آخر المسار تخص فوغا كلوسيت: صفحات الأقسام عندهم تنتهي بشرطة.
 */
const PRODUCT_PATHS = [/-p-\d/i, /\/p\//i, /\/prd\//i, /\/item\/\d/i, /\.html$/i, /\/dp\//i]

const storeId = () => {
  const host = location.hostname.replace(/^www\./, '').toLowerCase()
  return Object.entries(STORES).find(([domain]) => host.endsWith(domain))?.[1]
}

const text = (value) => (typeof value === 'string' ? value.trim() : '')

/* ------------------------- قراءة البيانات المنظّمة ------------------------- */

function metaContent(...names) {
  for (const name of names) {
    const el =
      document.querySelector(`meta[property="${name}"]`) ||
      document.querySelector(`meta[name="${name}"]`)
    const value = text(el?.getAttribute('content'))
    if (value) return value
  }
  return ''
}

function itemprop(prop) {
  const el = document.querySelector(`[itemprop="${prop}"]`)
  if (!el) return ''
  return text(el.getAttribute('content')) || text(el.textContent)
}

function findProduct(node, depth = 0) {
  if (!node || depth > 6) return undefined
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findProduct(child, depth + 1)
      if (found) return found
    }
    return undefined
  }
  if (typeof node !== 'object') return undefined

  const type = node['@type']
  const isProduct = Array.isArray(type)
    ? type.some((t) => String(t).toLowerCase() === 'product')
    : String(type ?? '').toLowerCase() === 'product'
  if (isProduct) return node

  for (const key of ['@graph', 'mainEntity', 'itemListElement']) {
    const found = findProduct(node[key], depth + 1)
    if (found) return found
  }
  return undefined
}

function allStrings(value, out = []) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed) out.push(trimmed)
  } else if (Array.isArray(value)) {
    for (const entry of value) allStrings(entry, out)
  } else if (value && typeof value === 'object') {
    allStrings(value.url ?? value.contentUrl, out)
  }
  return out
}

const firstString = (value) => allStrings(value)[0]

function fromJsonLd() {
  for (const block of document.querySelectorAll('script[type="application/ld+json"]')) {
    let parsed
    try {
      parsed = JSON.parse(block.textContent.trim())
    } catch {
      continue
    }
    const product = findProduct(parsed)
    if (!product) continue

    const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers
    return {
      isProduct: true,
      name: firstString(product.name),
      images: allStrings(product.image),
      brand: firstString(product.brand),
      color: firstString(product.color),
      price: offers ? firstString(offers.price ?? offers.lowPrice) : undefined,
      currency: offers ? firstString(offers.priceCurrency) : undefined,
    }
  }
  return {}
}

/* ------------------------- ما تنقص البيانات المنظّمة ------------------------- */

const absolute = (src) => {
  try {
    const url = new URL(src, location.href)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : ''
  } catch {
    return ''
  }
}

/**
 * صور المعرض من الـDOM.
 *
 * بعض المتاجر تعلن صورة واحدة في بياناتها المنظّمة (ASOS مثلًا) وتعرض بقية
 * الصور في الصفحة فقط. نأخذ الصور الكبيرة المعروضة فعلًا — الشعارات
 * والبانرات أصغر من هذا الحد — وترتيبها بالمساحة عشان الأوضح يجي أول.
 */
function galleryImages() {
  const found = []
  for (const img of document.images) {
    const box = img.getBoundingClientRect()
    if (box.width < 200 || box.height < 200) continue
    const src = absolute(img.currentSrc || img.src)
    if (src && !found.some((entry) => entry.src === src)) {
      found.push({ src, area: box.width * box.height })
    }
  }
  return found
    .sort((a, b) => b.area - a.area)
    .slice(0, 8)
    .map((entry) => entry.src)
}

/**
 * مفتاح المنتج من رابط صورته: أطول مقطع في المسار قبل اسم الملف.
 *
 * صور المنتج الواحد تتشارك هذا المقطع، وصور «قد يعجبك أيضًا» في نفس الصفحة
 * لها مقاطع ثانية — فهذا يمنعها من الدخول ضمن صور القطعة.
 */
function productKey(src) {
  try {
    const parts = new URL(src).pathname
      .split('/')
      .slice(0, -1)
      .filter((part) => part.length >= 8)
    return parts.sort((a, b) => b.length - a.length)[0] ?? ''
  } catch {
    return ''
  }
}

const OLD_PRICE = /old|was|strike|through|original|before|delete|line-through/i

/**
 * السعر المعروض على الشاشة، لما ما يكون في البيانات المنظّمة.
 *
 * نتجنّب السعر المشطوب، ونرفض أي عنصر فيه رقمان — العنصر اللي يجمع السعر
 * القديم والجديد يعطي «٣٤١ ١٩٢»، والمطلوب السعر الحالي وحده. ونرجّع الرقم
 * مجرّدًا بلا رمز عملة، مثل ما ترجعه البيانات المنظّمة تمامًا.
 */
function visiblePrice() {
  const candidates = document.querySelectorAll(
    '[data-testid*="price" i], [class*="price" i], [id*="price" i]',
  )
  for (const el of candidates) {
    const marker = `${el.className} ${el.id} ${el.getAttribute('data-testid') ?? ''}`
    if (OLD_PRICE.test(marker)) continue
    if (OLD_PRICE.test(getComputedStyle(el).textDecorationLine)) continue

    const value = text(el.textContent).replace(/\s+/g, ' ')
    if (value.length > 24 || value.includes('%')) continue

    const numbers = value.match(/\d[\d.,]*/g)
    if (numbers?.length === 1) return numbers[0]
  }
  return ''
}

function visibleColor() {
  const el = document.querySelector(
    '[data-testid*="colour" i], [data-testid*="color" i], [class*="selectedColour" i], [class*="selected-color" i]',
  )
  const value = text(el?.textContent).replace(/\s+/g, ' ')
  return value.length > 0 && value.length <= 40 ? value : ''
}

/* ------------------------------ الاستخراج ------------------------------ */

function readProduct() {
  const ld = fromJsonLd()
  const ogType = metaContent('og:type').toLowerCase()
  const metaPrice = metaContent('product:price:amount', 'og:price:amount') || itemprop('price')

  const structured = Boolean(ld.isProduct) || ogType.includes('product') || Boolean(metaPrice)
  const looksLikeProductUrl = PRODUCT_PATHS.some((pattern) => pattern.test(location.pathname))

  const name =
    ld.name || metaContent('og:title', 'twitter:title') || text(document.title)

  const declared = ld.images?.length ? ld.images : [metaContent('og:image', 'twitter:image')]
  let images = [...new Set(declared.map(absolute).filter(Boolean))]

  /* المتجر أعلن صورة وحدة بس؟ نكمّل من صور الصفحة، لكن من نفس المنتج فقط. */
  if (images.length < 2) {
    const key = productKey(images[0] ?? '')
    for (const src of galleryImages()) {
      if (images.includes(src)) continue
      if (key && !src.includes(key)) continue
      images.push(src)
    }
  }
  images = images.slice(0, 12)

  const price = ld.price || metaPrice || visiblePrice()

  if (!name || images.length === 0) return undefined
  /* بلا بيانات منظّمة ما يكفي شكل الرابط وحده: نطلب سعرًا ظاهرًا كمان، عشان
     ما يطلع الزر في صفحة «من نحن» أو أي صفحة ثانية تنتهي بـ.html */
  if (!structured && !(looksLikeProductUrl && price)) return undefined

  return {
    extracted: true,
    sourceLink: location.href.split('#')[0],
    storeId: storeId(),
    name: name.slice(0, 200),
    brand: ld.brand || metaContent('og:site_name', 'product:brand') || undefined,
    imageUrl: images[0],
    images,
    price: price || undefined,
    currency:
      ld.currency ||
      metaContent('product:price:currency', 'og:price:currency') ||
      itemprop('priceCurrency') ||
      undefined,
    color: ld.color || itemprop('color') || visibleColor() || undefined,
  }
}

/* -------------------------------- الزر -------------------------------- */

const HOST_ID = 'dulabi-add-host'

const STYLE = `
  :host { all: initial; }
  .bar {
    position: fixed; inset-block-end: 20px; inset-inline-end: 20px; z-index: 2147483647;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif; direction: rtl;
  }
  button {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 18px; border: 0; border-radius: 10px; cursor: pointer;
    background: #1C1B19; color: #fff; font-size: 14px; line-height: 1;
    box-shadow: 0 6px 24px rgba(0,0,0,.28);
  }
  button:hover { background: #333029; }
  button[disabled] { cursor: default; opacity: .85; }
  button.done { background: #2F6B4F; }
  button.failed { background: #8A2B2B; }
  .mark { font-size: 15px; }
`

let host

function mountButton() {
  if (host && document.body.contains(host)) return
  host = document.createElement('div')
  host.id = HOST_ID
  const shadow = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = STYLE

  const bar = document.createElement('div')
  bar.className = 'bar'

  const button = document.createElement('button')
  button.type = 'button'
  button.innerHTML = '<span class="mark">◆</span><span class="label">إضافة إلى دولابي</span>'
  button.addEventListener('click', () => void send(button))

  bar.append(button)
  shadow.append(style, bar)
  document.body.append(host)
}

function unmountButton() {
  host?.remove()
  host = undefined
}

function setLabel(button, label, state) {
  button.querySelector('.label').textContent = label
  button.className = state ?? ''
}

async function send(button) {
  const product = readProduct()
  if (!product) {
    setLabel(button, 'ما قدرنا نقرأ القطعة', 'failed')
    setTimeout(() => setLabel(button, 'إضافة إلى دولابي'), 2600)
    return
  }

  button.disabled = true
  setLabel(button, 'نرسلها…')
  try {
    const reply = await chrome.runtime.sendMessage({ type: 'dulabi:add', product })
    if (!reply?.ok) throw new Error(reply?.reason ?? 'failed')
    setLabel(button, reply.duplicate ? 'مضافة من قبل' : 'أُضيفت إلى دولابي', 'done')
  } catch {
    setLabel(button, 'ما وصلت — أعيدي المحاولة', 'failed')
  } finally {
    button.disabled = false
    setTimeout(() => setLabel(button, 'إضافة إلى دولابي'), 2600)
  }
}

/* المتاجر تطبيقات صفحة واحدة: الرابط يتغيّر بلا إعادة تحميل، فنراجع دوريًا. */
let lastUrl = ''

function refresh() {
  const onProductPage = Boolean(readProduct())
  if (onProductPage) mountButton()
  else unmountButton()
  lastUrl = location.href
}

let ticks = 0

refresh()
setInterval(() => {
  ticks += 1
  // على تغيّر الرابط فورًا، وكل ست ثوانٍ احتياطًا للصفحات اللي تكتمل متأخرة.
  // ما نفحص كل لحظة: الفحص يقرأ أبعاد الصور، وتكراره يثقّل صفحة المتجر.
  if (location.href !== lastUrl || ticks % 5 === 0) refresh()
}, 1200)
