/**
 * عقود الطقس.
 *
 * التطبيق يتكلم مع `WeatherProvider` ولا يعرف مصدر البيانات — نفس نمط
 * التجربة الافتراضية وإزالة الخلفية. تبديل المزوّد متغيّر بيئة واحد.
 */

/** مدينة بإحداثياتها — القراءة تحتاج إحداثيات لا اسمًا. */
export type City = {
  id: string
  name: string
  nameLatin: string
  latitude: number
  longitude: number
}

/**
 * حالة الجو مبسّطة لِما يهمّ اللبس.
 * أكواد WMO الأربعة والعشرون تُطوى إلى ثمانية أحوال — الفرق بين «رذاذ خفيف»
 * و«رذاذ متوسط» ما يغيّر اختيار الجاكيت.
 */
export type WeatherCondition =
  | 'clear'
  | 'cloudy'
  | 'overcast'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'thunder'

export type WeatherNow = {
  cityId: string
  /** بالدرجة المئوية */
  temperature: number
  feelsLike: number
  high: number
  low: number
  /** نسبة مئوية */
  humidity: number
  /** كم/س */
  windSpeed: number
  condition: WeatherCondition
  /** وقت القراءة — ISO */
  observedAt: string
}

export interface WeatherProvider {
  readonly id: string
  current(city: City, signal?: AbortSignal): Promise<WeatherNow>
}

/** أخطاء الطقس برسائل بشرية — الواجهة ما تركّب نصوصًا بنفسها. */
export type WeatherErrorCode = 'network' | 'unavailable' | 'cancelled'

export class WeatherError extends Error {
  code: WeatherErrorCode

  constructor(code: WeatherErrorCode) {
    super(WEATHER_ERROR_MESSAGE[code])
    this.name = 'WeatherError'
    this.code = code
  }
}

export const WEATHER_ERROR_MESSAGE: Record<WeatherErrorCode, string> = {
  network: 'ما وصلنا لخدمة الطقس — تحقّقي من الاتصال.',
  unavailable: 'خدمة الطقس مو متاحة الحين.',
  cancelled: 'أُلغي طلب الطقس.',
}
