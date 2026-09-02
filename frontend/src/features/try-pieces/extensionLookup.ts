/**
 * سؤال الإضافة عن رابط عجز الخادم عن قراءته.
 *
 * **لماذا يوجد هذا المسار أصلًا؟** المتاجر المحمية (نمشي، زارا، نون، شي إن)
 * تُسقط أي قارئ غير متصفّح، فدالة `items-from-url` لا تفتح صفحاتها مهما
 * حاولنا — وهذا حدّ مقصود: ما نتحايل على حماية موقع من الخادم.
 *
 * لكن الصفحة **كانت مفتوحة أمام المستخدمة قبل ثوانٍ** — منها نسخت الرابط.
 * وسكربت المحتوى قرأها وقتها وحفظ وصفها. فبدل أن نطلبها من الخارج، نسأل
 * المتصفّح عمّا رآه فيه.
 *
 * ما نطلب من الإضافة أن تفتح شيئًا — ولا تقدر أصلًا: صلاحياتها `storage`
 * وحدها، بلا `host_permissions` ولا `tabs`. إن لم تكن المستخدمة قد فتحت
 * الصفحة، ما عندنا شيء ونقول ذلك بصراحة.
 */
import type { RawProduct } from './import'

const EXTENSION = 'nasaq-extension'
const APP = 'nasaq-app'

/** الإضافة تجيب فورًا أو لا تجيب — الانتظار الطويل يوهم بعمل جارٍ. */
const TIMEOUT_MS = 1200

let ticketSeed = 0

/**
 * يسأل الإضافة عن وصف المنتج لهذا الرابط.
 *
 * يرجّع `undefined` حين لا تكون الإضافة مركّبة، أو ما زارت المستخدمة الصفحة.
 * الحالتان تعنيان الشيء نفسه للمستدعي: ما عندنا بيانات من هنا.
 */
export function askExtension(url: string): Promise<RawProduct | undefined> {
  if (typeof window === 'undefined') return Promise.resolve(undefined)

  const ticket = `lookup_${++ticketSeed}_${Date.now()}`

  return new Promise((resolve) => {
    let done = false

    const finish = (value?: RawProduct) => {
      if (done) return
      done = true
      window.removeEventListener('message', onMessage)
      clearTimeout(timer)
      resolve(value)
    }

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return
      const message = event.data as { source?: string; type?: string; ticket?: string; data?: unknown }
      if (message?.source !== EXTENSION || message.type !== 'lookup-result') return
      if (message.ticket !== ticket) return

      const product = message.data
      if (!product || typeof product !== 'object') return finish(undefined)
      finish(product as RawProduct)
    }

    const timer = setTimeout(() => finish(undefined), TIMEOUT_MS)
    window.addEventListener('message', onMessage)
    window.postMessage({ source: APP, type: 'lookup', url, ticket }, window.location.origin)
  })
}
