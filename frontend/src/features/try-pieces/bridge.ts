/**
 * استقبال القطع من إضافة المتصفح.
 *
 * تصلنا رسالتان: **قطعة** من صفحة منتج في متجر، و**إلهام** من نسخة قديمة من
 * الإضافة. الوجهة واحدة: **قطع التجربة**. صفحة «إلهامي» انحذفت، فما بقي مكان
 * ثانٍ يروح له المستورد — والإلهام يتحوّل لقطعة بنترست ويمر على نفس المسار.
 *
 * محتوى الرسالة جاي من صفحة متجر ما نملكها، فنتعامل معه كبيانات غير موثوقة:
 * نقرأ الحقول المعروفة فقط، ونتحقق من أنواعها وأطوالها وروابطها.
 *
 * **قطعة بنترست تنتظر قرار المستخدمة.** بنترست ما تنشر فئة، والاسم غالبًا
 * تعليق مب اسم منتج — فلو خمّنّاها سقطت على أول فئة في القائمة بلا سبب.
 * نوقفها في `pending` ونسأل، والإضافة ما تصير إلا بعد اختيارها.
 */
import { useEffect, useRef, useState } from 'react'
import { itemBySourceLink, useWardrobe } from '@/features/wardrobe/store'
import { toast } from '@/shared/components/ui'
import { CATEGORIES, ITEM_COLORS, categoryById, shapesForSlot } from '@/domain/wardrobe'
import { productFromRaw, type ImportedProduct, type RawProduct } from './import'
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
 * إلهام من نسخة قديمة من الإضافة → قطعة بنترست.
 *
 * رسالة الإلهام ما فيها إلا صورة ورابط: لا اسم ولا فئة. نعطيها اسمًا محايدًا
 * ونعلّمها بنترست، فتقف في طابور اختيار الفئة مثل أي Pin بدل ما تضيع.
 */
function inspirationToRaw(value: unknown): RawProduct | undefined {
  if (!value || typeof value !== 'object') return undefined
  const input = value as Record<string, unknown>

  const imageUrl = link(input.imageUrl)
  if (!imageUrl) return undefined

  return {
    extracted: true,
    storeId: 'pinterest',
    sourceLink: link(input.sourceLink) ?? imageUrl,
    name: str(input.name, 200) ?? 'قطعة من بنترست',
    imageUrl,
    images: [imageUrl],
  }
}

/**
 * يركّب المستقبِل على مستوى التطبيق، فأي صفحة مفتوحة تستقبل القطعة.
 * بدون إضافة مركّبة ما يصير شي — الاستيراد باللصق يبقى كما هو.
 */
/** قطعة وصلت وتنتظر فئة — نعرضها للمستخدمة واحدة واحدة. */
export type PendingPiece = { product: ImportedProduct; storeName?: string }

export function useStoreBridge() {
  const addItem = useWardrobe((s) => s.addItem)
  const handled = useRef(new Set<string>())
  const [pending, setPending] = useState<PendingPiece[]>([])

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

      void (async () => {
        const raw = message.type === 'inspiration' ? inspirationToRaw(payload) : toRaw(payload)
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

        const store = sourceById(product.storeId)

        /*
          وصلت قبل: نقول وما نضيف.

          الإضافة ترسل مرتين بسهولة — ضغطة مكررة، أو تبويب ثانٍ مفتوح يستلم
          نفس الطابور. والحراسة هنا لا في المخزن، لأن المستخدمة تستاهل جوابًا
          يقول وش صار بدل صمت.
        */
        const existing = itemBySourceLink(product.sourceLink)
        if (existing) {
          toast.info(`${existing.name} موجودة عندك من قبل.`)
          ack()
          return
        }

        /* بلا فئة موثوقة ما نخمّن — نسأل. بنترست الحالة الوحيدة اليوم. */
        if (product.storeId === 'pinterest') {
          setPending((queue) => [...queue, { product, storeName: store?.name }])
          ack()
          return
        }

        const categoryId = product.categoryId ?? CATEGORIES[0].id
        const slot = categoryById(categoryId)?.slot ?? 'top'

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
  }, [addItem])

  /** تختار المستخدمة الفئة، فتدخل القطعة الخزانة بها. */
  const choose = (categoryId: string) => {
    const next = pending[0]
    if (!next) return
    const slot = categoryById(categoryId)?.slot ?? 'top'
    const { product } = next

    const existing = itemBySourceLink(product.sourceLink)
    if (existing) {
      toast.info(`${existing.name} موجودة عندك من قبل.`)
      setPending((queue) => queue.slice(1))
      return
    }

    addItem({
      name: product.name ?? `قطعة من ${next.storeName ?? 'بنترست'}`,
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
    setPending((queue) => queue.slice(1))
  }

  /** تتجاهلها — ما تدخل الخزانة، وما نحفظ منها شيئًا. */
  const dismiss = () => setPending((queue) => queue.slice(1))

  return { pending: pending[0], waiting: pending.length, choose, dismiss }
}
