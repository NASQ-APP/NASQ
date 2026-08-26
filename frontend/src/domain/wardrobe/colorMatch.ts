/**
 * مطابقة لون مقروء من الصورة بأقرب لون في لوحة التطبيق.
 *
 * منطق نقي: يستقبل RGB ويرجّع اسم لون من `ITEM_COLORS`. المسافة تُحسب في فضاء
 * Lab لأن المسافة في RGB تخدع — الأسود والكحلي قريبان رقميًا وبعيدان للعين.
 */
import { ITEM_COLORS, type ItemColor } from './colors'

export type Rgb = { r: number; g: number; b: number }

export function hexToRgb(hex: string): Rgb {
  const value = hex.replace('#', '')
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  }
}

const toLinear = (channel: number): number => {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

const pivot = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)

/** sRGB → CIE Lab (مرجع D65). */
export function rgbToLab({ r, g, b }: Rgb): [number, number, number] {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)]

  const x = (lr * 0.4124 + lg * 0.3576 + lb * 0.1805) / 0.95047
  const y = lr * 0.2126 + lg * 0.7152 + lb * 0.0722
  const z = (lr * 0.0193 + lg * 0.1192 + lb * 0.9505) / 1.08883

  const [fx, fy, fz] = [pivot(x), pivot(y), pivot(z)]

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

const distance = (a: Rgb, b: Rgb): number => {
  const [l1, a1, b1] = rgbToLab(a)
  const [l2, a2, b2] = rgbToLab(b)
  return (l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2
}

/** أقرب لون في اللوحة للـRGB المُعطى. */
export function nearestItemColor(rgb: Rgb, palette: ItemColor[] = ITEM_COLORS): ItemColor {
  let best = palette[0]
  let bestDistance = Number.POSITIVE_INFINITY

  for (const color of palette) {
    const current = distance(rgb, hexToRgb(color.hex))
    if (current < bestDistance) {
      bestDistance = current
      best = color
    }
  }
  return best
}
