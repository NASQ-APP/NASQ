import { useItemPhotos } from '@/features/wardrobe/photos'
import { ImageWithFallback } from '@/shared/components/render'
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
  const photosReady = useItemPhotos((state) => state.hydrated)
  const source = uploaded ?? item.imageUrl

  /*
    الكتلة اللونية هي البديل هنا لا الأيقونة العامة: القطعة عندنا لها لون
    معروف، فالبديل الذي يقول لونها أنفع من الذي يقول «تعذّر». وهي نفسها بديل
    الغياب وبديل الفشل — من ناحية المستخدمة الحالتان واحدة: ما فيه صورة.
  */
  const swatch = <ItemSwatch item={item} className="absolute inset-0 h-full w-full" />

  /*
    الانتظار يُقال هيكلاً لا كتلة لون.

    روابط الصور تُوقَّع بجولة شبكة بينما القطع تُرسم فورًا من التخزين المحلي،
    فكانت كل قطعة مصوّرة تظهر كتلةً ملوّنة عند كل فتح وتحديث ثم تنقلب صورة.
    والكتلة اللونية جواب قاطع — «هذي ما لها صورة» — يُقال قبل أن نعرف.

    بعد الانتهاء (نجح التوقيع أو فشل) تصير الكتلة صادقة، فتُعرض.
  */
  if (!source) {
    return photosReady ? (
      <ItemSwatch item={item} className={cn('h-full w-full', className)} />
    ) : (
      <span className={cn('skeleton block h-full w-full rounded-md', className)} aria-hidden />
    )
  }

  return (
    <ImageWithFallback
      src={source}
      alt={alt ?? item.name}
      className={cn('h-full w-full', className)}
      fallback={swatch}
    />
  )
}

/** نفس المنطق لمن يحتاج الرابط وحده (التنزيل، المشاركة). */
export const itemImageUrl = (item: ItemImageSource): string | undefined =>
  (item.id ? useItemPhotos.getState().urls[item.id] : undefined) ?? item.imageUrl
