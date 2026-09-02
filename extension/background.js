/**
 * طابور القطع المنتظرة.
 *
 * القطعة تُضاف من صفحة المتجر، وتنتظر هنا لين يُفتح نَسّق. ما تُحذف إلا بعد
 * ما يؤكّد التطبيق استلامها فعلًا — عشان ما تضيع قطعة لو أُغلق التبويب في
 * نص الطريق.
 */

const QUEUE_KEY = 'pending'
const QUEUE_LIMIT = 50

/**
 * ما قرأته الإضافة من صفحات فتحتها المستخدمة — **ذاكرة لا طابور**.
 *
 * الطابور فيه ما طلبت إضافته بالزر. وهذي فيها ما مرّت عليه: صفحة منتج فُتحت،
 * فقرأناها وحفظناها بلا أن نضيف شيئًا. لماذا؟ لأن المتاجر المحمية تمنع خادمنا
 * من قراءة صفحاتها، فلمّا تلصق المستخدمة رابطًا منها يعجز الاستيراد — بينما
 * الصفحة نفسها كانت مفتوحة أمامها قبل ثوانٍ، ومنها نسخت الرابط.
 *
 * فالتطبيق يسأل: «عندك بيانات هذا الرابط؟» ونجيب بما قرأناه من صفحتها هي.
 * **ما نفتح صفحة ولا نطلب شيئًا من أي خادم** — الإضافة لا تملك صلاحية ذلك
 * أصلًا (`permissions: ["storage"]` وحدها)، ولا نريدها أن تملكها.
 */
const SEEN_KEY = 'seen'
const SEEN_LIMIT = 60

async function readQueue() {
  const stored = await chrome.storage.local.get(QUEUE_KEY)
  return Array.isArray(stored[QUEUE_KEY]) ? stored[QUEUE_KEY] : []
}

async function writeQueue(queue) {
  await chrome.storage.local.set({ [QUEUE_KEY]: queue })
  const count = queue.length
  await chrome.action.setBadgeText({ text: count ? String(count) : '' })
  await chrome.action.setBadgeBackgroundColor({ color: '#1C1B19' })
}

/**
 * يضيف قطعة للطابور.
 *
 * وجهة واحدة: قطع التجربة. `nasaq:inspire` باقٍ لأن نسخة قديمة من الإضافة قد
 * تكون لسا مركّبة عند المستخدمة — يدخل نفس الطابور بدل ما يضيع.
 */
async function enqueue(kind, data) {
  const queue = await readQueue()
  const link = data.sourceLink
  if (link && queue.some((entry) => entry.kind === kind && entry.data.sourceLink === link)) {
    return { ok: true, duplicate: true, waiting: queue.length }
  }
  const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const next = [...queue, { id, kind, data }].slice(-QUEUE_LIMIT)
  await writeQueue(next)
  return { ok: true, waiting: next.length }
}

/** الرابط بلا مرساة ولا معاملات تتبّع — نفس المنتج يُطابَق مهما اختلف ذيله. */
function canonical(link) {
  try {
    const url = new URL(link)
    url.hash = ''
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|gclid|fbclid|ref|source|spm|aff|scm|pvid|algo|sk|_t)/i.test(key)) {
        url.searchParams.delete(key)
      }
    }
    return url.toString().replace(/\/$/, '')
  } catch {
    return ''
  }
}

async function remember(product) {
  const key = canonical(product?.sourceLink ?? '')
  if (!key) return { ok: false }
  const stored = await chrome.storage.local.get(SEEN_KEY)
  const seen = stored[SEEN_KEY] && typeof stored[SEEN_KEY] === 'object' ? stored[SEEN_KEY] : {}
  seen[key] = { at: Date.now(), product }

  // الأقدم يخرج أولًا — الذاكرة مساعدة لا أرشيف
  const keys = Object.keys(seen)
  if (keys.length > SEEN_LIMIT) {
    keys.sort((a, b) => seen[a].at - seen[b].at)
    for (const old of keys.slice(0, keys.length - SEEN_LIMIT)) delete seen[old]
  }

  await chrome.storage.local.set({ [SEEN_KEY]: seen })
  return { ok: true }
}

async function recall(link) {
  const key = canonical(link)
  if (!key) return undefined
  const stored = await chrome.storage.local.get(SEEN_KEY)
  return stored[SEEN_KEY]?.[key]?.product
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void (async () => {
    try {
      if (message?.type === 'nasaq:add') {
        sendResponse(await enqueue('product', message.product))
        return
      }
      if (message?.type === 'nasaq:inspire') {
        sendResponse(await enqueue('inspiration', message.inspiration ?? message.product))
        return
      }
      /* صفحة منتج فُتحت وقُرئت — نحفظها ولا نضيف شيئًا */
      if (message?.type === 'nasaq:cache') {
        sendResponse(await remember(message.product))
        return
      }
      /* التطبيق يسأل عن رابط لصقته المستخدمة */
      if (message?.type === 'nasaq:lookup') {
        sendResponse({ ok: true, product: (await recall(message.url)) ?? null })
        return
      }
      if (message?.type === 'nasaq:pull') {
        sendResponse({ ok: true, items: await readQueue() })
        return
      }
      if (message?.type === 'nasaq:ack') {
        const done = new Set(message.ids ?? [])
        const queue = await readQueue()
        await writeQueue(queue.filter((entry) => !done.has(entry.id)))
        sendResponse({ ok: true })
        return
      }
      sendResponse({ ok: false, reason: 'unknown message' })
    } catch (error) {
      sendResponse({ ok: false, reason: String(error) })
    }
  })()
  return true // الرد غير متزامن
})
