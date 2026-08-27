/**
 * رحلة واحدة: أيامها وقائمة شنطتها.
 *
 * الصفحة تفتح على حالة الرحلة — أيام مخطّطة وقطع محزومة — لأن السؤال الأول
 * عند فتح رحلة هو «وش ناقص؟» مو «وش خطّطت؟». والأيام بطاقات مستقلة لأن كل
 * يوم وحدة تخطيط قائمة بذاتها.
 *
 * قائمة الشنطة **مشتقّة** من الأيام، ما تُكتب يدويًا (T-04).
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Sparkles, Trash2 } from 'lucide-react'
import {
  Button,
  ButtonLink,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  ProgressLine,
  SectionHeader,
  toast,
} from '@/shared/components/ui'
import { PageContainer } from '@/shared/components/layout'
import { DayCard, PackingList } from '@/features/travel/components'
import { ItemPicker } from '@/features/studio/components/ItemPicker'
import { useStudio } from '@/features/studio/store'
import { useTravel } from '@/features/travel/store'
import { useWardrobe } from '@/features/wardrobe/store'
import { suggest } from '@/features/stylist/suggest'
import { tripProgress } from '@/domain/travel'
import { ROUTES } from '@/shared/config'

export function TripPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { trips, setDayItems, setDayLabel, togglePacked, deleteTrip } = useTravel()
  const items = useWardrobe((state) => state.items)
  const studio = useStudio()

  const [editingDay, setEditingDay] = useState<number>()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const trip = trips.find((candidate) => candidate.id === id)

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

  const progress = tripProgress(trip)
  const pieces = (itemIds: string[]) =>
    itemIds
      .map((itemId) => items.find((item) => item.id === itemId))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))

  /** يعبّي كل يوم فاضي بإطلالة من الخزانة (T-03) */
  const autoFill = () => {
    let filled = 0
    trip.days.forEach((day, index) => {
      if (day.itemIds.length > 0) return
      const answer = suggest('نسّقي لي إطلالة للسفر', items)
      const look = answer.looks[index % Math.max(1, answer.looks.length)]
      if (look?.itemIds.length) {
        setDayItems(trip.id, day.day, look.itemIds)
        filled += 1
      }
    })
    toast.ok(filled > 0 ? `جهّزنا ${filled} من الأيام من خزانتك` : 'ما قدرنا نجهّز — خزانتك فاضية')
  }

  /** اليوم قيد التعديل يستعير اختيار الاستوديو ثم يرجّعه */
  const openDayPicker = (day: number) => {
    studio.replaceAll(trip.days.find((candidate) => candidate.day === day)?.itemIds ?? [])
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
        <Link to="/travel" className="transition-colors hover:text-ink">
          Travel
        </Link>
        <ChevronLeft size={12} aria-hidden />
        <span>{trip.cityLatin}</span>
      </nav>

      <PageHeader
        eyebrow={trip.cityLatin}
        title={trip.city}
        description={`${trip.from} — ${trip.to} · ${trip.days.length} أيام`}
        action={
          <div className="flex gap-2">
            {progress.emptyDays.length > 0 && (
              <Button variant="secondary" onClick={autoFill}>
                <Sparkles size={14} strokeWidth={1.5} aria-hidden />
                جهّزي {progress.emptyDays.length} أيام
              </Button>
            )}
            <Button
              variant="danger"
              aria-label="حذف الرحلة"
              title="حذف الرحلة"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={14} strokeWidth={1.5} aria-hidden />
            </Button>
          </div>
        }
      />

      {/* ---------------- حالة الرحلة ---------------- */}
      <div className="mb-14 grid gap-6 border-y border-line py-6 sm:grid-cols-2 lg:max-w-[560px]">
        <ProgressLine
          label="أيام مخطّطة"
          value={progress.planned}
          note={`${progress.plannedDays}/${progress.totalDays}`}
        />
        <ProgressLine
          label="محزوم في الشنطة"
          value={progress.packed}
          note={`${progress.packedPieces}/${progress.pieces}`}
        />
      </div>

      {/* ---------------- الأيام ---------------- */}
      <SectionHeader eyebrow="Daily looks" title="إطلالات الأيام" />
      <div className="mb-16 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {trip.days.map((day) => (
          <DayCard
            key={day.day}
            day={day}
            items={pieces(day.itemIds)}
            onEdit={() => openDayPicker(day.day)}
            onRename={(label) => setDayLabel(trip.id, day.day, label)}
            onClear={() => setDayItems(trip.id, day.day, [])}
            onPreview={() => {
              studio.replaceAll(day.itemIds)
              navigate(ROUTES.studio)
            }}
          />
        ))}
      </div>

      {/* ---------------- الشنطة ---------------- */}
      <SectionHeader
        eyebrow="Packing list"
        title="قائمة الشنطة"
        action={<span className="lat text-[11px] text-faint">{progress.pieces} pieces</span>}
      />
      <PackingList
        trip={trip}
        wardrobe={items}
        progress={progress}
        onToggle={(itemId) => togglePacked(trip.id, itemId)}
      />

      <ItemPicker open={editingDay != null} onClose={closeDayPicker} />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteTrip(trip.id)
          navigate('/travel')
          toast.ok('حذفنا الرحلة')
        }}
        eyebrow="Delete"
        title="حذف الرحلة؟"
        confirmLabel="حذف الرحلة"
      >
        {`تنحذف «${trip.city}» بأيامها وقائمة شنطتها. قطع خزانتك ما تتأثر.`}
      </ConfirmDialog>
    </PageContainer>
  )
}
