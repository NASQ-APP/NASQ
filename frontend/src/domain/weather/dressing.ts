/**
 * ما الذي يعنيه الطقس للّبس.
 *
 * هذي **الوصلة** التي سيقرأها المنسّق لاحقًا: بدل ما يستقبل «٣٧ درجة» يستقبل
 * جملًا يفهمها البشر والنموذج معًا («حار — أخفّ الأقمشة»). وضعها في المجال
 * يعني أن الواجهة والمنسّق يقرآن القاعدة نفسها، فما يتناقضان.
 *
 * الحدود مضبوطة على مناخ الخليج: ٣٠ درجة هنا «حار» مو «صيف لطيف».
 */
import { CONDITION_LABEL, isWet } from './conditions'
import type { WeatherNow } from './types'

export type TemperatureBand = 'cold' | 'cool' | 'mild' | 'warm' | 'hot'

const BANDS: { min: number; band: TemperatureBand; headline: string }[] = [
  { min: 38, band: 'hot', headline: 'حر شديد — أخفّ الأقمشة وأفتح الألوان' },
  { min: 30, band: 'warm', headline: 'حار — قطن وكتان وقصّات واسعة' },
  { min: 22, band: 'mild', headline: 'معتدل — طبقة وحدة تكفي' },
  { min: 15, band: 'cool', headline: 'مائل للبرودة — خذي طبقة خفيفة' },
  { min: -50, band: 'cold', headline: 'بارد — معطف وطبقات' },
]

export const temperatureBand = (celsius: number): TemperatureBand =>
  BANDS.find((entry) => celsius >= entry.min)?.band ?? 'mild'

export type DressingBrief = {
  band: TemperatureBand
  /** سطر واحد يصلح للعرض في الواجهة وللإرسال للنموذج */
  headline: string
  /** ملاحظات إضافية من الرطوبة والرياح والحالة */
  notes: string[]
}

/**
 * ملخّص جاهز للعرض وللنموذج. الملاحظات مرتّبة بأهميتها: ما يبلّل أولًا، ثم
 * ما يلتصق بالجسم، ثم ما يطيّر الشعر والتنانير.
 */
export function dressingBrief(now: WeatherNow): DressingBrief {
  const entry = BANDS.find((candidate) => now.temperature >= candidate.min) ?? BANDS[2]
  const notes: string[] = []

  if (isWet(now.condition)) notes.push(`${CONDITION_LABEL[now.condition]} — خذي طبقة تصدّ الماء`)
  if (now.condition === 'fog') notes.push('ضباب — الرؤية أقل والجو أرطب')
  if (now.humidity >= 65 && now.temperature >= 25) notes.push('رطوبة عالية — تجنّبي الأقمشة اللاصقة')
  if (now.windSpeed >= 25) notes.push('رياح قوية — القصّات الطويلة تتطاير')
  if (now.high - now.low >= 12) notes.push('الفرق بين الليل والنهار كبير — طبقة تُخلع')

  return { band: entry.band, headline: entry.headline, notes }
}

/**
 * سطر واحد يوصف الجو كاملًا — هذا ما يُحقن في سؤال المنسّق لاحقًا، فيبقى
 * بناء النص في مكان واحد بدل ما يُركَّب في كل نداء.
 */
export const weatherSentence = (now: WeatherNow, cityName: string): string => {
  const brief = dressingBrief(now)
  const parts = [
    `الجو في ${cityName}: ${CONDITION_LABEL[now.condition]}`,
    `${Math.round(now.temperature)}° (الإحساس ${Math.round(now.feelsLike)}°)`,
    `الصغرى ${Math.round(now.low)}° والعظمى ${Math.round(now.high)}°`,
    brief.headline,
  ]
  return [...parts, ...brief.notes].join('. ') + '.'
}
