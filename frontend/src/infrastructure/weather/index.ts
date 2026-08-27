/**
 * نقطة الدخول للطقس.
 *
 * التطبيق يستورد `weatherProvider` ولا شيء غيره:
 *
 *   VITE_WEATHER_PROVIDER=open-meteo | off
 *
 * `off` يوقف الميزة كليًا بلا حذف شيفرة — مفيد للعرض بلا إنترنت.
 */
import { env } from '@/shared/config'
import { openMeteoProvider } from './openMeteo'
import type { WeatherProvider } from '@/domain/weather'

const REGISTRY: Record<string, WeatherProvider | undefined> = {
  'open-meteo': openMeteoProvider,
  off: undefined,
}

export const weatherProvider: WeatherProvider | undefined =
  env.weatherProvider in REGISTRY ? REGISTRY[env.weatherProvider] : openMeteoProvider

export { openMeteoProvider } from './openMeteo'
