/**
 * بطاقة رحلة في قائمة السفر.
 *
 * البطاقة تجاوب على سؤال واحد: **وين وصلت في هذي الرحلة؟** فتعرض نسبة الأيام
 * المخطّطة ونقاط الأيام وقطعًا من الشنطة، بدل ما تكرّر الاسم والتاريخ فقط.
 *
 * نقاط الأيام تتوسّع لأي عدد بلا قصّ — القائمة القديمة كانت تخفي ما بعد اليوم
 * السابع بصمت.
 */
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { ProgressLine } from '@/shared/components/ui'
import { packingList, tripProgress } from '@/domain/travel'
import { cn } from '@/shared/lib'
import type { Trip } from '@/domain/travel'
import type { WardrobeItem } from '@/domain/wardrobe'

const THUMBS = 6

export function TripCard({ trip, wardrobe }: { trip: Trip; wardrobe: WardrobeItem[] }) {
  const progress = tripProgress(trip)
  const pieces = packingList(trip)
    .map((id) => wardrobe.find((item) => item.id === id))
    .filter((item): item is WardrobeItem => Boolean(item))

  return (
    <Link
      to={`/travel/${trip.id}`}
      className="lift flex flex-col gap-5 rounded-md border border-line p-6 transition-colors hover:border-line-strong"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="lat text-[9.5px] tracking-[0.22em] text-faint">
            {trip.days.length} DAYS
          </p>
          <h2 className="lat mt-2 truncate text-[20px] tracking-[0.16em]">{trip.cityLatin}</h2>
          <p className="mt-1.5 truncate text-[12.5px] text-muted">
            {trip.city} · {trip.from} — {trip.to}
          </p>
        </div>

        {progress.done && (
          <span className="flex flex-none items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[10.5px] text-muted">
            <Check size={11} strokeWidth={1.8} aria-hidden />
            جاهزة
          </span>
        )}
      </div>

      {/* قطع من الشنطة — لمحة بصرية، مو الجرد كامل */}
      {pieces.length > 0 && (
        <div className="flex items-center gap-1.5">
          {pieces.slice(0, THUMBS).map((item) => (
            <span
              key={item.id}
              className="grid h-9 w-9 flex-none place-items-center overflow-hidden rounded-sm bg-surface"
            >
              <ItemImage item={item} className="h-[78%] w-[78%]" />
            </span>
          ))}
          {pieces.length > THUMBS && (
            <span className="lat text-[10.5px] text-faint">+{pieces.length - THUMBS}</span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <ProgressLine
          label="أيام مخطّطة"
          value={progress.planned}
          note={`${progress.plannedDays}/${progress.totalDays}`}
        />

        {/* نقطة لكل يوم: ممتلئة = مخطّطة */}
        <ul className="flex flex-wrap gap-1.5">
          {trip.days.map((day) => (
            <li
              key={day.day}
              title={`اليوم ${day.day} — ${day.label}`}
              aria-label={`اليوم ${day.day}: ${day.itemIds.length > 0 ? day.label : 'بلا إطلالة'}`}
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                day.itemIds.length > 0 ? 'bg-ink' : 'border border-line-strong',
              )}
            />
          ))}
        </ul>
      </div>
    </Link>
  )
}
