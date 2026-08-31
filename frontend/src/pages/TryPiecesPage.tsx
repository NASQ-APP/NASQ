/**
 * قطع ما تملكينها بعد.
 *
 * هذا المكان الوحيد اللي يظهر فيه متجر خارجي — كـ**مصدر استيراد**، مو متجر.
 * ما فيه شي يُشترى هنا: القطعة تُسحب، تُجرّب على موديلك، وإما تنتقل لخزانتك
 * (لأنك اشتريتيها فعلاً) أو تنحذف (المبدأ ١ · I-02 · I-03).
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ExternalLink, Link2, Trash2, Wand2 } from 'lucide-react'
import {
  Button,
  ButtonAnchor,
  EmptyState,
  Modal,
  PageHeader,
  SectionHeader,
  toast,
} from '@/shared/components/ui'
import { PageContainer } from '@/shared/components/layout'
import { TryPiecesRail } from '@/features/try-pieces/components/TryPiecesRail'
import { itemBySourceLink, useWardrobe } from '@/features/wardrobe/store'
import { useStudio } from '@/features/studio/store'
import { CATEGORIES, categoryById, ITEM_COLORS, shapesForSlot } from '@/domain/wardrobe'
import { IMPORT_SOURCES, sourceById } from '@/features/try-pieces/sources'
import { importFromUrl } from '@/features/try-pieces/import'
import { useImportedImageAudit } from '@/features/try-pieces/audit'
import { cn } from '@/shared/lib'
import { ROUTES } from '@/shared/config'

const IMPORT_STEPS = ['فتح صفحة القطعة', 'سحب الصورة', 'إزالة الخلفية', 'تحديد الفئة واللون']

export function TryPiecesPage() {
  const navigate = useNavigate()
  const { items, addItem, deleteItem } = useWardrobe()
  const studio = useStudio()

  // القطع المستوردة قبل هذي الميزة تُفحص مرة وحدة هنا
  useImportedImageAudit()

  const [link, setLink] = useState('')
  const [importing, setImporting] = useState(false)
  const [step, setStep] = useState(0)

  const tryItems = items.filter((i) => i.source === 'try')

  /* ---------------- الاستيراد بالرابط ---------------- */

  /**
   * ينشئ قطعة التجربة من بيانات الرابط. القطعة تدخل «قطع للتجربة» دائمًا (I-02).
   *
   * القراءة كلها في `importFromUrl` — الصفحة ما تعرف إن كانت محاكاة أو نداء
   * حقيقي، فربط الباك-إند لاحقًا ما يمسّ هذا الملف.
   */
  const completeImport = useCallback(async () => {
    const product = await importFromUrl(link)

    if (!product.extracted) {
      setImporting(false)
      setStep(0)
      toast.error(product.reason ?? 'ما قدرنا نقرأ القطعة من الرابط.')
      return
    }

    /*
      رابط لصقتيه قبل: نوديك للقطعة الموجودة بدل ما نضيف نسخة ثانية.
      قصدك تجرّبين هذي القطعة، وهي عندك أصلًا — فنوصّلك لها.
    */
    const existing = itemBySourceLink(product.sourceLink)
    if (existing) {
      setImporting(false)
      setStep(0)
      setLink('')
      studio.add(existing.id)
      toast.info(`${existing.name} موجودة عندك — جهّزناها للتجربة.`)
      navigate(ROUTES.studio)
      return
    }

    const categoryId = product.categoryId ?? CATEGORIES[0].id
    const slot = categoryById(categoryId)?.slot ?? 'top'
    const store = sourceById(product.storeId)

    const item = addItem({
      name: product.name ?? `قطعة من ${store?.name ?? 'رابط خارجي'}`,
      categoryId,
      shape: product.shape ?? shapesForSlot(slot)[0].id,
      colorHex: product.colorHex ?? ITEM_COLORS[0].hex,
      colorName: product.colorName ?? ITEM_COLORS[0].name,
      imageUrl: product.imageUrl,
      images: product.images,
      imageHasModel: product.imageHasModel,
      brand: product.brand,
      price: product.price,
      wardrobeId: null,
      source: 'try',
      storeId: product.storeId,
      sourceLink: product.sourceLink,
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
      () => (step >= IMPORT_STEPS.length ? void completeImport() : setStep((s) => s + 1)),
      480,
    )
    return () => clearTimeout(timer)
  }, [importing, step, completeImport])

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
      <p className="mb-5 max-w-[560px] text-[12.5px] leading-7 text-muted">
        افتحي المتجر ← انسخي رابط القطعة ← الصقيه فوق.
      </p>
      <div className="mb-14 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {IMPORT_SOURCES.map((s) => (
          <div key={s.id} className="flex flex-col gap-4 rounded-md border border-line p-5">
            <div className="flex items-center gap-4">
              <span className="lat grid h-12 w-12 flex-none place-items-center rounded-md border border-line bg-surface text-[14px] text-faint">
                {s.mark}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px]">{s.name}</p>
                <p className="lat text-[10px] text-faint">{s.latin}</p>
              </div>
            </div>
            <ButtonAnchor
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              size="sm"
              variant="secondary"
            >
              <ExternalLink size={13} strokeWidth={1.5} />
              افتحي المتجر
            </ButtonAnchor>
          </div>
        ))}
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
          {/*
            نعرض صورة المتجر كما هي، حتى لو فيها عارضة. حجبها كان يترك الرفّ
            لوحات فاضية: أغلب صور الفساتين على عارضة، فتختفي القطعة كلها ولا
            تعرف المستخدمة وش استوردت. الصورة الناقصة أسوأ من عارضة فيها.
            تبديل الصورة يبقى متاحًا من صفحة القطعة.
          */}
          <TryPiecesRail
            pieces={tryItems.map((i) => ({
              id: i.id,
              name: i.name,
              imageUrl: i.imageUrl,
              meta: [categoryById(i.categoryId)?.name, i.price].filter(Boolean).join(' · ') || undefined,
              badge: sourceById(i.storeId)?.latin,
            }))}
            onSelect={(id) => navigate(ROUTES.item(id))}
          />
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
