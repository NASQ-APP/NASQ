/**
 * مزوّد الطقس الافتراضي: Open-Meteo.
 *
 * **بلا مفتاح** — الخدمة مفتوحة للاستخدام غير التجاري بلا تسجيل، فما فيه سرّ
 * ينزل المتصفح ولا نداء يمرّ بالخادم بلا داعٍ. المُرسَل إحداثيات مدينة مختارة
 * من قائمة، ما فيه أي بيانات شخصية ولا موقع فعلي للمستخدمة.
 *
 * لو استُبدل بمزوّد يطلب مفتاحًا: يُكتب مزوّد `backend` جديد ويعيش المفتاح في
 * بيئة دالة الحافة، بلا لمس أي مكوّن واجهة.
 */
import { conditionFromCode } from '@/domain/weather'
import { WeatherError } from '@/domain/weather'
import type { City, WeatherNow, WeatherProvider } from '@/domain/weather'

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast'

const FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'weather_code',
  'wind_speed_10m',
].join(',')

type Payload = {
  current?: {
    time?: string
    temperature_2m?: number
    apparent_temperature?: number
    relative_humidity_2m?: number
    weather_code?: number
    wind_speed_10m?: number
  }
  daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[] }
}

const number = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

export const openMeteoProvider: WeatherProvider = {
  id: 'open-meteo',

  async current(city: City, signal?: AbortSignal): Promise<WeatherNow> {
    const url = new URL(ENDPOINT)
    url.searchParams.set('latitude', String(city.latitude))
    url.searchParams.set('longitude', String(city.longitude))
    url.searchParams.set('current', FIELDS)
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min')
    url.searchParams.set('forecast_days', '1')
    url.searchParams.set('timezone', 'auto')

    let response: Response
    try {
      response = await fetch(url, { signal })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new WeatherError('cancelled')
      }
      throw new WeatherError('network')
    }

    if (!response.ok) throw new WeatherError('unavailable')

    const payload = (await response.json()) as Payload
    const current = payload.current
    if (!current || typeof current.temperature_2m !== 'number') {
      throw new WeatherError('unavailable')
    }

    const temperature = number(current.temperature_2m)

    return {
      cityId: city.id,
      temperature,
      feelsLike: number(current.apparent_temperature, temperature),
      high: number(payload.daily?.temperature_2m_max?.[0], temperature),
      low: number(payload.daily?.temperature_2m_min?.[0], temperature),
      humidity: number(current.relative_humidity_2m),
      windSpeed: number(current.wind_speed_10m),
      condition: conditionFromCode(number(current.weather_code)),
      observedAt: current.time ?? new Date().toISOString(),
    }
  },
}
