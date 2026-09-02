/**
 * استقبال قطعة مشارَكة من أي تطبيق.
 *
 * تصل هنا لما تضغط المستخدمة «مشاركة» في متجر أو إنستقرام أو سفاري وتختار
 * نَسّق. هذا **بديل الإضافة بلا تنصيب إضافة**: المتصفّح يمنع أي موقع من زرع
 * زر داخل صفحة نطاق ثانٍ، لكن نظام التشغيل يسمح لأي تطبيق مثبَّت يظهر في
 * قائمة المشاركة — فالنتيجة نفسها من باب مسموح.
 *
 * **الرابط قد يجي في ثلاثة حقول.** أندرويد يرسل `url` أحيانًا، ويحشره داخل
 * `text` أحيانًا (مع نصّ قبله)، وبعض التطبيقات تضعه في `title`. فنلتقط أول
 * رابط نلقاه في أيّها، بدل ما نفترض حقلًا واحدًا ونفشل مع نصف التطبيقات.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageContainer } from '@/shared/components/layout'
import { Button, PageHeader, toast } from '@/shared/components/ui'
import { ITEM_COLORS, categoryById, shapesForSlot } from '@/domain/wardrobe'
import { itemBySourceLink, useWardrobe } from '@/features/wardrobe/store'
import { importFromUrl } from '@/features/try-pieces/import'
import { sourceById } from '@/features/try-pieces/sources'
import { useStudio } from '@/features/studio/store'
import { ROUTES } from '@/shared/config'
import { useVoice } from '@/features/onboarding/voice'

/** أول رابط http(s) داخل نصّ — المشاركة تجي مغلَّفة بكلام غالبًا. */
const firstLink = (...candidates: (string | null)[]): string | undefined => {
  for (const candidate of candidates) {
    const match = candidate?.match(/https?:\/\/\S+/)
    if (match) return match[0]
  }
  return undefined
}

type Phase = 'reading' | 'failed'

export function SharePage() {
  const say = useVoice()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const addItem = useWardrobe((state) => state.addItem)
  const studio = useStudio()

  const link = firstLink(params.get('url'), params.get('text'), params.get('title'))

  /*
    غياب الرابط يُعرَف عند الرسم لا في أثر: هو مشتق من المعاملات مباشرة،
    وضبط حالة له يطلب رسمة ثانية بلا فائدة.
  */
  const [phase, setPhase] = useState<Phase>(link ? 'reading' : 'failed')
  const [reason, setReason] = useState<string | undefined>(
    link
      ? undefined
      : say(
          'ما وصلنا رابط قطعة. شاركي رابط صفحة المنتج من المتجر.',
          'ما وصلنا رابط قطعة. شارك رابط صفحة المنتج من المتجر.',
        ),
  )

  // المشاركة تُعالَج مرة واحدة: React يركّب الأثر مرتين في وضع التطوير الصارم،
  // وبلا هذا الحارس تنضاف القطعة نسختين.
  const handled = useRef(false)

  useEffect(() => {
    if (!link || handled.current) return
    handled.current = true

    void (async () => {
      // وصلت قبل: نوصّلك لها بدل نسخة ثانية
      const existing = itemBySourceLink(link)
      if (existing) {
        studio.add(existing.id)
        toast.info(`${existing.name} موجودة عندك — جهّزناها للتجربة.`)
        navigate(ROUTES.studio, { replace: true })
        return
      }

      const product = await importFromUrl(link)

      if (!product.extracted) {
        setReason(product.reason ?? 'ما قدرنا نقرأ القطعة من الرابط.')
        setPhase('failed')
        return
      }

      /*
      الفئة المجهولة تدخل **إكسسوارًا** لا تيشيرتًا.

      `CATEGORIES[0]` هي `women-tshirts`، فكانت نظّارة شمسية تُحفَظ قطعةً
      علوية وتقود إطلالة كاملة. والإكسسوار أسوأ ما فيه أن يُهمَل، لا أن يفسد
      بنية الإطلالة. والمستخدمة تصحّحه من صفحة القطعة.
    */
    const categoryId = product.categoryId ?? 'women-accessories'
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

      studio.add(item.id)
      toast.ok(`أضفنا ${item.name} — ${say('جرّبيها على موديلك', 'جرّبها على موديلك')}`)
      navigate(ROUTES.studio, { replace: true })
    })()
  }, [addItem, link, navigate, studio, say])

  return (
    <PageContainer width="prose">
      <PageHeader eyebrow="Share" title={phase === 'reading' ? 'نقرأ القطعة…' : 'ما قدرنا نقرأها'} />

      {phase === 'reading' ? (
        <p className="text-[13px] leading-8 text-muted">
          نفتح صفحة المنتج ونقرأ اسمها وصورتها وسعرها. ثانية وحدة.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          <p className="text-[13px] leading-8 text-muted">{reason}</p>
          {link && (
            <p dir="ltr" className="break-all rounded-md border border-line bg-surface px-4 py-3 text-[11.5px] text-faint">
              {link}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate(ROUTES.tryPieces, { replace: true })}>
              {say('جرّبي الاستيراد بالرابط', 'جرّب الاستيراد بالرابط')}
            </Button>
            <Button variant="secondary" onClick={() => navigate(ROUTES.home, { replace: true })}>
              الرئيسية
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
