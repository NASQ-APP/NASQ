/**
 * تجهيز الصورة المرفوعة في المتصفح: قص مربّع، تصغير، وضغط.
 *
 * ليش نصغّرها: صورة الجوال ٤ ميجا، والخزانة ممكن تصير مئة قطعة. نخزّن نسخة
 * عرض بحجم معقول، والأصل ما نحتاجه لأن العرض أقصاه بضع مئات من البكسلات.
 * إزالة الخلفية الحقيقية شغل الخادم (W-05) — هنا تجهيز عرض فقط.
 */
const MAX_EDGE = 720
const QUALITY = 0.82

export type PreparedPhoto = { blob: Blob; width: number; height: number }

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const bitmap = await createImageBitmap(file)
  const edge = Math.min(bitmap.width, bitmap.height, MAX_EDGE)

  const canvas = document.createElement('canvas')
  canvas.width = edge
  canvas.height = edge
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas unavailable')

  // خلفية بيضاء عشان الشفافية ما تطلع سوداء بعد التحويل لـJPEG
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, edge, edge)

  // قص مربّع من المنتصف — القطعة عادةً في وسط الصورة
  const side = Math.min(bitmap.width, bitmap.height)
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    edge,
    edge,
  )
  bitmap.close?.()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY),
  )
  if (!blob) throw new Error('encode failed')

  return { blob, width: edge, height: edge }
}

export const ACCEPTED_PHOTO_TYPES = 'image/jpeg,image/png,image/webp'
export const MAX_PHOTO_MB = 12
