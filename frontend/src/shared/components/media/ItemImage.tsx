import { garmentImageUrl } from '@/infrastructure/rendering'
import { useItemPhotos } from '@/features/wardrobe/photos'
import { cn } from '@/shared/lib'
import type { WardrobeItem } from '@/domain/wardrobe'

/** أقل ما تحتاجه البطاقة لترسم القطعة. */
export type ItemImageSource = Pick<WardrobeItem, 'shape' | 'colorHex' | 'name'> & {
  id?: string
  imageUrl?: string
}

/**
 * مكان واحد يقرّر شكل القطعة، فكل الشاشات تعرض نفس الصورة.
 *
 * الأولوية: صورة رفعتها المستخدمة ← صورة مرفقة بالقطعة ← رسم متّجه احتياطي.
 * الرسم المتّجه يضمن إن الشبكة ما تنكسر أبدًا حتى لو ما فيه صورة (المبدأ ٤).
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
  const source = uploaded ?? item.imageUrl ?? garmentImageUrl(item)

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
export const itemImageUrl = (item: ItemImageSource): string =>
  (item.id ? useItemPhotos.getState().urls[item.id] : undefined) ??
  item.imageUrl ??
  garmentImageUrl(item)
