import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plane, Plus } from 'lucide-react'
import { Button, Field, TextInput, Modal, PageHeader, EmptyState, toast } from '@/shared/components/ui'
import { PageContainer } from '@/shared/components/layout'
import { useTravel } from '@/features/travel/store'
import { packingList } from '@/domain/travel'
import { clamp } from '@/shared/lib'

export function TravelPage() {
  const { trips, createTrip } = useTravel()
  const [open, setOpen] = useState(false)
  const [city, setCity] = useState('')
  const [latin, setLatin] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [dayCount, setDayCount] = useState(5)

  const create = () => {
    if (!city.trim()) {
      toast.error('اكتبي الوجهة')
      return
    }
    createTrip({
      city: city.trim(),
      cityLatin: latin.trim() || city.trim(),
      from: from.trim() || '—',
      to: to.trim() || '—',
      dayCount: clamp(dayCount, 1, 14),
    })
    setOpen(false)
    setCity('')
    setLatin('')
    toast.ok('أنشأنا الرحلة — وزّعي إطلالات الأيام')
  }

  return (
    <PageContainer width="content">
      <PageHeader
        eyebrow="Travel"
        title="خزانة السفر"
        description="خطّطي إطلالة كل يوم من خزائنك، وقائمة الشنطة تتولّد لحالها."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={14} strokeWidth={1.6} />
            رحلة جديدة
          </Button>
        }
      />

      {trips.length === 0 ? (
        <EmptyState
          title="ما فيه رحلات بعد."
          body="أنشئي رحلة، ووزّعي قطع خزانتك على أيامها."
          icon={<Plane size={22} strokeWidth={1.2} />}
          action={<Button onClick={() => setOpen(true)}>رحلة جديدة</Button>}
        />
      ) : (
        <div className="flex flex-col gap-5">
          {trips.map((trip) => {
            const packed = packingList(trip)
            return (
              <Link
                key={trip.id}
                to={`/travel/${trip.id}`}
                className="overflow-hidden rounded-md border border-line transition-colors hover:border-line-strong"
              >
                <div className="flex flex-wrap items-start justify-between gap-5 p-6">
                  <div>
                    <p className="lat text-[10px] text-faint">{trip.days.length} days</p>
                    <h2 className="lat mt-2 text-[20px] tracking-[0.16em]">{trip.cityLatin}</h2>
                    <p className="mt-1 text-[13px] text-muted">
                      {trip.city} · {trip.from} — {trip.to}
                    </p>
                  </div>
                  <span className="lat text-[11px] text-faint">{packed.length} pieces</span>
                </div>
                <div className="flex border-t border-line">
                  {trip.days.slice(0, 7).map((d) => (
                    <div key={d.day} className="flex-1 border-l border-line px-3 py-3 text-center last:border-l-0">
                      <p className="lat text-[9px] tracking-[0.2em] text-faint">Day {d.day}</p>
                      <p className="mt-0.5 text-[12px]">{d.label}</p>
                    </div>
                  ))}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="New trip"
        title="رحلة جديدة"
        width="sm"
        footer={
          <div className="flex gap-3">
            <Button onClick={create}>إنشاء الرحلة</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الوجهة">
              <TextInput autoFocus value={city} onChange={(e) => setCity(e.target.value)} placeholder="لندن" />
            </Field>
            <Field label="Latin">
              <TextInput value={latin} onChange={(e) => setLatin(e.target.value)} placeholder="London" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="من">
              <TextInput value={from} onChange={(e) => setFrom(e.target.value)} placeholder="12 ديسمبر" />
            </Field>
            <Field label="إلى">
              <TextInput value={to} onChange={(e) => setTo(e.target.value)} placeholder="18 ديسمبر" />
            </Field>
          </div>
          <Field label="عدد الأيام">
            <TextInput
              type="number"
              min={1}
              max={14}
              value={dayCount}
              onChange={(e) => setDayCount(Number(e.target.value))}
            />
          </Field>
        </div>
      </Modal>
    </PageContainer>
  )
}
