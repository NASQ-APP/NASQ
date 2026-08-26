/** أنواع مخطط السفر. قائمة الشنطة **مشتقة** من قطع الأيام، ما تُكتب يدويًا (T-04). */

export type TripDay = {
  day: number
  label: string
  itemIds: string[]
}

export type Trip = {
  id: string
  city: string
  cityLatin: string
  from: string
  to: string
  days: TripDay[]
  packed: string[]
  createdAt: string
}

/** تسميات افتراضية لأيام الرحلة (T-05). */
export const DAY_LABELS = ['المطار', 'جولة المدينة', 'عشاء', 'متاحف', 'تسوّق', 'لقاء', 'العودة']

/** كل قطعة مميّزة استُخدمت في الرحلة — هذي **هي** قائمة الشنطة. */
export const packingList = (trip: Trip): string[] => [
  ...new Set(trip.days.flatMap((day) => day.itemIds)),
]
