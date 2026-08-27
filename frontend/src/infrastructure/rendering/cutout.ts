/**
 * قصّ القطعة من خلفية صورة المتجر.
 *
 * صور الباكشوت تجي على خلفية استوديو سادة. نمسحها بتعبئة فيضية من الحواف:
 * نبدأ من أطراف الصورة ونمشي داخلًا ما دام اللون قريبًا من لون الخلفية،
 * ونقف عند أول لون مختلف. الفرق بين هذا وبين «امسح كل أبيض» إن الأبيض داخل
 * القطعة نفسها — ياقة، طبعة، حزام — يبقى، لأنه غير موصول بالحافة.
 *
 * بعدها نقصّ الصورة على حدود ما تبقّى، فتملأ القطعة إطارها بلا هوامش.
 *
 * بلا ذكاء اصطناعي وبلا خادم: هذا يشتغل مع الخلفيات السادة، ولو كانت الخلفية
 * مشهدًا أو فيها ظلال قوية نرجّع الصورة كما هي بدل ما نخربها.
 */
import { loadImage, proxiedImage, registerImages } from './remoteImage'
import { isSkin } from './skin'

/**
 * أقصى عرض للقص.
 *
 * الصورة تُضمَّن داخل رابط بيانات داخل رابط بيانات ثانٍ (SVG)، فكل بكسل زائد
 * يتضاعف حجمه مرتين. اللقطة تُعرض بعرض ~٢٥٠ بكسل، فأكثر من هذا وزن بلا فائدة.
 */
const MAX_WIDTH = 260

/** فرق لوني مقبول ليُعدّ البكسل امتدادًا للخلفية. */
const TOLERANCE = 30

/** لو ما بقي من الصورة إلا القليل فالقصّ غلط — نتراجع عنه. */
const MIN_KEPT = 0.06

/** نتيجة القص: صورة القطعة، ولونها الغالب لتعبئة ما لا تغطّيه. */
export type Cutout = {
  url: string
  /** اللون الغالب في القطعة — يملأ فراغ الصورة داخل حدود الجسم */
  tint: string
}

const cache = new Map<string, Cutout | undefined>()

type Pixels = { data: Uint8ClampedArray; width: number; height: number }

const at = (p: Pixels, x: number, y: number) => (y * p.width + x) * 4

const near = (p: Pixels, i: number, r: number, g: number, b: number) =>
  Math.abs(p.data[i] - r) + Math.abs(p.data[i + 1] - g) + Math.abs(p.data[i + 2] - b) < TOLERANCE * 3

/** لون الخلفية من الأركان الأربعة، ولا نقبله إلا إذا اتفقت. */
function backgroundColor(p: Pixels): [number, number, number] | undefined {
  const corners = [
    at(p, 0, 0),
    at(p, p.width - 1, 0),
    at(p, 0, p.height - 1),
    at(p, p.width - 1, p.height - 1),
  ]
  const [r, g, b] = [p.data[corners[0]], p.data[corners[0] + 1], p.data[corners[0] + 2]]
  return corners.every((i) => near(p, i, r, g, b)) ? [r, g, b] : undefined
}

/** تعبئة فيضية من كل الحواف — تشيل الخلفية الموصولة فقط. */
function clearBackground(p: Pixels, [r, g, b]: [number, number, number]): number {
  const seen = new Uint8Array(p.width * p.height)
  const stack: number[] = []

  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= p.width || y >= p.height) return
    const key = y * p.width + x
    if (seen[key]) return
    seen[key] = 1
    if (!near(p, key * 4, r, g, b)) return
    p.data[key * 4 + 3] = 0
    stack.push(key)
  }

  for (let x = 0; x < p.width; x += 1) {
    push(x, 0)
    push(x, p.height - 1)
  }
  for (let y = 0; y < p.height; y += 1) {
    push(0, y)
    push(p.width - 1, y)
  }

  let cleared = 0
  while (stack.length > 0) {
    const key = stack.pop() as number
    cleared += 1
    const x = key % p.width
    const y = (key - x) / p.width
    push(x - 1, y)
    push(x + 1, y)
    push(x, y - 1)
    push(x, y + 1)
  }
  return cleared
}

