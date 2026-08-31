/**
 * اختيار صورة القطعة من صور المتجر.
 *
 * الاختيار التلقائي يفضّل صورة القطعة وحدها، وإذا ما فيه صورة كذا يعرض أفضل
 * المتاح ولو كان على عارضة. المعرض هنا يعرض كل صور المتجر مع تعليم اللي فيها
 * شخص، فتقدرين تبدّلين بنفسك.
 */
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, User } from 'lucide-react'
import { useWardrobe } from '@/features/wardrobe/store'
import { personInImage, scoreImages, type ImageScore } from '@/features/try-pieces/pick-image'
import { cn } from '@/shared/lib'

type Props = {
  itemId: string
  images: string[]
  /** الصورة المعروضة حاليًا */
  current?: string
  className?: string
}

export function ItemImagePicker({ itemId, images, current, className }: Props) {
  const updateItem = useWardrobe((s) => s.updateItem)
  const [scores, setScores] = useState<Record<string, ImageScore>>({})

  useEffect(() => {
    if (images.length === 0) return
    let cancelled = false
    void scoreImages(images).then((measured) => {
      if (cancelled) return
      setScores(Object.fromEntries(measured.map((score) => [score.src, score])))
    })
    return () => {
      cancelled = true
    }
  }, [images])

  if (images.length < 2) return null

  const index = Math.max(0, images.indexOf(current ?? ''))

  /**
   * الوسم على ما فحصناه فقط.
   *
   * الفحص لسا شغّال، أو فشلت قراءة الصورة؟ ما نعلّمها — الوسم يقول «شفنا عارضة
   * هنا»، ولو حطّيناه على المجهول لقالت المستخدمة إن كل صورها فيها عارضة.
   */
  const hasPerson = (src: string) => personInImage(scores[src]) === true

  const choose = (next: number) => {
    const src = images[(next + images.length) % images.length]
    updateItem(itemId, {
      imageUrl: src,
      imageHasModel: personInImage(scores[src]),
      imageChosenByUser: true,
    })
  }

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">صور المتجر</p>
        <div className="flex items-center gap-1">
          <span className="lat me-2 text-[10px] text-faint">
            {index + 1} / {images.length}
          </span>
          <button
            type="button"
            aria-label="الصورة السابقة"
            onClick={() => choose(index - 1)}
            className="grid h-7 w-7 place-items-center rounded-md border border-line text-muted hover:border-ink hover:text-ink"
          >
            <ChevronRight size={14} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            aria-label="الصورة التالية"
            onClick={() => choose(index + 1)}
            className="grid h-7 w-7 place-items-center rounded-md border border-line text-muted hover:border-ink hover:text-ink"
          >
            <ChevronLeft size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => choose(i)}
            aria-label={`اعتمدي الصورة ${i + 1}${hasPerson(src) ? ' — فيها عارضة' : ''}`}
            aria-pressed={i === index}
            className={cn(
              'relative h-[72px] w-[54px] flex-none overflow-hidden rounded-md border bg-surface transition-colors',
              i === index ? 'border-ink' : 'border-line hover:border-line-strong',
            )}
          >
            <img src={src} alt="" loading="lazy" className="h-full w-full object-contain" />
            {hasPerson(src) && (
              <span
                title="فيها عارضة"
                className="absolute bottom-1 left-1 grid h-4 w-4 place-items-center rounded-full bg-canvas/85 text-faint"
              >
                <User size={9} strokeWidth={1.8} aria-hidden />
              </span>
            )}
          </button>
        ))}
      </div>

      <p className="mt-3 text-[11.5px] leading-6 text-faint">
        الصور المعلّمة <User size={10} strokeWidth={1.8} className="inline" /> فيها عارضة من المتجر.
        نختار صورة القطعة وحدها إذا وُجدت، وإلا نعرض أفضل صورة متاحة.
      </p>
    </div>
  )
}
