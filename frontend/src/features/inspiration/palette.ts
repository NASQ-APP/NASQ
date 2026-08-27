/**
 * استخراج ألوان اللوك من بكسلات الصورة.
 *
 * بلا ذكاء اصطناعي: هيستوغرام على مكعّبات لونية، ثم نطابق كل لون غالب على
 * أقرب لون في لوحة المشروع — فالنتيجة تتكلّم بنفس مفردات الخزانة، ويقدر
 * الستايليست يقارنها بقطعك مباشرة.
 *
 * نستبعد بكسلات البشرة: صور بنترست فيها أشخاص غالبًا، ولون البشرة ما هو من
 * ألوان اللوك. لكن **بشرط**: البيج والجملي والكريمي تقع في نفس نطاق البشرة،
 * فلو كان «لون البشرة» يغطي ثلث الصورة فأكثر فهو قماش مب بشرة — نتراجع عن
 * الاستبعاد بدل ما نمسح لون اللوك الأساسي.
 */
import { ITEM_COLORS } from '@/domain/wardrobe'
import { loadImage, proxiedImage, registerImages } from '@/infrastructure/rendering/remoteImage'
import { isSkin } from '@/infrastructure/rendering/skin'
import type { ItemColor } from '@/domain/wardrobe'

/** عرض العيّنة — الألوان إشارة إحصائية، ما تحتاج دقة بكسل. */
const SAMPLE_WIDTH = 160

/** ٤ بت لكل قناة: ٤٠٩٦ مكعّبًا — يجمع التدرّجات القريبة بلا ما يذيب الفروق. */
const BITS = 4
const SHIFT = 8 - BITS

/** لا نرجّع لونًا يشغل أقل من هذي النسبة — ظلال وحواف، مب لون لوك. */
const MIN_SHARE = 0.03

/** فوق هذي النسبة، «لون البشرة» قماش بيج مب بشرة. */
const SKIN_IS_FABRIC = 0.35

const distance = (a: [number, number, number], b: [number, number, number]) =>
  (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2

const toRgb = (hex: string): [number, number, number] => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
]

const PALETTE: { color: ItemColor; rgb: [number, number, number] }[] = ITEM_COLORS.map((color) => ({
  color,
  rgb: toRgb(color.hex),
}))

/** أقرب لون في لوحة المشروع. */
function nearest(rgb: [number, number, number]): ItemColor {
  let best = PALETTE[0]
  let bestDistance = Number.POSITIVE_INFINITY
  for (const entry of PALETTE) {
    const d = distance(rgb, entry.rgb)
    if (d < bestDistance) {
      bestDistance = d
      best = entry
    }
  }
  return best.color
}

async function readPixels(src: string): Promise<ImageData | undefined> {
  const draw = async (source: string) => {
    const image = await loadImage(source)
    if (!image.naturalWidth) return undefined

    const width = Math.min(SAMPLE_WIDTH, image.naturalWidth)
    const height = Math.max(1, Math.round((image.naturalHeight / image.naturalWidth) * width))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return undefined
    context.drawImage(image, 0, 0, width, height)
    return context.getImageData(0, 0, width, height)
  }

  /* الصور المرفوعة تُقرأ مباشرة. صور بنترست من نطاق ثانٍ بلا ترويسة CORS،
     فتلوّث الـcanvas — نعيدها عبر وسيط التطوير. */
  try {
    return await draw(src)
  } catch {
    try {
      await registerImages([src])
      return await draw(proxiedImage(src))
    } catch {
      return undefined
    }
  }
}

/**
 * يرجّع ألوان اللوك مرتّبة بالأكثر مساحة.
 * مصفوفة فاضية تعني «ما قدرنا نقرأ الصورة» — ما نخترع ألوانًا.
 */
export async function extractPalette(src: string, max = 5): Promise<ItemColor[]> {
  const frame = await readPixels(src)
  if (!frame) return []

  /* أول مرور: كم من الصورة يقع في نطاق البشرة؟ */
  let opaque = 0
  let skin = 0
  for (let i = 0; i < frame.data.length; i += 4) {
    if (frame.data[i + 3] < 128) continue
    opaque += 1
    if (isSkin(frame.data[i], frame.data[i + 1], frame.data[i + 2])) skin += 1
  }
  if (opaque === 0) return []
  const excludeSkin = skin / opaque <= SKIN_IS_FABRIC

  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>()
  let counted = 0

  for (let i = 0; i < frame.data.length; i += 4) {
    const r = frame.data[i]
    const g = frame.data[i + 1]
    const b = frame.data[i + 2]
    if (frame.data[i + 3] < 128) continue
    if (excludeSkin && isSkin(r, g, b)) continue

    const key = ((r >> SHIFT) << (BITS * 2)) | ((g >> SHIFT) << BITS) | (b >> SHIFT)
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 }
    bucket.count += 1
    bucket.r += r
    bucket.g += g
    bucket.b += b
    buckets.set(key, bucket)
    counted += 1
  }

  if (counted === 0) return []

  const ranked = [...buckets.values()]
    .filter((bucket) => bucket.count / counted >= MIN_SHARE)
    .toSorted((a, b) => b.count - a.count)

  const colors: ItemColor[] = []
  for (const bucket of ranked) {
    const color = nearest([
      Math.round(bucket.r / bucket.count),
      Math.round(bucket.g / bucket.count),
      Math.round(bucket.b / bucket.count),
    ])
    // مكعّبان متجاوران يعطيان نفس لون اللوحة — نحتفظ بالأول فقط
    if (!colors.some((existing) => existing.name === color.name)) colors.push(color)
    if (colors.length >= max) break
  }
  return colors
}
