/**
 * تبنّي صورة القطعة المستوردة.
 *
 * القطعة المستوردة تصل ومعها **رابط صورة عند المتجر**، لا صورة عندنا. وهذا
 * يكفي للعرض في البطاقة — الوسم `img` يحمّل من أي نطاق — لكنه **لا يكفي
 * للتلبيس**: دالة التوليد تمرّر الرابط كما هو للمزوّد، والمزوّد لا يفتح صفحات
 * المتاجر، فترجع الإطلالة مرفوضة والقطعة تبدو «بلا صورة» رغم أن صورتها ظاهرة
 * أمام المستخدمة.
 *
 * فننقل الصورة إلى تخزيننا مرة واحدة عند الاستيراد: تُحفظ محليًا وتُرفع، فيصير
 * لها `photo_path` — وتصير القطعة قابلة للّبس بلا أن ترفع المستخدمة صورتها
 * مرة ثانية.
 *
 * **بلا صخب**: الفشل هنا لا يُبطل الاستيراد. القطعة دخلت وبطاقتها تعرض صورة
 * المتجر، وأسوأ ما يصير أن التلبيس يطلب صورة لاحقًا — وهذا أهون من رفض القطعة.
 */
import { useItemPhotos } from '@/features/wardrobe/photos'
import { proxiedImage, registerImages } from '@/infrastructure/rendering/remoteImage'

/** أقصى حجم نقبله — صورة منتج أكبر من هذا غالبًا صفحة خطأ لا صورة. */
const MAX_BYTES = 8 * 1024 * 1024

/** أقصى ضلع — يكفي النموذج بلا تضخيم ما نخزّنه ونرسله. */
const MAX_EDGE = 1024

/**
 * تُعاد الترميز إلى JPEG.
 *
 * المتاجر تخدم `webp` غالبًا لأنه أخفّ، والمتصفّح يعرضه بلا مشكلة — فالبطاقة
 * تبدو سليمة. لكن الصورة تُرسل بعدها لنموذج التوليد، وهناك لا تُقرأ كما تُقرأ
 * في الصفحة: يرجع النموذج الصورة كما هي بلا تلبيس، فتبدو الميزة «تشتغل» وهي
 * لا تفعل شيئًا.
 *
 * فنخزّن ما يقبله الطرفان. والشفافية تُسطَّح على أبيض حتى لا تصير سوداء.
 * وإن تعذّر التحويل نخزّن الأصل — صورة بصيغة أصلية خير من لا صورة.
 */
async function toJpeg(blob: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(blob)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)

    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      return blob
    }

    context.fillStyle = '#FFFFFF'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const encoded = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    )
    return encoded ?? blob
  } catch {
    return blob
  }
}

/**
 * يجلب صورة المتجر.
 *
 * المباشر أولًا؛ وشبكات المتاجر لا ترسل CORS فيفشل، فنمرّرها بوسيط التطوير —
 * نفس ما تفعله `cutout` و`pick-image`.
 */
async function fetchStoreImage(src: string): Promise<Blob | undefined> {
  const read = async (url: string): Promise<Blob | undefined> => {
    try {
      const response = await fetch(url)
      if (!response.ok) return undefined
      const blob = await response.blob()
      if (!blob.type.startsWith('image/') || blob.size === 0 || blob.size > MAX_BYTES) {
        return undefined
      }
      return blob
    } catch {
      return undefined
    }
  }

  const direct = await read(src)
  if (direct) return direct

  await registerImages([src])
  return read(proxiedImage(src))
}

/** ينقل صورة القطعة المستوردة إلى تخزيننا. يبتلع الفشل عن قصد. */
export async function adoptStorePhoto(itemId: string, imageUrl?: string): Promise<boolean> {
  if (!imageUrl || !/^https?:\/\//.test(imageUrl)) return false

  const blob = await fetchStoreImage(imageUrl)
  if (!blob) return false

  try {
    await useItemPhotos.getState().set(itemId, await toJpeg(blob))
    return true
  } catch {
    return false
  }
}
