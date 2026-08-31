import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, Shield, Trash2 } from 'lucide-react'
import {
  Button,
  ConfirmDialog,
  Field,
  PageHeader,
  TextInput,
  toast,
} from '@/shared/components/ui'
import { PageContainer } from '@/shared/components/layout'
import { useWardrobe } from '@/features/wardrobe/store'
import { useLooks } from '@/features/looks/store'
import { useTravel } from '@/features/travel/store'
import { useAiModels } from '@/features/ai-model/store'
import { useAuth, syncsAcrossDevices } from '@/features/auth/store'

export function SettingsPage() {
  const { wardrobes, items, clearItems, clearAll } = useWardrobe()
  const looks = useLooks((s) => s.looks)
  const trips = useTravel((s) => s.trips)
  const { models, photo, clearPhoto } = useAiModels()
  const user = useAuth((state) => state.user)
  const busy = useAuth((state) => state.busy)
  const signOut = useAuth((state) => state.signOut)
  const updateName = useAuth((state) => state.updateName)
  const [confirm, setConfirm] = useState<'items' | 'all'>()

  // الحقل مسوّدة محلية: الكتابة ما تلمس الجلسة إلا بعد «حفظ» — وإلا صار كل
  // حرف طلبَ خادم. والبداية من اسم الجلسة تكفي: `RequireAuth` ما يعرض هذي
  // الصفحة إلا وفيه مستخدمة، والخروج يفكّها من الشجرة.
  const [name, setName] = useState(user?.name ?? '')

  const joined = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('ar-SA-u-nu-latn', {
        year: 'numeric',
        month: 'long',
      })
    : undefined

  const saveName = async () => {
    const clean = name.trim()
    if (!clean) return toast.error('الاسم ما ينفع يكون فاضيًا.')
    if (clean === user?.name) return toast.ok('ما فيه تغيير.')
    const error = await updateName(clean)
    if (error) return toast.error(error.message)
    toast.ok('حدّثنا اسمك')
  }

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
        <p className="eyebrow mb-4">حسابك</p>
        <div className="flex flex-col gap-4">
          <Field label="الاسم" hint="هو اللي يناديك فيه دولابك في الصفحة الرئيسية">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="البريد الإلكتروني" hint="بريد دخولك — ما يتغيّر من هنا">
            <TextInput dir="ltr" value={user?.email ?? ''} readOnly disabled />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={saveName} disabled={busy}>
              {busy ? 'نحفظ…' : 'حفظ'}
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                await signOut()
                toast.ok('سجّلنا خروجك')
              }}
            >
              <LogOut size={13} strokeWidth={1.5} />
              خروج
            </Button>
          </div>
          <p className="text-[12px] text-muted">
            {joined && <>عضوة منذ {joined} · </>}
            {syncsAcrossDevices
              ? 'حسابك على الخادم — بياناتك تتبعك على أي جهاز تدخلين منه.'
              : 'ملف على هذا الجهاز فقط — ما يزامن بين الأجهزة.'}
          </p>
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
            title="حذف كل القطع"
            note="يحذف قطعك كلها ويبقي خزائنك فاضية بأسمائها."
            action={
              <Button variant="secondary" size="sm" onClick={() => setConfirm('items')}>
                <Trash2 size={13} strokeWidth={1.5} />
                حذف القطع
              </Button>
            }
          />
          <Row
            title="تصفير الخزانة"
            note="يحذف القطع والخزائن معًا — ترجعين لصفحة بيضاء."
            action={
              <Button variant="danger" size="sm" onClick={() => setConfirm('all')}>
                <Trash2 size={13} strokeWidth={1.5} />
                تصفير
              </Button>
            }
          />
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(undefined)}
        onConfirm={() => {
          if (confirm === 'items') {
            clearItems()
            toast.ok('حذفنا كل القطع')
          } else {
            clearAll()
            toast.ok('صفّرنا الخزانة')
          }
          setConfirm(undefined)
        }}
        eyebrow="Confirm"
        title={confirm === 'items' ? 'حذف كل القطع؟' : 'تصفير الخزانة؟'}
      >
        {confirm === 'items'
          ? 'راح تنحذف كل القطع من كل الخزائن، وتبقى الخزائن بأسمائها. إطلالاتك المحفوظة تبقى بس بتفقد قطعها.'
          : 'راح تنحذف القطع والخزائن كلها. ما فيه رجعة.'}
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