/** حدود ما بقي ظاهرًا. */
function opaqueBounds(p: Pixels) {
  let minX = p.width
  let minY = p.height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < p.height; y += 1) {
    for (let x = 0; x < p.width; x += 1) {
      if (p.data[at(p, x, y) + 3] > 24) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  return maxX < minX || maxY < minY ? undefined : { minX, minY, maxX, maxY }
}

/**
 * يرجّع صورة القطعة كرابط بيانات بلا خلفية، أو `undefined` لو ما قدرنا نقرأها.
 *
 * لازم تكون رابط بيانات: الـSVG يُعرض داخل `<img>`، وهناك ما يُسمح له بجلب أي
 * مورد خارجي.
 */
export async function garmentCutout(src: string): Promise<Cutout | undefined> {
  if (cache.has(src)) return cache.get(src)

  const result = await cut(src)
  cache.set(src, result)
  return result
}

async function cut(src: string): Promise<Cutout | undefined> {
  await registerImages([src])

  let image: HTMLImageElement
  try {
    image = await loadImage(proxiedImage(src))
  } catch {
    return undefined
  }
  if (!image.naturalWidth || !image.naturalHeight) return undefined

  const width = Math.min(MAX_WIDTH, image.naturalWidth)
  const height = Math.max(1, Math.round((image.naturalHeight / image.naturalWidth) * width))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return undefined
  context.drawImage(image, 0, 0, width, height)

  let frame: ImageData
  try {
    frame = context.getImageData(0, 0, width, height)
  } catch {
    // الصورة ما مرّت عبر الوسيط فتلوّث الـcanvas
    return undefined
  }

  const pixels: Pixels = { data: frame.data, width, height }
  const background = backgroundColor(pixels)
  if (background) {
    const cleared = clearBackground(pixels, background)
    // بقي أقل من اللازم: الخلفية ما كانت سادة، فنتراجع ونعرض الصورة كاملة
    if (1 - cleared / (width * height) < MIN_KEPT) {
      context.drawImage(image, 0, 0, width, height)
      return finish(canvas, pixels)
    }
  }

  clearStoreModel(pixels)
  context.putImageData(frame, 0, 0)

  const bounds = opaqueBounds(pixels)
  if (!bounds) return finish(canvas, pixels)

  const trimmed = document.createElement('canvas')
  trimmed.width = bounds.maxX - bounds.minX + 1
  trimmed.height = bounds.maxY - bounds.minY + 1
  const trimContext = trimmed.getContext('2d')
  if (!trimContext) return finish(canvas, pixels)
  trimContext.drawImage(
    canvas,
    bounds.minX,
    bounds.minY,
    trimmed.width,
    trimmed.height,
    0,
    0,
    trimmed.width,
    trimmed.height,
  )
  return finish(trimmed, pixels)
}

/**
 * يشيل عارضة المتجر من الصورة.
 *
 * صورة على عارضة تُقصّ داخل حدود الموديل فيظهر وجه غريب فوق جسم الموديل.
 * نشيل البشرة، ونشيل كل ما فوق الرأس معها (الشعر ما يُميَّز بلون، لكنه دائمًا
 * فوق أعلى بشرة ظاهرة). الباقي قماش.
 *
 * لو كانت «البشرة» نصف الصورة فأغلب الظن إن القطعة نفسها بلون البشرة — نترك
 * الصورة كما هي بدل ما نمسحها.
 */
function clearStoreModel(p: Pixels): void {
  const skinRows: number[] = Array.from({ length: p.height }, () => 0)
  let skin = 0
  let opaque = 0

  for (let y = 0; y < p.height; y += 1) {
    for (let x = 0; x < p.width; x += 1) {
      const i = at(p, x, y)
      if (p.data[i + 3] <= 24) continue
      opaque += 1
      if (isSkin(p.data[i], p.data[i + 1], p.data[i + 2])) {
        skin += 1
        skinRows[y] += 1
      }
    }
  }

  if (opaque === 0 || skin === 0) return
  if (skin / opaque > 0.45) return

  /* الرأس: أعلى نطاق فيه بشرة واضحة. نمسح لين نهايته، فيروح معه الشعر. */
  const headLimit = Math.round(p.height * 0.45)
  let headBottom = -1
  for (let y = 0; y < headLimit; y += 1) {
    if (skinRows[y] > p.width * 0.02) headBottom = y
  }

  for (let y = 0; y < p.height; y += 1) {
    for (let x = 0; x < p.width; x += 1) {
      const i = at(p, x, y)
      if (p.data[i + 3] <= 24) continue
      const isHead = y <= headBottom
      if (isHead || isSkin(p.data[i], p.data[i + 1], p.data[i + 2])) p.data[i + 3] = 0
    }
  }
}

/** متوسط لون ما بقي ظاهرًا — يملأ ما لا تغطّيه الصورة داخل حدود الجسم. */
function dominantColor(p: Pixels): string {
  let r = 0
  let g = 0
  let b = 0
  let count = 0
  for (let i = 0; i < p.data.length; i += 4) {
    if (p.data[i + 3] <= 24) continue
    r += p.data[i]
    g += p.data[i + 1]
    b += p.data[i + 2]
    count += 1
  }
  if (count === 0) return '#B9B3AA'
  const hex = (value: number) =>
    Math.round(value / count)
      .toString(16)
      .padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

function finish(canvas: HTMLCanvasElement, pixels: Pixels): Cutout | undefined {
  try {
    return { url: canvas.toDataURL('image/png'), tint: dominantColor(pixels) }
  } catch {
    return undefined
  }
}
