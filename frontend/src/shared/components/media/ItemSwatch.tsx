/**
 * تمثيل بصري للقطعة بلا صورة.
 *
 * المربّع الرمادي الفاضي ما يقول شيئًا. هذا يرسم كتلة بلون القطعة الحقيقي
 * وبنسبة تناسب موضعها من الجسم — العلوي عريض، السفلي طويل، الحذاء منخفض،
 * الحقيبة صغيرة. تُقرأ بلمحة، وتبقى مجرّدة فما توهم إنها شكل القطعة الفعلي.
 */
import { slotOfItem } from '@/domain/wardrobe'
import { cn } from '@/shared/lib'
import type { WardrobeItem } from '@/domain/wardrobe'

type SwatchSource = Pick<WardrobeItem, 'colorHex' | 'categoryId'>

/** نسبة الكتلة وحدّتها لكل موضع من الجسم. */
const SHAPE: Record<string, { width: string; height: string; radius: string }> = {
  top: { width: '78%', height: '58%', radius: '14%' },
  bottom: { width: '52%', height: '82%', radius: '10%' },
  full: { width: '62%', height: '86%', radius: '18% 18% 10% 10%' },
  outer: { width: '82%', height: '70%', radius: '16%' },
  shoes: { width: '76%', height: '34%', radius: '40% 40% 18% 18%' },
  bag: { width: '58%', height: '50%', radius: '12%' },
  accessory: { width: '46%', height: '46%', radius: '50%' },
}

export function ItemSwatch({ item, className }: { item: SwatchSource; className?: string }) {
  const slot = slotOfItem(item as WardrobeItem)
  const shape = SHAPE[slot] ?? SHAPE.top

  return (
    <span aria-hidden className={cn('grid place-items-center', className)}>
      <span
        className="block"
        style={{
          width: shape.width,
          height: shape.height,
          borderRadius: shape.radius,
          background: item.colorHex,
          // حدّ رفيع يفصل القطع الفاتحة عن الخلفية الفاتحة
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
        }}
      />
    </span>
  )
}
