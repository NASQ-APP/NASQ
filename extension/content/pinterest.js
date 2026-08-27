/**
 * زر «أضيفيها لإلهامي» داخل بنترست.
 *
 * الإلهام مب منتجًا: ما فيه سعر ولا متجر ولا شراء. نرسل صورة اللوك ورابط
 * الـPin فقط، ودولابي يقرأ ألوانها ويبني منها ذوق المستخدمة.
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
    if (!best || area > best.area) best = { src, area }
  }
  return best?.src
}

/** صفحة Pin واحد، مب الرئيسية ولا لوحة كاملة. */
const onPinPage = () => /^\/pin\//i.test(location.pathname)

function readInspiration() {
  if (!onPinPage()) return undefined
  const imageUrl = pinImage()
  if (!imageUrl) return undefined
  return { imageUrl, sourceLink: location.href.split('?')[0] }
}

/* -------------------------------- الزر -------------------------------- */

const HOST_ID = 'dulabi-inspire-host'

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
  button.innerHTML = '<span class="mark">♥</span><span class="label">أضيفيها لإلهامي</span>'
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
  const inspiration = readInspiration()
  if (!inspiration) {
    setLabel(button, 'ما قدرنا نقرأ الصورة', 'failed')
    setTimeout(() => setLabel(button, 'أضيفيها لإلهامي'), 2600)
    return
  }

  button.disabled = true
  setLabel(button, 'نرسلها…')
  try {
    const reply = await chrome.runtime.sendMessage({ type: 'dulabi:inspire', inspiration })
    if (!reply?.ok) throw new Error(reply?.reason ?? 'failed')
    setLabel(button, reply.duplicate ? 'مضافة من قبل' : 'أُضيفت لإلهامك', 'done')
  } catch {
    setLabel(button, 'ما وصلت — أعيدي المحاولة', 'failed')
  } finally {
    button.disabled = false
    setTimeout(() => setLabel(button, 'أضيفيها لإلهامي'), 2600)
  }
}

/* بنترست تطبيق صفحة واحدة: الرابط يتغيّر بلا إعادة تحميل. */
let lastUrl = ''
let ticks = 0

function refresh() {
  if (readInspiration()) mountButton()
  else unmountButton()
  lastUrl = location.href
}

refresh()
setInterval(() => {
  ticks += 1
  if (location.href !== lastUrl || ticks % 5 === 0) refresh()
}, 1200)
