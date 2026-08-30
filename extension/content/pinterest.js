/**
 * زر «أضيفيها لقطع التجربة» داخل بنترست.
 *
 * وجهة واحدة: **قطع تحت التجربة**، عبر نفس مسار المتاجر (`dulabi:add`).
 * كان فيه مسار ثانٍ يودّي الصورة لصفحة «إلهامي» — أُلغي، لأن صفحة القطع صارت
 * المكان الوحيد لكل ما يُستورد.
 *
 * نقرأ الصفحة اللي فتحتها هي، ولا نلمس بيانات دخولها ولا نقرأ إلا عند الضغط.
 */

const MIN_EDGE = 240

/** صورة الـPin: أكبر صورة معروضة من شبكة بنترست. */
function pinImage() {
  let best
  for (const img of document.images) {
    const box = img.getBoundingClientRect()
    if (box.width < MIN_EDGE || box.height < MIN_EDGE) continue
    const src = img.currentSrc || img.src
    if (!/pinimg\.com/i.test(src)) continue
    const area = box.width * box.height
    if (!best || area > best.area) best = { src, alt: img.alt || '', area }
  }
  return best
}

/** صفحة Pin واحد، مب الرئيسية ولا لوحة كاملة. */
const onPinPage = () => /^\/pin\//i.test(location.pathname)

const meta = (property) =>
  document.querySelector(`meta[property="${property}"]`)?.content?.trim() ?? ''

/**
 * اسم القطعة من نصوص الصفحة.
 *
 * بنترست ما فيها اسم منتج — فيها عنوان Pin أو وصف أو نص بديل للصورة. ناخذ
 * أوضحها ونمرّره كما هو: التطبيق يقرأ منه الفئة **لو** كانت فيه كلمة واضحة،
 * وإلا تبقى الفئة «غير محددة». ما نخترع اسمًا ولا نخمّن نوع القطعة.
 */
function pinName(alt) {
  const title = document.title.replace(/\s*[|\-–—]\s*Pinterest.*$/i, '').trim()
  const candidates = [meta('og:title'), document.querySelector('h1')?.textContent, alt, title]
  for (const value of candidates) {
    const clean = (value ?? '').replace(/\s{2,}/g, ' ').trim()
    if (clean) return clean.slice(0, 200)
  }
  return ''
}

/** القطعة بشكل `product` نفسه اللي ترسله صفحات المتاجر. */
function readPiece() {
  if (!onPinPage()) return undefined
  const image = pinImage()
  if (!image) return undefined
  const name = pinName(image.alt)
  if (!name) return undefined

  return {
    storeId: 'pinterest',
    sourceLink: location.href.split('?')[0],
    name,
    imageUrl: image.src,
    images: [image.src],
  }
}

/* -------------------------------- الزر -------------------------------- */

const HOST_ID = 'dulabi-piece-host'

const STYLE = `
  :host { all: initial; }
  .bar {
    position: fixed; inset-block-end: 20px; inset-inline-end: 20px; z-index: 2147483647;
    display: flex; gap: 10px; align-items: center;
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

/** زر واحد: أيقونة، تسمية، وما يرسله عند الضغط. */
function makeButton({ mark, label, className, read, type, key }) {
  const button = document.createElement('button')
  button.type = 'button'
  if (className) button.className = className
  button.innerHTML = `<span class="mark"></span><span class="label"></span>`
  button.querySelector('.mark').textContent = mark
  button.querySelector('.label').textContent = label
  button.dataset.idle = label
  button.addEventListener('click', () => void send(button, { read, type, key, className }))
  return button
}

function mountButtons() {
  if (host && document.body.contains(host)) return
  host = document.createElement('div')
  host.id = HOST_ID
  const shadow = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = STYLE

  const bar = document.createElement('div')
  bar.className = 'bar'
  bar.append(
    makeButton({
      mark: '+',
      label: 'أضيفيها لقطع التجربة',
      read: readPiece,
      type: 'dulabi:add',
      key: 'product',
    }),
  )

  shadow.append(style, bar)
  document.body.append(host)
}

function unmountButtons() {
  host?.remove()
  host = undefined
}

function setLabel(button, label, state, base) {
  button.querySelector('.label').textContent = label
  button.className = [base, state].filter(Boolean).join(' ')
}

async function send(button, { read, type, key, className }) {
  const idle = button.dataset.idle
  const payload = read()
  if (!payload) {
    setLabel(button, 'ما قدرنا نقرأ الصورة', 'failed', className)
    setTimeout(() => setLabel(button, idle, undefined, className), 2600)
    return
  }

  button.disabled = true
  setLabel(button, 'نرسلها…', undefined, className)
  try {
    const reply = await chrome.runtime.sendMessage({ type, [key]: payload })
    if (!reply?.ok) throw new Error(reply?.reason ?? 'failed')
    setLabel(button, reply.duplicate ? 'مضافة من قبل' : 'وصلت لدولابك', 'done', className)
  } catch {
    setLabel(button, 'ما وصلت — أعيدي المحاولة', 'failed', className)
  } finally {
    button.disabled = false
    setTimeout(() => setLabel(button, idle, undefined, className), 2600)
  }
}

/* بنترست تطبيق صفحة واحدة: الرابط يتغيّر بلا إعادة تحميل. */
let lastUrl = ''
let ticks = 0

function refresh() {
  if (onPinPage() && pinImage()) mountButtons()
  else unmountButtons()
  lastUrl = location.href
}

/* علامة تحميل: أسرع طريقة تتأكدين فيها إن السكربت حُقن فعلًا في الصفحة. */
console.info('[دولابي] بنترست — السكربت شغّال')

refresh()
setInterval(() => {
  ticks += 1
  if (location.href !== lastUrl || ticks % 5 === 0) refresh()
}, 1200)
