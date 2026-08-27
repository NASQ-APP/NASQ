/**
 * طابور القطع المنتظرة.
 *
 * القطعة تُضاف من صفحة المتجر، وتنتظر هنا لين يُفتح دولابي. ما تُحذف إلا بعد
 * ما يؤكّد التطبيق استلامها فعلًا — عشان ما تضيع قطعة لو أُغلق التبويب في
 * نص الطريق.
 */

const QUEUE_KEY = 'pending'
const QUEUE_LIMIT = 50

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
 * يضيف قطعة أو إلهامًا للطابور.
 * `kind` يفصل بينهما، فيعرف دولابي وين يوديه: قطع التجربة أو صفحة إلهامي.
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void (async () => {
    try {
      if (message?.type === 'dulabi:add') {
        sendResponse(await enqueue('product', message.product))
        return
      }
      if (message?.type === 'dulabi:inspire') {
        sendResponse(await enqueue('inspiration', message.inspiration))
        return
      }
      if (message?.type === 'dulabi:pull') {
        sendResponse({ ok: true, items: await readQueue() })
        return
      }
      if (message?.type === 'dulabi:ack') {
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
