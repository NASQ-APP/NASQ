/**
 * مخطط السفر: الرحلة قائمة أيام، وكل يوم إطلالة من خزانة المستخدمة نفسها.
 * قائمة الشنطة **مشتقة** من قطع الأيام، ما تُكتب يدويًا (T-04).
 *
 * تعيش على الخادم مثل الخزانة: كتابة متفائلة تمر على طابور، ولا نسخة محلية.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storageKey } from '@/infrastructure/storage'
import { hasBackend } from '@/shared/config'
import { uid, uuid } from '@/shared/lib'
import { toast } from '@/shared/components/ui'
import * as remote from '@/infrastructure/travel/repository'
import { DAY_LABELS } from '@/domain/travel'
import type { Trip } from '@/domain/travel'

type TravelState = {
  trips: Trip[]
  load: () => Promise<void>
  reset: () => void
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
    (set, get) => {
      let queue: Promise<void> = Promise.resolve()

      const push = (action: () => Promise<void>, whatFailed: string) => {
        if (!hasBackend()) return
        queue = queue.then(action).catch(() => {
          toast.error(`ما قدرنا نحفظ ${whatFailed} على الخادم — رجّعنا آخر نسخة محفوظة.`)
          return get().load()
        })
      }

      return {
        trips: [],

        load: async () => {
          if (!hasBackend()) return
          try {
            set({ trips: await remote.fetchTrips() })
          } catch {
            // القراءة فشلت: قائمة فاضية أصدق من رحلات مستخدمة قبلها
          }
        },

        reset: () => set({ trips: [] }),

        createTrip: ({ city, cityLatin, from, to, dayCount }) => {
          const trip: Trip = {
            id: hasBackend() ? uuid() : uid('trip'),
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
          push(() => remote.insertTrip(trip), 'الرحلة')
          return trip
        },

        deleteTrip: (id) => {
          set((s) => ({ trips: s.trips.filter((t) => t.id !== id) }))
          push(() => remote.deleteTrip(id), 'حذف الرحلة')
        },

        setDayItems: (tripId, day, itemIds) => {
          set((s) => ({
            trips: s.trips.map((t) =>
              t.id === tripId
                ? { ...t, days: t.days.map((d) => (d.day === day ? { ...d, itemIds } : d)) }
                : t,
            ),
          }))
          push(() => remote.setDayItems(tripId, day, itemIds), 'لبس اليوم')
        },

        setDayLabel: (tripId, day, label) => {
          set((s) => ({
            trips: s.trips.map((t) =>
              t.id === tripId
                ? { ...t, days: t.days.map((d) => (d.day === day ? { ...d, label } : d)) }
                : t,
            ),
          }))
          push(() => remote.setDayLabel(tripId, day, label), 'اسم اليوم')
        },

        togglePacked: (tripId, itemId) => {
          const packed = !get().byId(tripId)?.packed.includes(itemId)
          set((s) => ({
            trips: s.trips.map((t) =>
              t.id === tripId
                ? {
                    ...t,
                    packed: packed
                      ? [...t.packed, itemId]
                      : t.packed.filter((x) => x !== itemId),
                  }
                : t,
            ),
          }))
          push(() => remote.setPacked(tripId, itemId, packed), 'الشنطة')
        },

        byId: (id) => get().trips.find((t) => t.id === id),
      }
    },
    {
      name: storageKey('travel'),
      version: 1,
      partialize: (state) => (hasBackend() ? {} : { trips: state.trips }),
      migrate: (persisted, version) =>
        hasBackend() || version < 1 ? { trips: [] } : (persisted as TravelState),
    },
  ),
)
