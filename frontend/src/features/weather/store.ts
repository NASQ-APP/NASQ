/**
 * مدينة الطقس المختارة.
 *
 * تفضيل واجهة لا بيانات خادم، فمكانه Zustand: القراءة نفسها تعيش في
 * TanStack Query (§19) — ما نخلط الاثنين.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_CITY_ID, cityById } from '@/domain/weather'
import { storageKey } from '@/infrastructure/storage'
import type { City } from '@/domain/weather'

type WeatherState = {
  cityId: string
  setCity: (id: string) => void
  city: () => City
}

export const useWeatherCity = create<WeatherState>()(
  persist(
    (set, get) => ({
      cityId: DEFAULT_CITY_ID,
      setCity: (cityId) => set({ cityId }),
      city: () => cityById(get().cityId),
    }),
    { name: storageKey('weather') },
  ),
)
