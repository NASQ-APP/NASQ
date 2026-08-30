/**
 * تجهيز المراجع قبل التوليد.
 *
 * صور القطع تعيش في IndexedDB داخل المتصفح — ما فيه رابط عام لها. فنقرأها هنا
 * ونحوّلها لـ`data:` URL يقبله المزوّد.
 *
 * القطعة بلا صورة **تُسقَط** ولا تُرسل باسمها فقط: الاسم وحده يجعل النموذج
 * يخترع قطعة من عنده، والمقصد أن تظهر قطعة المستخدمة هي.
 *
 * وصورة الموديل تُصغَّر قبل الإرسال: صورة ٩٢٨ كيلوبايت تتحوّل base64 إلى ١٫٢
 * ميجا في جسم الطلب بلا فائدة بصرية.
 */
import { readPhoto } from '@/infrastructure/storage'
import { categoryById, slotOfCategory } from '@/domain/wardrobe'
import type { GarmentReference, ImageReference } from '@/domain/tryon'
import type { WardrobeItem } from '@/domain/wardrobe'

/** أقصى ضلع للصور المرسلة — يكفي للنموذج بلا تضخيم الطلب. */
const MAX_EDGE = 1024

const toDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result)), { once: true })
    reader.addEventListener('error', () => reject(new Error('read')), { once: true })
    reader.readAsDataURL(blob)
  })

/** يصغّر ويحوّل لـJPEG — والشفافية تُسطَّح على أبيض حتى لا تصير سوداء. */
async function shrink(blob: Blob): Promise<string> {
  try {
    const bitmap = await createImageBitmap(blob)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))

    if (scale === 1 && blob.size < 400_000) {
      bitmap.close()
      return toDataUrl(blob)
    }

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)

    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      return toDataUrl(blob)
    }

    context.fillStyle = '#FFFFFF'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    return canvas.toDataURL('image/jpeg', 0.92)
  } catch {
    return toDataUrl(blob)
  }
}

/** يقرأ أي رابط (blob: · data: · /models/…) ويرجّعه data URL مصغّرًا. */
export async function referenceFromUrl(url: string): Promise<ImageReference | undefined> {
  try {
    const response = await fetch(url)
    if (!response.ok) return undefined
    return await shrink(await response.blob())
  } catch {
    return undefined
  }
}

/**
 * يحوّل القطع المختارة إلى مراجع.
 * الترتيب يُحفظ كما جاء: البرومبت يرقّم القطع، والصور تُرسل بنفس التسلسل.
 */
export async function garmentReferences(items: WardrobeItem[]): Promise<GarmentReference[]> {
  const built = await Promise.all(
    items.map(async (item) => {
      const blob = await readPhoto(item.id)
      if (!blob) return undefined

      return {
        id: item.id,
        category: categoryById(item.categoryId)?.nameLatin.toLowerCase() ?? item.shape,
        slot: slotOfCategory(item.categoryId),
        name: item.name,
        colorName: item.colorName,
        image: await shrink(blob),
      }
    }),
  )

  return built.filter((garment): garment is GarmentReference => Boolean(garment))
}
