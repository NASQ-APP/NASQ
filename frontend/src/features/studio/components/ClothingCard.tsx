/**
 * بطاقة قطعة داخل الخزانة.
 *
 * تُسحب وتُنقر: السحب هو التفاعل الأساسي، والنقر بديل يشتغل على الجوال
 * وبلوحة المفاتيح — فما نبني ميزة تُقفل على من ما يقدر يسحب.
 *
 * الصورة هي البطل؛ الاسم والخزانة تحتها بخط هادئ.
 */
import { Check } from 'lucide-react'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { cn } from '@/shared/lib'
import type { WardrobeItem } from '@/domain/wardrobe'

export const DRAG_MIME = 'application/x-dulabi-item'

export function ClothingCard({
  item,
  wardrobeName,
  selected,
  onPick,
  onDragStateChange,
}: {
  item: WardrobeItem
  /** اسم الخزانة — يُعرض في وضع «كل ملابسي» فقط */
  wardrobeName?: string
  selected: boolean
  onPick: () => void
  onDragStateChange: (dragging: boolean) => void
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAG_MIME, item.id)
        event.dataTransfer.effectAllowed = 'copy'
        onDragStateChange(true)
      }}
      onDragEnd={() => onDragStateChange(false)}
      onClick={onPick}
      aria-pressed={selected}
      title={item.name}
      className="group flex flex-col text-right"
    >
      <span
        className={cn(
          'relative grid aspect-square place-items-center overflow-hidden rounded-md border bg-surface',
          'transition-all duration-[250ms] ease-soft group-active:cursor-grabbing',
          selected
            ? 'border-ink'
            : 'border-line group-hover:border-line-strong group-hover:-translate-y-0.5',
        )}
      >
        <ItemImage item={item} className="h-[82%] w-[82%]" />

        {selected && (
          <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-ink text-white">
            <Check size={11} strokeWidth={3} aria-hidden />
          </span>
        )}
      </span>

      <span className="mt-2 truncate text-[11.5px] leading-5">{item.name}</span>
      {wardrobeName && <span className="truncate text-[10px] text-faint">{wardrobeName}</span>}
    </button>
  )
}
