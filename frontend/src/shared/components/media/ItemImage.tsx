import { useItemPhotos } from '@/features/wardrobe/photos'
import { cn } from '@/shared/lib'
import { ItemSwatch } from './ItemSwatch'
import type { WardrobeItem } from '@/domain/wardrobe'

/** أقل ما تحتاجه البطاقة لعرض القطعة. */
export type ItemImageSource = Pick<WardrobeItem, 'name' | 'colorHex' | 'categoryId'> & {
  id?: string
  imageUrl?: string
}

/**
 * مكان واحد يقرّر شكل القطعة، فكل الشاشات تعرض نفس الصورة.
 *
 * الأولوية: صورة رفعتها المستخدمة ← صورة مرفقة بالقطعة ← كتلة بلون القطعة.
 *
 * الكتلة اللونية بديل عن المربّع الرمادي الفاضي: تقول لون القطعة وموضعها من
 * الجسم بلمحة، وتبقى مجرّدة فما توهم إنها شكلها الحقيقي (المبدأ ٤).
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

  if (!source) return <ItemSwatch item={item} className={cn('h-full w-full', className)} />

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
