/**
 * لوحة الإطلالة الحالية — العمود الأخير.
 *
 * تقرأ الإطلالة كطبقات على الجسم لا كقائمة: خانة لكل موضع بترتيب ثابت.
 * الحذف يشيل القطعة من الإطلالة **لا من الخزانة** — الفرق جوهري.
 */
import { PanelLeftClose, Repeat2, Sparkles, X } from 'lucide-react'
import { OUTFIT_SLOTS, toSlots } from '@/domain/studio'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { Button } from '@/shared/components/ui'
import { useStudio } from '../store'
import { useWardrobe } from '@/features/wardrobe/store'
import { cn } from '@/shared/lib'
import type { OutfitSlotId } from '@/domain/studio'
import type { WardrobeItem } from '@/domain/wardrobe'

export function CurrentOutfitPanel({
  items,
  onReplace,
  onAskStylist,
}: {
  items: WardrobeItem[]
  /** يفتح الخزانة على فئة الخانة — «استبدال البنطلون» */
  onReplace: (slot: OutfitSlotId) => void
  onAskStylist: () => void
}) {
  const { remove, clear, setOutfitPanel } = useStudio()
  const wardrobes = useWardrobe((state) => state.wardrobes)
  const slots = toSlots(items)

  const wardrobeName = (item: WardrobeItem) =>
    wardrobes.find((wardrobe) => wardrobe.id === item.wardrobeId)?.name

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-line bg-canvas">
      <header className="flex flex-none items-start justify-between gap-2 px-4 pb-3 pt-4">
        <div>
          <h2 className="text-[14px]">إطلالتك الحالية</h2>
          <p className="lat mt-0.5 text-[10px] text-faint">{items.length} pieces</p>
        </div>
        <button
          onClick={() => setOutfitPanel(false)}
          aria-label="طيّ الإطلالة"
          title="طيّ الإطلالة"
          className="grid h-8 w-8 place-items-center rounded-md text-faint transition-colors hover:bg-surface hover:text-ink"
        >
          <PanelLeftClose size={15} strokeWidth={1.5} aria-hidden />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-line-strong px-4 py-10 text-center text-[12px] leading-7 text-muted">
            ما اخترتي شي بعد.
            <br />
            اسحبي قطعة من خزانتك على الموديل.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {slots
              .filter((slot) => slot.items.length > 0)
              .map((slot) => (
                <section key={slot.id}>
                  <p className="eyebrow mb-2">{slot.label}</p>
                  <div className="flex flex-col gap-2">
                    {slot.items.map((item) => (
                      <article
                        key={item.id}
                        className="group flex items-center gap-3 rounded-md border border-line p-2 transition-colors hover:border-line-strong"
                      >
                        <span className="grid h-12 w-12 flex-none place-items-center overflow-hidden rounded-sm bg-surface">
                          <ItemImage item={item} className="h-[84%] w-[84%]" />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px]">{item.name}</span>
                          <span className="block truncate text-[10.5px] text-faint">
                            {wardrobeName(item) ? `خزانة ${wardrobeName(item)}` : item.colorName}
                          </span>
                        </span>

                        <span className="flex flex-none items-center gap-0.5">
                          <button
                            onClick={() => onReplace(slot.id)}
                            aria-label={`استبدال ${slot.label}`}
                            title="استبدال"
                            className="grid h-7 w-7 place-items-center rounded-sm text-faint opacity-0 transition-all hover:text-ink group-hover:opacity-100 focus-visible:opacity-100"
                          >
                            <Repeat2 size={13} strokeWidth={1.5} aria-hidden />
                          </button>
                          <button
                            onClick={() => remove(item.id)}
                            aria-label={`إزالة ${item.name} من الإطلالة`}
                            title="إزالة من الإطلالة"
                            className="grid h-7 w-7 place-items-center rounded-sm text-faint transition-colors hover:text-ink"
                          >
                            <X size={13} strokeWidth={1.6} aria-hidden />
                          </button>
                        </span>
                      </article>
                    ))}
                  </div>
                </section>
              ))}

            {/* الخانات الفاضية تُعرض كدعوة، مو كفراغ */}
            <section>
              <p className="eyebrow mb-2">أضيفي</p>
              <div className="flex flex-wrap gap-1.5">
                {OUTFIT_SLOTS.filter(
                  (slot) => !slots.find((s) => s.id === slot.id)?.items.length,
                ).map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => onReplace(slot.id)}
                    className="h-7 rounded-full border border-dashed border-line-strong px-3 text-[11px] text-muted transition-colors hover:border-ink hover:text-ink"
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      <div className={cn('flex flex-none flex-col gap-2 border-t border-line p-3')}>
        <Button variant="secondary" size="sm" block onClick={onAskStylist}>
          <Sparkles size={13} strokeWidth={1.5} aria-hidden />
          اسألي دولابي
        </Button>
        {items.length > 0 && (
          <button
            onClick={clear}
            className="text-[11.5px] text-muted transition-colors hover:text-ink"
          >
            تفريغ الإطلالة
          </button>
        )}
      </div>
    </div>
  )
}
