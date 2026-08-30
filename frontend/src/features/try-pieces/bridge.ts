/**
 * استقبال القطع من إضافة المتصفح.
 *
 * تصلنا رسالتان: **قطعة** من صفحة منتج في متجر، و**إلهام** من صفحة Pin في
 * بنترست. القطعة تمر على نفس تحويل اللصق ونفس `addItem`، والإلهام يروح لصفحة
 * «إلهامي» وتُقرأ ألوانه — ما يدخل الخزانة ولا قطع التجربة.
 *
 * محتوى الرسالة جاي من صفحة متجر ما نملكها، فنتعامل معه كبيانات غير موثوقة:
 * نقرأ الحقول المعروفة فقط، ونتحقق من أنواعها وأطوالها وروابطها.
 */
import { useEffect, useRef } from 'react'
import { useWardrobe } from '@/features/wardrobe/store'
import { toast } from '@/shared/components/ui'
import { CATEGORIES, ITEM_COLORS, categoryById, shapesForSlot } from '@/domain/wardrobe'
import { useInspiration } from '@/features/inspiration/store'
import { inspirationAnalyzer } from '@/features/inspiration/analyze'
import { productFromRaw, type RawProduct } from './import'
import { sourceById } from './sources'

const EXTENSION = 'nasaq-extension'
const APP = 'nasaq-app'

const str = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : undefined
}

const link = (value: unknown): string | undefined => {
  const raw = str(value, 2000)
  if (!raw) return undefined
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

/** يقبل رسالة الإضافة أو يرفضها — بلا ثقة في أي حقل. */
function toRaw(value: unknown): RawProduct | undefined {
  if (!value || typeof value !== 'object') return undefined
  const input = value as Record<string, unknown>

  const sourceLink = link(input.sourceLink)
  const name = str(input.name, 200)
  if (!sourceLink || !name) return undefined

  const images = Array.isArray(input.images)
    ? input.images.map(link).filter((src): src is string => Boolean(src)).slice(0, 12)
    : []

  return {
    extracted: true,
    sourceLink,
    storeId: sourceById(str(input.storeId, 20))?.id,
    name,
    brand: str(input.brand, 80),
    imageUrl: images[0] ?? link(input.imageUrl),
    images: images.length > 0 ? images : undefined,
    price: str(input.price, 24),
    currency: str(input.currency, 8),
    color: str(input.color, 40),
  }
}

/**
 * يركّب المستقبِل على مستوى التطبيق، فأي صفحة مفتوحة تستقبل القطعة.
 * بدون إضافة مركّبة ما يصير شي — الاستيراد باللصق يبقى كما هو.
 */
export function useStoreBridge(): void {
  const addItem = useWardrobe((s) => s.addItem)
  const addInspiration = useInspiration((s) => s.add)
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
      if (message?.source !== EXTENSION) return
      if (message.type !== 'product' && message.type !== 'inspiration') return

      const id = typeof message.id === 'string' ? message.id : undefined
      if (!id || handled.current.has(id)) return
      handled.current.add(id)

      const ack = () =>
        window.postMessage({ source: APP, type: 'ack', ids: [id] }, window.location.origin)
      const payload = message.data ?? message.product

      if (message.type === 'inspiration') {
        void (async () => {
          const imageUrl = link((payload as Record<string, unknown> | undefined)?.imageUrl)
          if (!imageUrl) {
            toast.error('وصلنا إلهام بلا صورة.')
            ack()
            return
          }
          const reading = await inspirationAnalyzer.read(imageUrl)
          addInspiration({
            source: 'pinterest',
            imageUrl,
            sourceLink: link((payload as Record<string, unknown>).sourceLink),
            palette: reading.palette,
            pieces: [],
            tags: [],
          })
          toast.ok('أضفناه لإلهامك')
          ack()
        })()
        return
      }

      void (async () => {
        const raw = toRaw(payload)
        if (!raw) {
          toast.error('وصلتنا قطعة ناقصة من الإضافة.')
          ack()
          return
        }

        const product = await productFromRaw(raw)
        if (!product.extracted) {
          toast.error(product.reason ?? 'ما قدرنا نقرأ القطعة من الإضافة.')
          ack()
          return
        }

        const categoryId = product.categoryId ?? CATEGORIES[0].id
        const slot = categoryById(categoryId)?.slot ?? 'top'
        const store = sourceById(product.storeId)

        addItem({
          name: product.name ?? `قطعة من ${store?.name ?? 'متجر خارجي'}`,
          categoryId,
          shape: product.shape ?? shapesForSlot(slot)[0].id,
          colorHex: product.colorHex ?? ITEM_COLORS[0].hex,
          colorName: product.colorName ?? ITEM_COLORS[0].name,
          imageUrl: product.imageUrl,
          images: product.images,
          imageHasModel: product.imageHasModel,
          brand: product.brand,
          price: product.price,
          wardrobeId: null,
          source: 'try',
          storeId: product.storeId,
          sourceLink: product.sourceLink,
        })

        toast.ok(`أضفنا ${product.name} لقطع التجربة`)
        ack()
      })()
    }

    window.addEventListener('message', onMessage)
    // الإعلان بعد التركيب: قبله تضيع أي رسالة ترسلها الإضافة
    window.postMessage({ source: APP, type: 'ready' }, window.location.origin)

    return () => window.removeEventListener('message', onMessage)
  }, [addItem, addInspiration])
}
