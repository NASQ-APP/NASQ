import { describe, expect, it } from 'vitest'
import { buildBackgroundMask, estimateBackground } from './backgroundMask'

type Rgb = [number, number, number]

/** يبني صورة اختبار: خلفية موحّدة وفيها مستطيل في المنتصف. */
function scene(
  width: number,
  height: number,
  background: Rgb,
  subject?: { rgb: Rgb; inset: number },
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inSubject =
        subject !== undefined &&
        x >= subject.inset &&
        y >= subject.inset &&
        x < width - subject.inset &&
        y < height - subject.inset
      const [r, g, b] = inSubject ? subject.rgb : background
      const p = (y * width + x) * 4
      data[p] = r
      data[p + 1] = g
      data[p + 2] = b
      data[p + 3] = 255
    }
  }
  return data
}

const at = (mask: Uint8Array, width: number, x: number, y: number) => mask[y * width + x]

describe('estimateBackground', () => {
  it('يقرأ لون الخلفية من الإطار الخارجي', () => {
    const size = 40
    const pixels = scene(size, size, [216, 203, 182], { rgb: [27, 27, 27], inset: 10 })
    const { reference, spread } = estimateBackground(pixels, size, size)

    // بيج فاتح: لمعان عالٍ ومكوّن أصفر موجب
    expect(reference.l).toBeGreaterThan(75)
    expect(reference.b).toBeGreaterThan(5)
    // خلفية موحّدة تمامًا ← تشتّت شبه معدوم
    expect(spread).toBeLessThan(1)
  })

  it('يعطي تشتّتًا أوسع لخلفية متدرّجة', () => {
    const size = 40
    const pixels = new Uint8ClampedArray(size * size * 4)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const p = (y * size + x) * 4
        const value = 140 + x * 2
        pixels[p] = value
        pixels[p + 1] = value
        pixels[p + 2] = value
        pixels[p + 3] = 255
      }
    }
    expect(estimateBackground(pixels, size, size).spread).toBeGreaterThan(3)
  })
})

describe('buildBackgroundMask', () => {
  it('يفصل قطعة داكنة عن خلفية بيج', () => {
    const size = 60
    const pixels = scene(size, size, [216, 203, 182], { rgb: [27, 27, 27], inset: 15 })
    const { mask, backgroundRatio } = buildBackgroundMask(pixels, size, size, { feather: 0 })

    expect(at(mask, size, 2, 2)).toBe(255) // زاوية = خلفية
    expect(at(mask, size, 30, 30)).toBe(0) // المنتصف = قطعة
    expect(backgroundRatio).toBeGreaterThan(0.5)
    expect(backgroundRatio).toBeLessThan(0.8)
  })

  it('يفصل قطعة فاتحة عن خلفية داكنة', () => {
    const size = 60
    const pixels = scene(size, size, [40, 44, 52], { rgb: [244, 243, 240], inset: 18 })
    const { mask } = buildBackgroundMask(pixels, size, size, { feather: 0 })

    expect(at(mask, size, 1, 1)).toBe(255)
    expect(at(mask, size, 30, 30)).toBe(0)
  })

  it('ما يشيل لون القطعة لو كان يشبه الخلفية لكنه غير متصل بالحافة', () => {
    const size = 60
    // القطعة بنفس لون الخلفية تقريبًا، لكنها محاطة بإطار داكن
    const pixels = scene(size, size, [216, 203, 182], { rgb: [30, 30, 30], inset: 12 })
    for (let y = 20; y < 40; y++) {
      for (let x = 20; x < 40; x++) {
        const p = (y * size + x) * 4
        pixels[p] = 214
        pixels[p + 1] = 201
        pixels[p + 2] = 180
        pixels[p + 3] = 255
      }
    }
    const { mask } = buildBackgroundMask(pixels, size, size, { feather: 0 })

    // الجيب الفاتح داخل القطعة يبقى قطعة لأنه ما يوصل الحافة
    expect(at(mask, size, 30, 30)).toBe(0)
    expect(at(mask, size, 1, 1)).toBe(255)
  })

  it('يعتبر الصورة كلها خلفية لما ما فيه قطعة', () => {
    const size = 40
    const { backgroundRatio } = buildBackgroundMask(
      scene(size, size, [216, 203, 182]),
      size,
      size,
      { feather: 0 },
    )
    expect(backgroundRatio).toBe(1)
  })

  it('ما يشيل شيئًا لما تملأ القطعة الإطار', () => {
    const size = 40
    // لا فرق بين الحافة والمنتصف: كل شي قطعة
    const pixels = scene(size, size, [27, 27, 27])
    const { backgroundRatio } = buildBackgroundMask(pixels, size, size, {
      step: 1,
      bound: 2,
      feather: 0,
    })
    expect(backgroundRatio).toBe(1)
  })

  it('التلطيف يعطي حافة متدرّجة بدل حدّ قاطع', () => {
    const size = 60
    const pixels = scene(size, size, [216, 203, 182], { rgb: [27, 27, 27], inset: 15 })
    const { mask } = buildBackgroundMask(pixels, size, size, { feather: 3 })

    const edge = at(mask, size, 15, 30)
    expect(edge).toBeGreaterThan(0)
    expect(edge).toBeLessThan(255)
    // الزاوية والمركز يبقيان قاطعين
    expect(at(mask, size, 1, 1)).toBe(255)
    expect(at(mask, size, 30, 30)).toBe(0)
  })
})

