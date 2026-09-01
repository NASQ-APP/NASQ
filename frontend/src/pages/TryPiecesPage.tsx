/**
 * قطع ما تملكينها بعد.
 *
 * هذا المكان الوحيد اللي يظهر فيه متجر خارجي — كـ**مصدر استيراد**، مو متجر.
 * ما فيه شي يُشترى هنا: القطعة تُسحب، تُجرّب على موديلك، وإما تنتقل لخزانتك
 * (لأنك اشتريتيها فعلاً) أو تنحذف (المبدأ ١ · I-02 · I-03).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Check, Link2, Wand2 } from 'lucide-react'
import {
  Button,
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
import { useAppShell } from '@/app/layout'
import { CATEGORIES, categoryById, ITEM_COLORS, shapesForSlot } from '@/domain/wardrobe'
import { sourceById } from '@/features/try-pieces/sources'
import { importFromUrl } from '@/features/try-pieces/import'
import { useImportedImageAudit } from '@/features/try-pieces/audit'
import { cn } from '@/shared/lib'
import { ROUTES } from '@/shared/config'
import type { WardrobeItem } from '@/domain/wardrobe'

/** ختم أحدث قطعة في مجموعة — عليه يُرتّب المصدر. */
const newest = (pieces: WardrobeItem[]): number =>
  pieces.reduce((max, piece) => Math.max(max, Date.parse(piece.addedAt) || 0), 0)

const IMPORT_STEPS = ['فتح صفحة القطعة', 'سحب الصورة', 'إزالة الخلفية', 'تحديد الفئة واللون']

