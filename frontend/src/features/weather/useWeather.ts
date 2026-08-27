/**
 * قراءة الطقس الحالي.
 *
 * حالة خادم خالصة، فمكانها TanStack Query: كاش لنصف ساعة لأن الجو ما يتغيّر
 * كل دقيقة، وإعادة محاولة وحدة، وبلا إعادة جلب عند العودة للنافذة.
 */
import { useQuery } from '@tanstack/react-query'
import { cityById, dressingBrief } from '@/domain/weather'
import { useWeatherCity } from './store'
import { weatherProvider } from '@/infrastructure/weather'
import type { City, DressingBrief, WeatherNow } from '@/domain/weather'

const HALF_HOUR = 30 * 60 * 1000

export type WeatherView = {
  city: City
  now?: WeatherNow
  brief?: DressingBrief
  loading: boolean
  error?: string
  /** الميزة مطفأة بمتغيّر بيئة */
  disabled: boolean
  refresh: () => void
}

export function useWeather(): WeatherView {
  const cityId = useWeatherCity((state) => state.cityId)
  const city = cityById(cityId)

  const query = useQuery({
    queryKey: ['weather', city.id],
    enabled: Boolean(weatherProvider),
    staleTime: HALF_HOUR,
    gcTime: HALF_HOUR * 2,
    retry: 1,
    queryFn: ({ signal }) => weatherProvider!.current(city, signal),
  })

  return {
    city,
    now: query.data,
    brief: query.data ? dressingBrief(query.data) : undefined,
    loading: query.isPending && Boolean(weatherProvider),
    error: query.error instanceof Error ? query.error.message : undefined,
    disabled: !weatherProvider,
    refresh: () => void query.refetch(),
  }
}
