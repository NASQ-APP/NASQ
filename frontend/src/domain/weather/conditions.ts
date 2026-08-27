/**
 * ترجمة أكواد WMO إلى أحوال يفهمها التطبيق.
 *
 * المعيار فيه ٢٨ كودًا، والفرق بين «رذاذ خفيف» و«رذاذ كثيف» ما يغيّر اختيار
 * الجاكيت — فنطويها إلى ثمانية أحوال، وكل حال له تسمية عربية وحدة.
 */
import type { WeatherCondition } from './types'

/** أدنى كود لكل حال، تنازليًا — أول مدى ينطبق يفوز. */
const RANGES: { from: number; condition: WeatherCondition }[] = [
  { from: 95, condition: 'thunder' },
  { from: 85, condition: 'snow' },
  { from: 80, condition: 'rain' },
  { from: 71, condition: 'snow' },
  { from: 61, condition: 'rain' },
  { from: 56, condition: 'drizzle' },
  { from: 51, condition: 'drizzle' },
  { from: 45, condition: 'fog' },
  { from: 3, condition: 'overcast' },
  { from: 1, condition: 'cloudy' },
  { from: 0, condition: 'clear' },
]

export function conditionFromCode(code: number): WeatherCondition {
  return RANGES.find((range) => code >= range.from)?.condition ?? 'clear'
}

export const CONDITION_LABEL: Record<WeatherCondition, string> = {
  clear: 'صحو',
  cloudy: 'غيوم متفرّقة',
  overcast: 'غائم',
  fog: 'ضباب',
  drizzle: 'رذاذ',
  rain: 'مطر',
  snow: 'ثلج',
  thunder: 'عواصف رعدية',
}

/** الأحوال التي تستدعي وقاية — يقرأها المنسّق قبل ما يقترح. */
export const isWet = (condition: WeatherCondition): boolean =>
  condition === 'drizzle' || condition === 'rain' || condition === 'thunder'
