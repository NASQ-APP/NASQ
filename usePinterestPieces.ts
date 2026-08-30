/**
 * استقبال قطع بنترست من إضافة المتصفح.
 *
 * الإضافة تشتغل في صفحة بنترست، وتخزّن القطعة في طابور، وتسلّمها للتطبيق أول
 * ما يُفتح عبر `postMessage`. هذا الخطّاف يستقبلها **ويعطيك إياها خامًا** —
 * ما يعرف متجر حالتك ولا مفرداتك، فأنتِ تضيفينها بدالتك أنتِ.
 *
 * **بلا اعتماديات غير React.** ما فيه متجر ولا راوتر ولا تنبيهات ولا نظام
 * ألوان — يشتغل مع أي تصميم.
 *
 * الرسالة تجي من صفحة ما نملكها، فنعاملها **كبيانات غير موثوقة**: نقرأ
 * الحقول المعروفة فقط، ونتحقّق من أنواعها وأطوالها وروابطها.
 */
import { useEffect, useRef } from 'react'

/** القطعة كما تصل من بنترست — بلا سعر ولا ماركة ولا فئة. */
export type IncomingPiece = {
  /** عنوان الـPin أو النص البديل للصورة */
  name: string
  imageUrl?: string
  /** رابط الـPin الأصلي، للرجوع إليه */
  sourceLink: string
  /** ثابت: 'pinterest' */
  storeId: string
}

const EXTENSION = 'dulabi-extension'
const APP = 'dulabi-app'

const text = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : undefined
}

const link = (value: unknown): string | undefined => {
  const raw = text(value, 2000)
  if (!raw) return undefined
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

/** يقبل الرسالة أو يرفضها — بلا ثقة في أي حقل. */
function toPiece(value: unknown): IncomingPiece | undefined {
  if (!value || typeof value !== 'object') return undefined
  const input = value as Record<string, unknown>

  const sourceLink = link(input.sourceLink)
  const name = text(input.name, 200)
  if (!sourceLink || !name) return undefined

  const images = Array.isArray(input.images) ? input.images.map(link).filter(Boolean) : []

  return {
    name,
    sourceLink,
    imageUrl: (images[0] as string | undefined) ?? link(input.imageUrl),
    storeId: text(input.storeId, 20) ?? 'pinterest',
  }
}

/**
 * يركّبه مرة واحدة على مستوى التطبيق (في `App` مثلًا).
 *
 * @param onPiece تُنادى لكل قطعة تصل. أضيفيها لخزانتك هنا.
 *
 * @example
 * usePinterestPieces((piece) => {
 *   addItem({ name: piece.name, imageUrl: piece.imageUrl, source: 'try' })
 * })
 */
export function usePinterestPieces(onPiece: (piece: IncomingPiece) => void): void {
  /* مرجع بدل اعتمادية: الدالة تتغيّر مع كل رسم، ولو أعدنا تركيب المستمع
     معها ضاعت أي رسالة تصل في اللحظة بينهما. */
  const handler = useRef(onPiece)
  handler.current = onPiece

  const handled = useRef(new Set<string>())

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return

      const message = event.data as {
        source?: string
        type?: string
        id?: string
        data?: unknown
        product?: unknown
      }
      if (message?.source !== EXTENSION || message.type !== 'product') return

      const id = typeof message.id === 'string' ? message.id : undefined
      if (!id || handled.current.has(id)) return
      handled.current.add(id)

      const piece = toPiece(message.data ?? message.product)
      if (piece) handler.current(piece)

      /* التأكيد يشيلها من طابور الإضافة. نؤكّد حتى لو رفضناها، وإلا بقيت
         معلّقة والشارة تعدّها للأبد. */
      window.postMessage({ source: APP, type: 'ack', ids: [id] }, window.location.origin)
    }

    window.addEventListener('message', onMessage)
    // الإعلان بعد التركيب: قبله تضيع أي رسالة ترسلها الإضافة
    window.postMessage({ source: APP, type: 'ready' }, window.location.origin)

    return () => window.removeEventListener('message', onMessage)
  }, [])
}
