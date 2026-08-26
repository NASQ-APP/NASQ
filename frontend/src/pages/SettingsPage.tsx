import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RotateCcw, Shield, Trash2 } from 'lucide-react'
import { Button, ConfirmDialog, Field, PageHeader, TextInput, toast } from '@/shared/components/ui'
import { PageContainer } from '@/shared/components/layout'
import { useProfile } from '@/features/profile/store'
import { useWardrobe } from '@/features/wardrobe/store'
import { useLooks } from '@/features/looks/store'
import { useTravel } from '@/features/travel/store'
import { useAiModels } from '@/features/ai-model/store'

export function SettingsPage() {
  const profile = useProfile()
  const { wardrobes, items, resetToSeed, clearAll } = useWardrobe()
  const looks = useLooks((s) => s.looks)
  const trips = useTravel((s) => s.trips)
  const { models, photo, clearPhoto } = useAiModels()
  const [confirm, setConfirm] = useState<'reset' | 'clear'>()

  const stats = [
    { label: 'الخزائن', value: wardrobes.length },
    { label: 'القطع', value: items.filter((i) => i.source === 'wardrobe').length },
    { label: 'الإطلالات', value: looks.length },
    { label: 'الرحلات', value: trips.length },
    { label: 'الموديلات', value: models.length },
  ]

  return (
    <PageContainer width="prose">
      <PageHeader eyebrow="Settings" title="الإعدادات" />

      <div className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-md border border-line px-4 py-5">
            <p className="lat text-[22px] font-light">{s.value}</p>
            <p className="mt-1 text-[11.5px] text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="mb-12">
        <p className="eyebrow mb-4">بياناتك</p>
        <div className="flex flex-col gap-4">
          <Field label="الاسم">
            <TextInput
              value={profile.name}
              onChange={(e) => profile.setProfile({ name: e.target.value })}
            />
          </Field>
          <Field label="البريد الإلكتروني (اختياري)">
            <TextInput
              dir="ltr"
              value={profile.email}
              onChange={(e) => profile.setProfile({ email: e.target.value })}
              placeholder="name@example.com"
            />
          </Field>
          <Button className="self-start" onClick={() => toast.ok('حفظنا بياناتك')}>
            حفظ
          </Button>
        </div>
      </section>

      <section className="mb-12">
        <p className="eyebrow mb-4">صورتك</p>
        {photo ? (
          <div className="flex flex-wrap items-center gap-5 rounded-md border border-line p-5">
            <img
              src={photo.url}
              alt="صورتك"
              className="h-[110px] w-[88px] rounded-md border border-line object-cover"
            />
            <div className="flex-1">
              <p className="text-[12.5px] leading-7 text-muted">
                محفوظة داخل متصفحك فقط لهذي الجلسة — ما انرفعت لأي خادم.
              </p>
              <Button
                variant="danger"
                size="sm"
                className="mt-3"
                onClick={() => {
                  clearPhoto()
                  toast.ok('حذفنا صورتك')
                }}
              >
                <Trash2 size={13} strokeWidth={1.5} />
                حذف صورتي
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-muted">
            ما فيه صورة مرفوعة.{' '}
            <Link to="/studio" className="underline-offset-4 hover:underline">
              ارفعيها من الاستوديو
            </Link>
            .
          </p>
        )}
        <Link
          to="/privacy"
          className="mt-4 inline-flex items-center gap-2 text-[12.5px] text-muted hover:text-ink"
        >
          <Shield size={14} strokeWidth={1.4} />
          كيف نتعامل مع صورك
        </Link>
      </section>

      <section>
        <p className="eyebrow mb-4">بيانات التطبيق</p>
        <div className="flex flex-col divide-y divide-line border-y border-line">
          <Row
            title="إرجاع الخزانة التجريبية"
            note="يرجّع القطع والخزائن الأصلية اللي جت مع التطبيق."
            action={
              <Button variant="secondary" size="sm" onClick={() => setConfirm('reset')}>
                <RotateCcw size={13} strokeWidth={1.5} />
                إرجاع
              </Button>
            }
          />
          <Row
            title="تفريغ الخزانة"
            note="يحذف كل القطع ويخليك تبدئين بخزانتك أنتِ من الصفر."
            action={
              <Button variant="danger" size="sm" onClick={() => setConfirm('clear')}>
                <Trash2 size={13} strokeWidth={1.5} />
                تفريغ
              </Button>
            }
          />
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(undefined)}
        onConfirm={() => {
          if (confirm === 'reset') {
            resetToSeed()
            toast.ok('رجّعنا الخزانة التجريبية')
          } else {
            clearAll()
            toast.ok('فرّغنا الخزانة')
          }
          setConfirm(undefined)
        }}
        eyebrow="Confirm"
        title={confirm === 'reset' ? 'إرجاع الخزانة التجريبية؟' : 'تفريغ الخزانة؟'}
      >
        {confirm === 'reset'
          ? 'أي قطع أضفتيها بنفسك راح تنحذف وترجع النسخة الأصلية.'
          : 'راح تنحذف كل القطع من كل الخزائن. إطلالاتك المحفوظة تبقى، بس بتفقد قطعها.'}
      </ConfirmDialog>
    </PageContainer>
  )
}

function Row({
  title,
  note,
  action,
}: {
  title: string
  note: string
  action: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-5">
      <div>
        <p className="text-[13.5px]">{title}</p>
        <p className="mt-0.5 text-[12px] text-muted">{note}</p>
      </div>
      {action}
    </div>
  )
}