export function TryPiecesPage() {
  const navigate = useNavigate()
  const { items, addItem } = useWardrobe()
  const studio = useStudio()
  const { openAdd } = useAppShell()

  // القطع المستوردة قبل هذي الميزة تُفحص مرة وحدة هنا
  useImportedImageAudit()

  const [link, setLink] = useState('')
  const [importing, setImporting] = useState(false)
  const [step, setStep] = useState(0)

  /**
   * متجر رفض القراءة — نوقف ونشرح بدل ما نضيف قطعة ناقصة بصمت.
   *
   * الإضافة الصامتة تخلّي المستخدمة تلقى قطعة بلا صورة وما تدري ليش، فتظن العطل
   * عندنا. السبب يُقال، والمخرج يُعرَض — والقرار لها.
   */
  const [blocked, setBlocked] = useState<{ storeName: string; link: string }>()

  const tryItems = items.filter((i) => i.source === 'try')

  /*
    القطع مرتّبة **تحت مصدرها**، لا مرصوفة في رفّ واحد.

    ما عاد فيه «افتحي المتجر»: القطعة تدخل برابط تلصقينه أو بمشاركة من المتجر
    نفسه، فقائمة متاجر تُفتح صارت تملأ الصفحة بما لا يُستعمل. واسم المتجر أنفع
    عنوانًا لقطعه — تقارنين فساتين فوغا جنب بعض، مو مبعثرة بين قطع شي إن.

    الترتيب بأحدث قطعة في كل مجموعة: ما استوردتيه قبل شوي يطلع فوق بلا ما تدوّرين.
    وقطعة من موقع ما نعرفه تجي تحت «مصادر أخرى» — المشاركة تقبل أي موقع،
    فإخفاؤها يعني قطعة دخلت وما تبين في أي مكان.
  */
  const grouped = useMemo(() => {
    const groups = new Map<string, WardrobeItem[]>()
    for (const item of tryItems) {
      const key = item.storeId ?? 'other'
      groups.set(key, [...(groups.get(key) ?? []), item])
    }

    return [...groups.entries()]
      .map(([id, pieces]) => {
        const source = sourceById(id)
        return {
          id,
          name: source?.name ?? 'مصادر أخرى',
          latin: source?.latin ?? 'Other',
          pieces,
        }
      })
      .toSorted((a, b) => newest(b.pieces) - newest(a.pieces))
  }, [tryItems])

  /* ---------------- الاستيراد بالرابط ---------------- */

  /**
   * ينشئ قطعة التجربة من بيانات الرابط. القطعة تدخل «قطع للتجربة» دائمًا (I-02).
   *
   * القراءة كلها في `importFromUrl` — الصفحة ما تعرف إن كانت محاكاة أو نداء
   * حقيقي، فربط الباك-إند لاحقًا ما يمسّ هذا الملف.
   */
  const completeImport = useCallback(async () => {
    const product = await importFromUrl(link)

    /*
      المتجر رفض القراءة — ومع ذلك ندخّل القطعة.

      المستخدمة لصقت رابطًا لقطعة تبيها، ورفض المتجر لقارئ آلي مشكلته هو لا مشكلتها.
      فنأخذ من الرابط ما يعطيه: المتجر من نطاقه، والاسم من مساره — ثم نوديها
      لصفحة القطعة تكمّل الفئة والصورة. قطعة ناقصة أفضل من رسالة خطأ.
    */
    if (!product.extracted && product.blocked) {
      const store = sourceById(product.storeId)
      setImporting(false)
      setStep(0)
      setBlocked({ storeName: store?.name ?? new URL(link).hostname.replace(/^www\./, ''), link })
      return
    }

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

      {/* ---------------- imported pieces, by store ---------------- */}
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
                navigate(ROUTES.studio)
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
          body="الصقي رابط قطعة فوق، أو شاركيها لـ«نَسّق» من أي متجر."
        />
      ) : (
        <>
          <div className="flex flex-col gap-12">
            {grouped.map((group) => (
              <section key={group.id}>
                {/*
                  اسم المتجر عنوان لما تحته، مو بطاقة تُفتح. ما فيه وين تروحين:
                  القطعة تدخل برابط تلصقينه أو بمشاركة من المتجر نفسه.
                */}
                <div className="mb-5 flex items-baseline gap-3 border-b border-line pb-3">
                  <h3 className="text-[15px]">{group.name}</h3>
                  <span className="lat text-[10.5px] text-faint">{group.latin}</span>
                  <span className="me-0 ms-auto text-[11.5px] text-faint">
                    {group.pieces.length} {group.pieces.length === 1 ? 'قطعة' : 'قطع'}
                  </span>
                </div>

                {/*
                  نعرض صورة المتجر كما هي، حتى لو فيها عارضة. حجبها كان يترك الرفّ
                  لوحات فاضية: أغلب صور الفساتين على عارضة، فتختفي القطعة كلها ولا
                  تعرف المستخدمة وش استوردت. الصورة الناقصة أسوأ من عارضة فيها.
                */}
                <TryPiecesRail
                  pieces={group.pieces.map((i) => ({
                    id: i.id,
                    name: i.name,
                    imageUrl: i.imageUrl,
                    meta:
                      [categoryById(i.categoryId)?.name, i.price].filter(Boolean).join(' · ') ||
                      undefined,
                  }))}
                  onSelect={(id) => navigate(ROUTES.item(id))}
                />
              </section>
            ))}
          </div>
        </>
      )}

      {/* ---------------- store blocks automated reading ---------------- */}
      <Modal
        open={Boolean(blocked)}
        onClose={() => setBlocked(undefined)}
        eyebrow="Store protection"
        title={`${blocked?.storeName ?? 'المتجر'} يحمي صفحاته`}
        width="sm"
        footer={
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setBlocked(undefined)
                setLink('')
                openAdd()
              }}
            >
              <Camera size={14} strokeWidth={1.5} />
              ارفعي صورة القطعة
            </Button>
            <Button variant="secondary" onClick={() => setBlocked(undefined)}>
              إلغاء
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 text-[13px] leading-8 text-muted">
          <p>
            هذا المتجر <strong className="text-ink">يرفض القراءة الآلية</strong> لصفحاته، فما
            نقدر نسحب صورة القطعة ولا اسمها ولا سعرها. مو عطلًا عندنا — يفتح للمتصفّح وحده.
          </p>
          <p>
            بس تقدرين تضيفينها بنفسك عن طريق <strong className="text-ink">رفع صورتها</strong>،
            ونقرأ فئتها ولونها من الصورة.
          </p>

          <div className="rounded-md border border-line bg-surface p-4">
            <ol className="flex list-inside list-decimal flex-col gap-1.5 text-[12.5px]">
              <li>افتحي صفحة القطعة في المتجر</li>
              <li>خذي لقطة شاشة للقطعة وحدها</li>
              <li>ارجعي واضغطي «ارفعي صورة القطعة» تحت</li>
            </ol>
          </div>
        </div>
      </Modal>

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
