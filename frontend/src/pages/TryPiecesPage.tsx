/**
 * قطع ما تملكينها بعد.
 *
 * هذا المكان الوحيد اللي يظهر فيه متجر خارجي — كـ**مصدر استيراد**، مو متجر.
 * ما فيه شي يُشترى هنا: القطعة تُسحب، تُجرّب على موديلك، وإما تنتقل لخزانتك
 * (لأنك اشتريتيها فعلاً) أو تنحذف (المبدأ ١ · I-02 · I-03).
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ExternalLink, Link2, Lock, Shield, Trash2, Wand2 } from 'lucide-react'
import { Button, Card, EmptyState, Modal, PageHeader, SectionHeader, toast } from '@/shared/components/ui'
import { PageContainer } from '@/shared/components/layout'
import { ItemGrid } from '@/features/wardrobe/components/ItemGrid'
import { useWardrobe } from '@/features/wardrobe/store'
import { useStudio } from '@/features/studio/store'
import { CATEGORIES, categoryById, ITEM_COLORS, shapesForSlot } from '@/domain/wardrobe'
import { IMPORT_SOURCES, sourceById } from '@/features/try-pieces/sources'
import { useImportSources } from '@/features/try-pieces/store'
import { cn } from '@/shared/lib'
import { ROUTES } from '@/shared/config'

const IMPORT_STEPS = ['فتح صفحة القطعة', 'سحب الصورة', 'إزالة الخلفية', 'تحديد الفئة واللون']

export function TryPiecesPage() {
  const navigate = useNavigate()
  const { items, addItem, deleteItem } = useWardrobe()
  const studio = useStudio()
  const { connected, connect, disconnect } = useImportSources()

  const [link, setLink] = useState('')
  const [importing, setImporting] = useState(false)
  const [step, setStep] = useState(0)
  const [authFor, setAuthFor] = useState<string>()
  const [authStep, setAuthStep] = useState(0)

  const tryItems = items.filter((i) => i.source === 'try')

  /* ---------------- الاستيراد بالرابط ---------------- */

  /** ينشئ قطعة التجربة من الرابط. القطعة تدخل «قطع للتجربة» دائمًا (I-02). */
  const completeImport = useCallback(() => {
    const host = link.toLowerCase()
    const store = IMPORT_SOURCES.find(
      (s) => host.includes(s.id) || host.includes(s.latin.toLowerCase()),
    )
    const category = CATEGORIES[Math.floor(Math.random() * 14)]
    const slot = categoryById(category.id)?.slot ?? 'top'
    const color = ITEM_COLORS[Math.floor(Math.random() * ITEM_COLORS.length)]

    const item = addItem({
      name: `قطعة من ${store?.name ?? 'رابط خارجي'}`,
      categoryId: category.id,
      shape: shapesForSlot(slot)[0].id,
      colorHex: color.hex,
      colorName: color.name,
      wardrobeId: null,
      source: 'try',
      storeId: store?.id,
      sourceLink: link,
    })

    setImporting(false)
    setStep(0)
    setLink('')
    studio.add(item.id)
    toast.ok('استوردناها — جرّبيها على موديلك')
    navigate(ROUTES.studio)
  }, [addItem, link, navigate, studio])

  // المؤقّت هو النظام الخارجي، وكل تغيير حالة يصير داخل ندائه
  useEffect(() => {
    if (!importing) return
    const timer = setTimeout(
      () => (step >= IMPORT_STEPS.length ? completeImport() : setStep((s) => s + 1)),
      480,
    )
    return () => clearTimeout(timer)
  }, [importing, step, completeImport])

  /* ---------------- account authorization ---------------- */
  useEffect(() => {
    if (!authFor) return
    if (authStep >= 3) {
      const timer = setTimeout(() => {
        connect(authFor)
        toast.ok(`ربطنا ${sourceById(authFor)?.name}`)
        setAuthFor(undefined)
        setAuthStep(0)
      }, 400)
      return () => clearTimeout(timer)
    }
    const timer = setTimeout(() => setAuthStep((s) => s + 1), 560)
    return () => clearTimeout(timer)
  }, [authFor, authStep, connect])

  const startImport = () => {
    if (!link.trim()) {
      toast.error('الصقي رابط القطعة أولًا')
      return
    }
    setStep(0)
    setImporting(true)
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Try pieces"
        title="قطع للتجربة"
        description="قطعة شفتيها برّا وتبين تشوفينها مع ملابسك قبل ما تقررين. ما تدخل خزانتك إلا لو نقلتيها بنفسك."
      />

      <Card className="mb-10 flex items-start gap-3 px-5 py-4">
        <Shield size={16} strokeWidth={1.4} className="mt-1 flex-none text-muted" />
        <p className="text-[12.5px] leading-7 text-muted">
          <b className="font-normal text-ink">دولابي ما تشوف كلمة مرورك.</b> ربط أي متجر يتم عبر صفحة
          تفويض من المتجر نفسه — نفس طريقة «تسجيل الدخول عبر جوجل»، ودولابي تستلم إذن قراءة فقط.
          <span className="mt-1 block text-faint">
            هذي نسخة واجهة — الربط هنا محاكاة بدون اتصال حقيقي بالمتاجر.
          </span>
        </p>
      </Card>

      {/* ---------------- import by link ---------------- */}
      <SectionHeader eyebrow="Import by link" title="استيراد بالرابط" />
      <div className="mb-14 flex max-w-[720px] items-center gap-3 rounded-md border border-line p-2 ps-5 focus-within:border-ink">
        <Link2 size={17} strokeWidth={1.3} className="text-faint" />
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && startImport()}
          placeholder="الصقي رابط القطعة من أي متجر…"
          className="h-10 w-full bg-transparent text-[13.5px] outline-none placeholder:text-faint"
          dir="ltr"
        />
        <Button onClick={startImport}>استيراد</Button>
      </div>

      {/* ---------------- sources ---------------- */}
      <SectionHeader eyebrow="Sources" title="مصادر الاستيراد" />
      <div className="mb-14 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {IMPORT_SOURCES.map((s) => {
          const on = connected.includes(s.id)
          return (
            <div key={s.id} className="flex flex-col gap-4 rounded-md border border-line p-5">
              <div className="flex items-center gap-4">
                <span
                  className={cn(
                    'lat grid h-12 w-12 flex-none place-items-center rounded-md text-[14px]',
                    on ? 'bg-ink text-white' : 'border border-line bg-surface text-faint',
                  )}
                >
                  {s.mark}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px]">{s.name}</p>
                  <p className="lat text-[10px] text-faint">{s.latin}</p>
                </div>
                <span
                  className={cn(
                    'lat rounded-full border px-2.5 py-1 text-[8.5px]',
                    on ? 'border-ink bg-ink text-white' : 'border-line text-faint',
                  )}
                >
                  {on ? 'Connected' : 'Not linked'}
                </span>
              </div>
              {on ? (
                <Button size="sm" variant="ghost" onClick={() => disconnect(s.id)}>
                  فصل الحساب
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setAuthFor(s.id)}>
                  <ExternalLink size={13} strokeWidth={1.5} />
                  ربط الحساب
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {/* ---------------- imported pieces ---------------- */}
      <SectionHeader
        eyebrow="Not in your wardrobe"
        title="قطع تحت التجربة"
        action={
          tryItems.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                studio.replaceAll(tryItems.map((i) => i.id))
                navigate('/studio')
              }}
            >
              <Wand2 size={13} strokeWidth={1.5} />
              جرّبيها كلها
            </Button>
          )
        }
      />
      {tryItems.length === 0 ? (
        <EmptyState
          title="ما فيه قطع للتجربة."
          body="الصقي رابط قطعة عشان تشوفينها على موديلك قبل ما تشترينها."
        />
      ) : (
        <>
          <ItemGrid items={tryItems} />
          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                tryItems.forEach((i) => deleteItem(i.id))
                toast.ok('نظّفنا قطع التجربة')
              }}
            >
              <Trash2 size={13} strokeWidth={1.5} />
              حذف كل قطع التجربة
            </Button>
          </div>
        </>
      )}

      {/* ---------------- import progress ---------------- */}
      <Modal open={importing} onClose={() => undefined} eyebrow="Importing" title="نقرأ القطعة من الرابط…">
        <Steps labels={IMPORT_STEPS} done={step} />
      </Modal>

      {/* ---------------- authorization ---------------- */}
      <Modal
        open={Boolean(authFor) && authStep === 0}
        onClose={() => setAuthFor(undefined)}
        eyebrow="Connect account"
        title={`ربط حساب ${sourceById(authFor)?.name ?? ''}`}
        footer={
          <div className="flex gap-3">
            <Button onClick={() => setAuthStep(1)}>
              <ExternalLink size={14} strokeWidth={1.5} />
              متابعة إلى {sourceById(authFor)?.name}
            </Button>
            <Button variant="secondary" onClick={() => setAuthFor(undefined)}>
              إلغاء
            </Button>
          </div>
        }
      >
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <div className="flex items-center gap-3 border-b border-line bg-canvas px-4 py-3">
            <span className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-2 w-2 rounded-full bg-line-strong" />
              ))}
            </span>
            <Lock size={13} strokeWidth={1.5} className="text-faint" />
            <span className="lat text-[11px] text-faint">
              {sourceById(authFor)?.latin.toLowerCase().replace(/\s/g, '')}.com / authorize
            </span>
          </div>
          <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
            <span className="lat grid h-13 w-13 place-items-center rounded-md bg-ink px-3 py-3 text-[15px] text-white">
              {sourceById(authFor)?.mark}
            </span>
            <p className="text-[14px]">تسجيل الدخول يتم داخل {sourceById(authFor)?.name}</p>
            <p className="max-w-[360px] text-[12.5px] leading-7 text-muted">
              تنفتح صفحة المتجر الرسمية، تدخلين حسابك هناك، وترجع دولابي بتصريح وصول فقط. كلمة مرورك
              ما تمر على دولابي نهائيًا.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <p className="eyebrow mb-2">دولابي تقدر</p>
          <ul className="flex flex-col">
            {[
              'قراءة قائمة المفضلة والسلة',
              'قراءة صور وتفاصيل القطع',
              'استيراد القطع كـ «قطع للتجربة» فقط',
            ].map((line) => (
              <li key={line} className="flex items-center gap-3 border-b border-line py-2.5 text-[12.5px]">
                <Check size={14} strokeWidth={1.6} className="flex-none text-muted" />
                {line}
              </li>
            ))}
            <li className="flex items-center gap-3 py-2.5 text-[12.5px] text-muted">
              <span className="w-[14px] flex-none text-center">✕</span>
              لا تقدر تشتري، تدفع، أو تعدّل طلباتك
            </li>
          </ul>
        </div>
      </Modal>

      <Modal
        open={Boolean(authFor) && authStep > 0}
        onClose={() => undefined}
        eyebrow="Authorizing"
        title={`جارٍ الربط مع ${sourceById(authFor)?.name ?? ''}…`}
      >
        <Steps
          labels={['فتح صفحة المتجر', 'تأكيد الهوية داخل المتجر', 'استلام تصريح الوصول']}
          done={authStep - 1}
        />
      </Modal>
    </PageContainer>
  )
}

function Steps({ labels, done }: { labels: string[]; done: number }) {
  return (
    <div>
      <ul className="flex flex-col">
        {labels.map((label, i) => (
          <li
            key={label}
            className={cn(
              'flex items-center gap-3 py-3 text-[13px] transition-colors',
              i < done ? 'text-ink' : 'text-faint',
            )}
          >
            <span
              className={cn(
                'grid h-4 w-4 flex-none place-items-center rounded-full border transition-colors',
                i < done ? 'border-ink bg-ink' : 'border-line-strong',
              )}
            >
              {i < done && <Check size={9} strokeWidth={3} className="text-white" />}
            </span>
            {label}
          </li>
        ))}
      </ul>
      <div className="mt-4 h-px overflow-hidden bg-line">
        <div
          className="h-full bg-ink transition-all duration-500"
          style={{ width: `${(done / labels.length) * 100}%` }}
        />
      </div>
    </div>
  )
}
