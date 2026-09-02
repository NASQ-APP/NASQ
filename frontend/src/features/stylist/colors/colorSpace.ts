/**
 * اللون كقياس، لا كاسم.
 *
 * الستايليست كان يقارن أسماء الألوان بجدول شراكات مكتوب يدويًا — «عنّابي»
 * يناسب «كريمي». وذاك يعمل داخل لوحتنا الستّ عشرة وحدها: قطعة مستوردة من
 * متجر تحمل `colorHex` لا يقابله اسم في الجدول، فتسقط من كل حساب لوني.
 *
 * هنا يُقرأ اللون من `hex` مباشرة: زاويته على العجلة، وتشبّعه، وسطوعه. فيصير
 * لكل قطعة موقع محسوب — من خزانتها أو من متجر لم نره قبل.
 *
 * **والاسم يبقى**: لوحتنا اختيار تصميمي، ومحايداتها المسمّاة أدقّ من أي عتبة
 * حسابية. فالحياد يُقرأ من الاثنين — القائمة المنسّقة أولاً، ثم الحساب لما
 * يكون اللون غريبًا عنها.
 */
import {
  ITEM_COLORS,
  NEUTRAL_COLOR_NAMES,
  hexToRgb,
  nearestItemColor,
  rgbToLab,
} from '@/domain/wardrobe'

export type ColorTemperature = 'warm' | 'cool' | 'neutral'

export type ColorProfile = {
  hex: string
  /** الزاوية على عجلة الألوان — ٠ أحمر، ١٢٠ أخضر، ٢٤٠ أزرق */
  hue: number
  /** نقاء اللون — صفر رمادي، واحد مشبَع */
  saturation: number
  /** السطوع — صفر أسود، واحد أبيض */
  lightness: number
  /** أقرب لون من لوحتنا — اسمٌ يُقال للمستخدمة */
  family: string
  temperature: ColorTemperature
  neutral: boolean
}

/** قطبا الحرارة على العجلة: البرتقالي دفءٌ خالص، والأزرق برودةٌ خالصة. */
const WARM_POLE = 30
const COOL_POLE = 210

/**
 * مدى الثقة بالاسم — بفرق Lab.
 *
 * ما دون ٢٥ فرقٌ يراه الناس تدرّجًا في اللون نفسه، وفوقه لونان مختلفان.
 */
const NAME_TRUST_RANGE = 25

const labDistance = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) => {
  const [l1, a1, b1] = rgbToLab(a)
  const [l2, a2, b2] = rgbToLab(b)
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2)
}

/**
 * عتبات الحياد — أوسع مما يبدو عمدًا.
 *
 * الكحلي `#2C3340` تشبّعه ١٨٪ وهو محايد في كل خزانة، والجملي `#B79268` تشبّعه
 * ٢٩٪ وهو **ليس** محايدًا. فالعتبة وحدها لا تحسم، ولهذا تسبقها القائمة.
 */
const NEUTRAL_SATURATION = 0.16
const NEAR_BLACK = 0.14
const NEAR_WHITE = 0.9

/** أقصر مسافة بين زاويتين على دائرة — ٣٥٠ و١٠ متجاورتان لا متباعدتان. */
export const hueDistance = (a: number, b: number): number => {
  const raw = Math.abs(a - b) % 360
  return raw > 180 ? 360 - raw : raw
}

/** RGB إلى HSL — الزاوية والتشبّع والسطوع. */
export function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }): {
  hue: number
  saturation: number
  lightness: number
} {
  const red = r / 255
  const green = g / 255
  const blue = b / 255

  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  const lightness = (max + min) / 2

  if (delta === 0) return { hue: 0, saturation: 0, lightness }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1))

  let hue: number
  if (max === red) hue = ((green - blue) / delta) % 6
  else if (max === green) hue = (blue - red) / delta + 2
  else hue = (red - green) / delta + 4

  hue = hue * 60
  if (hue < 0) hue += 360

  return { hue, saturation: Math.min(1, saturation), lightness }
}

/**
 * حرارة اللون — بالأقرب من القطبين لا بحدود قاطعة.
 *
 * التقسيم بمجالات ثابتة («٠–٦٠ دافئ») يجعل درجتين متجاورتين على طرفي الحدّ
 * تُصنَّفان متضادتين، وهما بالعين لونٌ واحد تقريبًا. والقياس بالمسافة يتدرّج.
 */
function temperatureOf(hue: number, neutral: boolean): ColorTemperature {
  if (neutral) return 'neutral'
  return hueDistance(hue, WARM_POLE) <= hueDistance(hue, COOL_POLE) ? 'warm' : 'cool'
}

/** يقرأ اللون كاملاً من `hex` واحد. */
export function readColor(hex: string): ColorProfile {
  const rgb = hexToRgb(hex)
  const { hue, saturation, lightness } = rgbToHsl(rgb)
  const nearest = nearestItemColor(rgb, ITEM_COLORS)
  const family = nearest.name

  /*
    الاسم يُصدَّق **إن كان قريبًا**، لا لمجرّد أنه الأقرب.

    `nearestItemColor` ترجّع أقرب لون مهما بَعُد، ولوحتنا ستّة عشر لونًا هادئًا
    بلا سماوي ولا فوشي. فالسماوي الفاقع أقربُ ما له فيها «أبيض» — ولو ورث
    حياده لصار لونٌ مشبَع تمامًا محايدًا، وهو نقيض ما تراه العين.

    فالحياد المنسّق يُورَث في نطاق التشابه وحده، وخارجه يحكم القياس.
  */
  const close = labDistance(rgb, hexToRgb(nearest.hex)) < NAME_TRUST_RANGE

  const neutral =
    (close && NEUTRAL_COLOR_NAMES.includes(family)) ||
    saturation < NEUTRAL_SATURATION ||
    lightness < NEAR_BLACK ||
    lightness > NEAR_WHITE

  return {
    hex,
    hue,
    saturation,
    lightness,
    family,
    temperature: temperatureOf(hue, neutral),
    neutral,
  }
}