describe('buildBackgroundMask — الحالات اللي تفسد الجودة', () => {
  it('يشيل الخلفية المتدرّجة كاملة، مو نصفها', () => {
    const size = 80
    const pixels = new Uint8ClampedArray(size * size * 4)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const inSubject = x >= 28 && x < 52 && y >= 20 && y < 60
        // الخلفية تتدرّج من ١٧٠ إلى ٢٣٠ عبر الصورة
        const shade = 170 + Math.round(((x + y) / (size * 2)) * 60)
        const p = (y * size + x) * 4
        const [r, g, b] = inSubject ? [30, 34, 44] : [shade, shade - 8, shade - 22]
        pixels[p] = r
        pixels[p + 1] = g
        pixels[p + 2] = b
        pixels[p + 3] = 255
      }
    }
    const { mask } = buildBackgroundMask(pixels, size, size, { feather: 0 })

    // الطرفان المتباعدان في الإضاءة كلاهما خلفية
    expect(at(mask, size, 2, 2)).toBe(255)
    expect(at(mask, size, size - 3, size - 3)).toBe(255)
    // القطعة سليمة
    expect(at(mask, size, 40, 40)).toBe(0)
  })

  it('يشيل ظل القطعة فما تبقى هالة رمادية حولها', () => {
    const size = 200
    const background: Rgb = [216, 203, 182]
    const pixels = scene(size, size, background)
    // هالة ظل بسمك ٨ بكسل حول القطعة: نفس درجة اللون وأغمق بـ٣٥٪
    for (let y = 62; y < 138; y++) {
      for (let x = 62; x < 138; x++) {
        const p = (y * size + x) * 4
        pixels[p] = Math.round(background[0] * 0.65)
        pixels[p + 1] = Math.round(background[1] * 0.65)
        pixels[p + 2] = Math.round(background[2] * 0.65)
      }
    }
    // القطعة فوق الظل
    for (let y = 70; y < 130; y++) {
      for (let x = 70; x < 130; x++) {
        const p = (y * size + x) * 4
        pixels[p] = 30
        pixels[p + 1] = 34
        pixels[p + 2] = 44
      }
    }
    const { mask } = buildBackgroundMask(pixels, size, size, { feather: 0 })

    expect(at(mask, size, 64, 100)).toBe(255) // الظل انشال
    expect(at(mask, size, 100, 100)).toBe(0) // قلب القطعة باقٍ
    expect(at(mask, size, 75, 100)).toBe(0) // وحافتها كذلك
  })

  it('ما يهرب داخل قطعة لونها قريب من الخلفية', () => {
    const size = 200
    // قطعة بيج فاتح على خلفية بيج — الفرق بسيط لكن الحدّ قفزة واضحة
    const pixels = scene(size, size, [216, 203, 182], { rgb: [176, 163, 142], inset: 60 })
    const { mask, backgroundRatio } = buildBackgroundMask(pixels, size, size, { feather: 0 })

    expect(at(mask, size, 100, 100)).toBe(0)
    // القطعة تشغل ١٦٪ من الإطار؛ نسمح بقضم حافة رفيع من مرحلة الظل فقط
    expect(backgroundRatio).toBeLessThan(0.88)
  })
})
