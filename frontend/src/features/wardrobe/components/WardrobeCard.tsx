import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { useWardrobe } from '../store'
import { ROUTES } from '@/shared/config'
import { cn } from '@/shared/lib'
import type { Wardrobe } from '@/domain/wardrobe'

/**
 * بطاقة الخزانة — معاينة رباعية، عدد القطع، والاسم اللاتيني فوق العربي (W-03).
 * الخزانة الفاضية تُعرض كسطح واحد ساكن: شبكة مربّعات فاضية تبان كأنها معطّلة.
 */
export function WardrobeCard({ wardrobe }: { wardrobe: Wardrobe }) {
  // نختار المصفوفة الثابتة ونضيّقها هنا — المحدّد اللي يبني مصفوفة جديدة كل
  // رسم يخلي zustand v5 يعيد الرسم بلا نهاية
  const allItems = useWardrobe((state) => state.items)
  const items = useMemo(
    () => allItems.filter((item) => item.wardrobeId === wardrobe.id),
    [allItems, wardrobe.id],
  )
  const preview = items.slice(0, 4)

  return (
    <Link to={ROUTES.wardrobe(wardrobe.id)} className="group flex flex-col gap-3">
      <div
        className={cn(
          'lift relative aspect-square overflow-hidden rounded-md border border-line group-hover:border-line-strong',
          preview.length > 0 ? 'grid grid-cols-2 gap-px bg-line p-px' : 'bg-surface',
        )}
      >
        {preview.length > 0 &&
          [0, 1, 2, 3].map((slot) =>
            preview[slot] ? (
              <div key={slot} className="grid place-items-center bg-surface">
                <ItemImage item={preview[slot]} className="h-[74%] w-[74%]" />
              </div>
            ) : (
              <div key={slot} className="bg-surface-warm" />
            ),
          )}
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[rgba(10,10,10,0.5)] text-white opacity-0 backdrop-blur-[3px] transition-opacity duration-[320ms] ease-soft group-hover:opacity-100">
          <span className="text-[12.5px]">
            {items.length > 0 ? 'افتحي الخزانة' : 'أضيفي أول قطعة'}
          </span>
          <span className="lat text-[9.5px] opacity-70">{items.length} pieces</span>
        </span>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="lat text-[10.5px] font-medium">{wardrobe.nameLatin}</p>
          <p className="mt-0.5 text-[12.5px]">خزانة {wardrobe.name}</p>
        </div>
        <span className="lat text-[11px] text-faint">{items.length}</span>
      </div>
    </Link>
  )
}
