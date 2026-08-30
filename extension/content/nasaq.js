/**
 * تسليم القطع المنتظرة لنَسَق.
 *
 * ما نكتب في `localStorage` مباشرة: حالة التطبيق محمولة في الذاكرة، والكتابة
 * من ورا ظهره ما تحدّث الواجهة وتقدر تفسد المحفوظ. نرسلها رسالة، والتطبيق
 * يضيفها بنفس الدالة اللي يستعملها الاستيراد باللصق.
 *
 * ما نحذف قطعة من الطابور إلا بعد تأكيد التطبيق استلامها.
 */

const SOURCE = 'nasaq-extension'
const APP = 'nasaq-app'

let delivering = false

async function deliver() {
  if (delivering) return
  delivering = true
  try {
    const reply = await chrome.runtime.sendMessage({ type: 'nasaq:pull' })
    for (const entry of reply?.items ?? []) {
      window.postMessage(
        { source: SOURCE, type: entry.kind ?? 'product', id: entry.id, data: entry.data ?? entry.product },
        location.origin,
      )
    }
  } catch {
    // الإضافة أُعيد تحميلها أو الخلفية نائمة — نعيد المحاولة في الدورة القادمة
  } finally {
    delivering = false
  }
}

window.addEventListener('message', (event) => {
  if (event.source !== window || event.origin !== location.origin) return
  const data = event.data
  if (data?.source !== APP) return

  // التطبيق جاهز يستقبل — قبل هذا الإعلان تضيع الرسائل لأن React ما ركّب بعد
  if (data.type === 'ready') void deliver()

  if (data.type === 'ack' && Array.isArray(data.ids) && data.ids.length > 0) {
    void chrome.runtime.sendMessage({ type: 'nasaq:ack', ids: data.ids })
  }
})

// إعلان للتطبيق إن الإضافة موجودة، وتسليم دوري لو أُضيفت قطعة والتبويب مفتوح
window.postMessage({ source: SOURCE, type: 'ready' }, location.origin)
void deliver()
setInterval(() => void deliver(), 2000)
