/**
 * خزانة السفر — قائمة الرحلات.
 *
 * كل بطاقة تقول أين وصلت الرحلة، لا اسمها وتاريخها فقط: نسبة الأيام المخطّطة،
 * ونقطة لكل يوم، ولمحة من قطع الشنطة. القطع كلها من خزانة المستخدمة (المبدأ ١).
 */
import { useState } from 'react'
import { Plane, Plus } from 'lucide-react'
import {
  Button,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  TextInput,
  toast,
} from '@/shared/components/ui'
import { PageContainer } from '@/shared/components/layout'
import { TripCard } from '@/features/travel/components'
import { useTravel } from '@/features/travel/store'
import { useWardrobe } from '@/features/wardrobe/store'
import { clamp } from '@/shared/lib'

const MIN_DAYS = 1
const MAX_DAYS = 14

export function TravelPage() {
  const { trips, createTrip } = useTravel()
  const wardrobe = useWardrobe((state) => state.items)

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
      dayCount: clamp(dayCount, MIN_DAYS, MAX_DAYS),
    })
    setOpen(false)
    setCity('')
    setLatin('')
    setFrom('')
    setTo('')
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
            <Plus size={14} strokeWidth={1.6} aria-hidden />
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
        <div className="grid gap-4 lg:grid-cols-2">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} wardrobe={wardrobe} />
          ))}
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
              <TextInput
                autoFocus
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="لندن"
              />
            </Field>
            <Field label="بالإنجليزية">
              <TextInput
                value={latin}
                onChange={(event) => setLatin(event.target.value)}
                placeholder="London"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="من">
              <TextInput
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                placeholder="١٢ ديسمبر"
              />
            </Field>
            <Field label="إلى">
              <TextInput
                value={to}
                onChange={(event) => setTo(event.target.value)}
                placeholder="١٨ ديسمبر"
              />
            </Field>
          </div>

          <Field label="عدد الأيام" hint="من يوم إلى أربعة عشر">
            <TextInput
              type="number"
              min={MIN_DAYS}
              max={MAX_DAYS}
              value={dayCount}
              onChange={(event) => setDayCount(Number(event.target.value))}
            />
          </Field>
        </div>
      </Modal>
    </PageContainer>
  )
}
