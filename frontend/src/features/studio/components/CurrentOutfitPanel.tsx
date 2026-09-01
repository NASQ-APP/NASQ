/**
 * لوحة الإطلالة الحالية — العمود الأخير.
 *
 * تقرأ الإطلالة كطبقات على الجسم لا كقائمة: خانة لكل موضع بترتيب ثابت.
 * الحذف يشيل القطعة من الإطلالة **لا من الخزانة** — الفرق جوهري.
 *
 * والإضافة والحذف هنا **تحرير اختيار لا أمر توليد**: يشتغلان فورًا بلا نداء
 * للذكاء الاصطناعي، والصورة المولّدة تُعلَّم قديمة وتنتظر أمرًا صريحًا.
 */
import { PanelLeftClose, Plus, Shirt, Sparkles, X } from 'lucide-react'
import { OUTFIT_SLOTS, toSlots } from '@/domain/studio'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { Button } from '@/shared/components/ui'
import { useStudio } from '../store'
import { useWardrobe } from '@/features/wardrobe/store'
import { cn } from '@/shared/lib'
import { APP } from '@/shared/config'
import { useVoice } from '@/features/onboarding/voice'
import type { OutfitSlotId } from '@/domain/studio'
import type { WardrobeItem } from '@/domain/wardrobe'

export function CurrentOutfitPanel({
  showHeader = true,
  items,
  onReplace,
  onAskStylist,
}: {
  showHeader?: boolean
  items: WardrobeItem[]
  /** يفتح الخزانة على فئة الخانة — «استبدال البنطلون» */
  onReplace: (slot: OutfitSlotId) => void
  onAskStylist: () => void
}) {
  const say = useVoice()
  const { remove, clear, setOutfitPanel } = useStudio()
  const wardrobes = useWardrobe((state) => state.wardrobes)
  const slots = toSlots(items)
  const availableSlots = OUTFIT_SLOTS.filter(
    (slot) => !slots.find((current) => current.id === slot.id)?.items.length,
  )

  const wardrobeName = (item: WardrobeItem) =>
    wardrobes.find((wardrobe) => wardrobe.id === item.wardrobeId)?.name

  const selectionSummary =
    items.length === 0
      ? 'ابني إطلالتك قطعة بعد قطعة'
      : items.length === 1
        ? 'قطعة واحدة مختارة'
        : items.length === 2
          ? 'قطعتان مختارتان'
          : items.length <= 10
            ? `${items.length} قطع مختارة`
            : `${items.length} قطعة مختارة`

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      {showHeader && (
        <header className="flex flex-none items-start justify-between gap-2 px-4 pb-3 pt-4">
          <div>
            <h2 className="text-[14px]">إطلالتك الحالية</h2>
            <p className="mt-1 text-[10.5px] text-faint">{selectionSummary}</p>
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
      )}

      {!showHeader && (
        <p className="flex-none px-4 pb-3 text-[10.5px] text-faint">{selectionSummary}</p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg bg-surface px-4 py-9 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-canvas text-faint">
              <Shirt size={18} strokeWidth={1.3} aria-hidden />
            </span>
            <p className="mt-3 text-[12.5px]">إطلالتك بانتظار أول قطعة</p>
            <p className="mt-1 max-w-[210px] text-[11px] leading-6 text-muted">
              {say('اختاري من خزانتي أو اسحبي القطعة مباشرة على الموديل.', 'اختر من خزانتي أو اسحب القطعة مباشرة على الموديل.')}
            </p>
            <Button className="mt-4" variant="secondary" size="sm" onClick={() => onReplace('top')}>
              تصفح القطع
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {slots
              .filter((slot) => slot.items.length > 0)
              .map((slot) => (
                <section key={slot.id} aria-labelledby={`outfit-slot-${slot.id}`}>
                  <div className="mb-2 flex min-h-9 items-center gap-2">
                    <h3 id={`outfit-slot-${slot.id}`} className="text-[12.5px] font-medium">
                      {slot.label}
                    </h3>
                    <span
                      className="lat text-[10px] text-faint"
                      aria-label={`${slot.items.length} من القطع`}
                    >
                      {slot.items.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => onReplace(slot.id)}
                      aria-label={`إضافة قطعة أخرى إلى ${slot.label}`}
                      title="إضافة قطعة أخرى"
                      className="mr-auto flex min-h-10 items-center gap-1 rounded-md px-2 text-[10.5px] text-muted transition-colors hover:bg-surface hover:text-ink"
                    >
                      <Plus size={13} strokeWidth={1.7} aria-hidden />
                      <span>إضافة أخرى</span>
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-md border border-line bg-surface">
                    {slot.items.map((item) => (
                      <article
                        key={item.id}
                        className="group flex min-h-[64px] items-center gap-3 border-b border-line px-2.5 py-2 last:border-b-0 hover:bg-surface-warm"
                      >
                        <span className="grid h-11 w-11 flex-none place-items-center overflow-hidden rounded-sm bg-canvas">
                          <ItemImage item={item} className="h-[84%] w-[84%]" />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] leading-5">{item.name}</span>
                          <span className="mt-0.5 block truncate text-[10.5px] leading-4 text-faint">
                            {wardrobeName(item) ? `خزانة ${wardrobeName(item)}` : item.colorName}
                          </span>
                        </span>

                        <button
                          type="button"
                          onClick={() => remove(item.id)}
                          aria-label={`إزالة ${item.name} من الإطلالة`}
                          title="إزالة من الإطلالة"
                          className="grid h-10 w-10 flex-none place-items-center rounded-md text-faint transition-colors hover:bg-canvas hover:text-ink"
                        >
                          <X size={14} strokeWidth={1.6} aria-hidden />
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              ))}

            {/* الخانات الفاضية تُعرض كدعوة، مو كفراغ */}
            {availableSlots.length > 0 && (
              <section aria-labelledby="complete-outfit-title">
                <div className="mb-2">
                  <h3 id="complete-outfit-title" className="text-[12.5px] font-medium">
                    أكملي الإطلالة
                  </h3>
                  <p className="mt-0.5 text-[10.5px] text-faint">
                    {say('اختاري الفئة التي تبين تضيفينها', 'اختر الفئة التي تبي تضيفها')}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {availableSlots.map((slot) => (
                    <button
                      type="button"
                      key={slot.id}
                      onClick={() => onReplace(slot.id)}
                      className="flex min-h-10 items-center gap-2 rounded-md border border-dashed border-line-strong px-2.5 text-right text-[10.5px] leading-4 text-muted transition-colors hover:border-ink hover:bg-surface hover:text-ink"
                    >
                      <Plus size={13} strokeWidth={1.6} className="flex-none" aria-hidden />
                      {slot.label}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <div className={cn('flex flex-none flex-col gap-2 border-t border-line p-3')}>
        <Button variant="secondary" size="sm" block onClick={onAskStylist}>
          <Sparkles size={13} strokeWidth={1.5} aria-hidden />
          {say('اسألي', 'اسأل')} {APP.shortName}
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
