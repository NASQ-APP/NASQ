import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Sparkles, Trash2 } from 'lucide-react'
import {
  Button,
  ButtonLink,
  CheckRow,
  EmptyState,
  PageHeader,
  SectionHeader,
  toast,
} from '@/shared/components/ui'
import { PageContainer } from '@/shared/components/layout'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { ItemPicker } from '@/features/studio/components/ItemPicker'
import { useStudio } from '@/features/studio/store'
import { useTravel } from '@/features/travel/store'
import { packingList } from '@/domain/travel'
import { useWardrobe } from '@/features/wardrobe/store'
import { suggest } from '@/features/stylist/suggest'
import { cn } from '@/shared/lib'

export function TripPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { trips, setDayItems, togglePacked, deleteTrip } = useTravel()
  const items = useWardrobe((s) => s.items)
  const studio = useStudio()
  const [editingDay, setEditingDay] = useState<number>()

  const trip = trips.find((t) => t.id === id)

  if (!trip) {
    return (
      <PageContainer width="narrow" className="py-20">
        <EmptyState
          title="الرحلة غير موجودة."
          action={<ButtonLink to="/travel">رحلاتي</ButtonLink>}
        />
      </PageContainer>
    )
  }

  const packed = packingList(trip)

  /** يعبّي كل يوم فاضي بإطلالة من الخزانة (T-03) */
  const autoFill = () => {
    let filled = 0
    trip.days.forEach((day, index) => {
      if (day.itemIds.length) return
      const answer = suggest('نسّقي لي إطلالة للسفر', items)
      const look = answer.looks[index % Math.max(1, answer.looks.length)]
      if (look?.itemIds.length) {
        setDayItems(trip.id, day.day, look.itemIds)
        filled += 1
      }
    })
    toast.ok(filled ? `جهّزنا ${filled} أيام من خزانتك` : 'كل الأيام معبّاة')
  }

  /** اليوم قيد التعديل يستعير اختيار الاستوديو ثم يرجّعه */
  const openDayPicker = (day: number) => {
    const target = trip.days.find((d) => d.day === day)
    studio.replaceAll(target?.itemIds ?? [])
    setEditingDay(day)
  }

  const closeDayPicker = () => {
    if (editingDay != null) {
      setDayItems(trip.id, editingDay, studio.selection)
      toast.ok(`حدّثنا إطلالة اليوم ${editingDay}`)
    }
    setEditingDay(undefined)
  }

  return (
    <PageContainer width="content">
      <nav className="lat mb-6 flex items-center gap-2 text-[10px] text-faint">
        <Link to="/travel" className="hover:text-ink">
          Travel
        </Link>
        <ChevronLeft size={12} />
        <span>{trip.cityLatin}</span>
      </nav>

      <PageHeader
        eyebrow={trip.cityLatin}
        title={trip.city}
        description={`${trip.from} — ${trip.to} · ${trip.days.length} أيام`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={autoFill}>
              <Sparkles size={14} strokeWidth={1.5} />
              جهّزي الأيام
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                deleteTrip(trip.id)
                navigate('/travel')
                toast.ok('حذفنا الرحلة')
              }}
            >
              <Trash2 size={14} strokeWidth={1.5} />
            </Button>
          </div>
        }
      />

      <SectionHeader eyebrow="Daily looks" title="إطلالات الأيام" />
      <div className="mb-16 flex flex-col">
        {trip.days.map((day) => (
          <div
            key={day.day}
            className="grid items-center gap-5 border-b border-line py-5 sm:grid-cols-[120px_1fr_auto]"
          >
            <div>
              <p className="lat text-[9.5px] tracking-[0.22em] text-faint">
                Day {String(day.day).padStart(2, '0')}
              </p>
              <p className="mt-1 text-[14px]">{day.label}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {day.itemIds.length === 0 ? (
                <span className="text-[12.5px] text-faint">ما فيه إطلالة لهذا اليوم.</span>
              ) : (
                day.itemIds.map((itemId) => {
                  const item = items.find((i) => i.id === itemId)
                  return item ? (
                    <ItemImage
                      key={itemId}
                      item={item}
                      className="h-[54px] w-[44px] rounded bg-surface p-1"
                    />
                  ) : null
                })
              )}
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => openDayPicker(day.day)}>
                تعديل
              </Button>
              {day.itemIds.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    studio.replaceAll(day.itemIds)
                    navigate('/studio')
                  }}
                >
                  اعرضيها
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <SectionHeader
        eyebrow="Packing list"
        title="قائمة الشنطة"
        action={<span className="lat text-[11px] text-faint">{packed.length} pieces</span>}
      />
      {packed.length === 0 ? (
        <p className="text-[13px] text-muted">القائمة تتولّد من إطلالات الأيام — جهّزي الأيام أول.</p>
      ) : (
        <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          {packed.map((itemId) => {
            const item = items.find((i) => i.id === itemId)
            if (!item) return null
            const isPacked = trip.packed.includes(itemId)
            return (
              <li key={itemId} className="border-b border-line">
                <CheckRow checked={isPacked} onChange={() => togglePacked(trip.id, itemId)}>
                  <span className={cn(isPacked && 'line-through')}>{item.name}</span>
                </CheckRow>
              </li>
            )
          })}
        </ul>
      )}

      <ItemPicker open={editingDay != null} onClose={closeDayPicker} />
    </PageContainer>
  )
}
