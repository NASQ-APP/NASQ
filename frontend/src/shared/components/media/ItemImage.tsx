import { useItemPhotos } from '@/features/wardrobe/photos'
import { cn } from '@/shared/lib'
import type { WardrobeItem } from '@/domain/wardrobe'

/** أقل ما تحتاجه البطاقة لعرض القطعة. */
export type ItemImageSource = Pick<WardrobeItem, 'name'> & {
  id?: string
  imageUrl?: string
}

/**
 * مكان واحد يقرّر شكل القطعة، فكل الشاشات تعرض نفس الصورة.
 *
 * الأولوية: صورة رفعتها المستخدمة ← صورة مرفقة بالقطعة ← سطح فاضي هادئ.
 *
 * ما فيه رسم بديل ولا أيقونة: القطعة بلا صورة تترك مكانها ساكنًا بدل ما نملأ
 * الشبكة بعلامات تشتّت. اسم القطعة تحتها يكفي للتعرّف عليها.
 */
export function ItemImage({
  item,
  className,
  alt,
}: {
  item: ItemImageSource
  className?: string
  alt?: string
}) {
  const uploaded = useItemPhotos((state) => (item.id ? state.urls[item.id] : undefined))
  const source = uploaded ?? item.imageUrl

  if (!source) {
    return <span aria-hidden className={cn('block', className)} />
  }

  return (
    <img
      src={source}
      alt={alt ?? item.name}
      loading="lazy"
      className={cn('object-contain', className)}
    />
  )
}

/** نفس المنطق لمن يحتاج الرابط وحده (التنزيل، المشاركة). */
export const itemImageUrl = (item: ItemImageSource): string | undefined =>
  (item.id ? useItemPhotos.getState().urls[item.id] : undefined) ?? item.imageUrl
