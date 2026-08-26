/**
 * مخطط السفر: الرحلة قائمة أيام، وكل يوم إطلالة من خزانة المستخدمة نفسها.
 * قائمة الشنطة **مشتقة** من قطع الأيام، ما تُكتب يدويًا (T-04).
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storageKey } from '@/infrastructure/storage'
import { uid } from '@/shared/lib'
import { DAY_LABELS } from '@/domain/travel'
import type { Trip } from '@/domain/travel'

type TravelState = {
  trips: Trip[]
  createTrip: (input: {
    city: string
    cityLatin: string
    from: string
    to: string
    dayCount: number
  }) => Trip
  deleteTrip: (id: string) => void
  setDayItems: (tripId: string, day: number, itemIds: string[]) => void
  setDayLabel: (tripId: string, day: number, label: string) => void
  togglePacked: (tripId: string, itemId: string) => void
  byId: (id: string) => Trip | undefined
}

export const useTravel = create<TravelState>()(
  persist(
    (set, get) => ({
      trips: [],

      createTrip: ({ city, cityLatin, from, to, dayCount }) => {
        const trip: Trip = {
          id: uid('trip'),
          city,
          cityLatin,
          from,
          to,
          days: Array.from({ length: dayCount }, (_, i) => ({
            day: i + 1,
            label: DAY_LABELS[i % DAY_LABELS.length],
            itemIds: [],
          })),
          packed: [],
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ trips: [trip, ...s.trips] }))
        return trip
      },

      deleteTrip: (id) => set((s) => ({ trips: s.trips.filter((t) => t.id !== id) })),

      setDayItems: (tripId, day, itemIds) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId
              ? { ...t, days: t.days.map((d) => (d.day === day ? { ...d, itemIds } : d)) }
              : t,
          ),
        })),

      setDayLabel: (tripId, day, label) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId
              ? { ...t, days: t.days.map((d) => (d.day === day ? { ...d, label } : d)) }
              : t,
          ),
        })),

      togglePacked: (tripId, itemId) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === tripId
              ? {
                  ...t,
                  packed: t.packed.includes(itemId)
                    ? t.packed.filter((x) => x !== itemId)
                    : [...t.packed, itemId],
                }
              : t,
          ),
        })),

      byId: (id) => get().trips.find((t) => t.id === id),
    }),
    { name: storageKey('travel') },
  ),
)
