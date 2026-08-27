/**
 * قائمة الشنطة.
 *
 * مشتقّة من إطلالات الأيام، ما تُكتب يدويًا (T-04)، ومقسّمة بمواضع القطع لأن
 * الشنطة تُحزم بالمجموعات: الأحذية مع الأحذية، لا بترتيب ما أُضيف للأيام.
 *
 * كل صف يحمل صورة القطعة — الاسم وحده ما يكفي للتعرّف على «قميص أبيض» بين
 * ثلاثة قمصان بيضاء.
 */
import { Check } from 'lucide-react'
import { ProgressLine } from '@/shared/components/ui'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { packingGroups } from '@/domain/travel'
import { cn } from '@/shared/lib'
import type { Trip, TripProgress } from '@/domain/travel'
import type { WardrobeItem } from '@/domain/wardrobe'

export function PackingList({
  trip,
  wardrobe,
  progress,
  onToggle,
}: {
  trip: Trip
  wardrobe: WardrobeItem[]
  progress: TripProgress
  onToggle: (itemId: string) => void
}) {
  const groups = packingGroups(trip, wardrobe)

  if (groups.length === 0) {
    return (
      <p className="text-[13px] leading-7 text-muted">
        القائمة تتولّد من إطلالات الأيام — خطّطي يومًا واحدًا على الأقل وتظهر هنا.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <ProgressLine
        label="محزوم في الشنطة"
        value={progress.packed}
        note={`${progress.packedPieces}/${progress.pieces}`}
        className="max-w-[320px]"
      />

      <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => {
          const packedInGroup = group.items.filter((item) => trip.packed.includes(item.id)).length

          return (
            <section key={group.slot}>
              <header className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
                <h3 className="text-[12.5px]">{group.label}</h3>
                <span className="lat text-[10.5px] text-faint">
                  {packedInGroup}/{group.items.length}
                </span>
              </header>

              <ul>
                {group.items.map((item) => {
                  const packed = trip.packed.includes(item.id)

                  return (
                    <li key={item.id}>
                      <button
                        role="checkbox"
                        aria-checked={packed}
                        onClick={() => onToggle(item.id)}
                        className="flex w-full items-center gap-3 border-b border-line py-2.5 text-right transition-colors hover:bg-surface"
                      >
                        <span
                          className={cn(
                            'grid h-4 w-4 flex-none place-items-center rounded-[3px] border transition-colors',
                            packed ? 'border-ink-soft bg-ink-soft' : 'border-line-strong',
                          )}
                        >
                          {packed && (
                            <Check size={10} strokeWidth={3} aria-hidden className="text-white" />
                          )}
                        </span>

                        <span className="grid h-9 w-8 flex-none place-items-center overflow-hidden rounded-sm bg-surface">
                          <ItemImage item={item} className="h-[78%] w-[78%]" />
                        </span>

                        <span
                          className={cn(
                            'min-w-0 flex-1 truncate text-[12.5px]',
                            packed ? 'text-faint line-through' : 'text-ink',
                          )}
                        >
                          {item.name}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
