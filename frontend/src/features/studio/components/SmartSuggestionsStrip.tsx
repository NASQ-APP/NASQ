/**
 * شريط الاقتراحات تحت لوحة الموديل.
 *
 * المستخدمة تتحكّم بمساحته: تسحب حافته العليا لتوسّعه أو تصغّره، وتطويه كله
 * لما تبي الموديل وحده. وفوق حدّ معيّن يتحوّل من صف أفقي إلى شبكة بطاقات
 * تشرح **ليش** اقترحنا كل إطلالة — التوسيع يعطي معلومة أكثر، مو نفس الصف
 * مطّاطًا.
 *
 * كل اقتراح من خزانة المستخدمة نفسها (المبدأ ٢).
 */
import { useMemo } from 'react'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { dailyLooks } from '@/features/stylist'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { ResizeHandle } from '@/shared/components/layout'
import { ownedItems } from '@/domain/wardrobe'
import { useWardrobe } from '@/features/wardrobe/store'
import { cn } from '@/shared/lib'
import {
  SUGGESTIONS_MAX_HEIGHT,
  SUGGESTIONS_MIN_HEIGHT,
  SUGGESTIONS_STEP,
  suggestionsView,
} from '@/domain/studio'
import type { DailyLook } from '@/features/stylist'
import type { WardrobeItem } from '@/domain/wardrobe'

export function SmartSuggestionsStrip({
  height,
  open,
  onResize,
  onToggle,
  onApply,
  onAskStylist,
}: {
  height: number
  open: boolean
  onResize: (height: number) => void
  onToggle: () => void
  onApply: (itemIds: string[]) => void
  onAskStylist: () => void
}) {
  const items = useWardrobe((state) => state.items)
  const owned = useMemo(() => ownedItems(items), [items])
  const looks = useMemo(() => dailyLooks(owned), [owned])

  if (looks.length === 0) return null

  const view = suggestionsView(height)

  const pieces = (ids: string[]): WardrobeItem[] =>
    ids
      .map((id) => owned.find((item) => item.id === id))
      .filter((item): item is WardrobeItem => Boolean(item))

  return (
    <section
      aria-label="اقتراحات الإطلالات"
      className="flex flex-none flex-col border-t border-line"
      style={{ height: open ? height : undefined }}
    >
      {open && (
        <ResizeHandle
          label="ارتفاع الاقتراحات"
          value={height}
          min={SUGGESTIONS_MIN_HEIGHT}
          max={SUGGESTIONS_MAX_HEIGHT}
          step={SUGGESTIONS_STEP}
          grow="up"
          onChange={onResize}
          onToggle={onToggle}
        />
      )}

      {/* ---------------- الترويسة ---------------- */}
      <div className={cn('flex flex-none items-center gap-3 px-5', open ? 'pb-1' : 'py-2')}>
        <span className="flex flex-none items-center gap-1.5 text-[11px] text-faint">
          <Sparkles size={12} strokeWidth={1.5} aria-hidden />
          اقتراحات
          <span className="lat">({looks.length})</span>
        </span>

        {/* الصف المضغوط يعيش في الترويسة نفسها عشان ما نهدر ارتفاعًا */}
        {open && view === 'row' ? (
          <LookRow looks={looks} pieces={pieces} onApply={onApply} />
        ) : (
          <span className="min-w-0 flex-1" />
        )}

        <button
          onClick={onAskStylist}
          className="flex-none whitespace-nowrap text-[11.5px] text-muted transition-colors hover:text-ink"
        >
          كل الاقتراحات
        </button>

        <button
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? 'طيّ الاقتراحات' : 'إظهار الاقتراحات'}
          title={open ? 'طيّ الاقتراحات' : 'إظهار الاقتراحات'}
          className="grid h-7 w-7 flex-none place-items-center rounded-sm text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          {open ? (
            <ChevronDown size={14} strokeWidth={1.5} aria-hidden />
          ) : (
            <ChevronUp size={14} strokeWidth={1.5} aria-hidden />
          )}
        </button>
      </div>

      {/* ---------------- الشبكة الموسّعة ---------------- */}
      {open && view === 'grid' && (
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          <ul className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
            {looks.map((look) => (
              <li key={look.occasionId}>
                <button
                  onClick={() => onApply(look.itemIds)}
                  className="flex w-full items-center gap-3 rounded-md border border-line p-2.5 text-right transition-colors duration-[250ms] hover:border-line-strong"
                >
                  <Thumbs items={pieces(look.itemIds)} />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-[12px]">{look.occasionLabel}</span>
                    <span className="line-clamp-2 text-[11px] leading-5 text-faint">
                      {look.reason}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function LookRow({
  looks,
  pieces,
  onApply,
}: {
  looks: DailyLook[]
  pieces: (ids: string[]) => WardrobeItem[]
  onApply: (itemIds: string[]) => void
}) {
  return (
    <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {looks.map((look) => (
        <button
          key={look.occasionId}
          onClick={() => onApply(look.itemIds)}
          title={look.reason}
          className="flex flex-none items-center gap-2.5 rounded-md border border-line px-2.5 py-1.5 transition-colors duration-[250ms] hover:border-line-strong"
        >
          <Thumbs items={pieces(look.itemIds)} />
          <span className="whitespace-nowrap text-[11.5px]">{look.occasionLabel}</span>
        </button>
      ))}
    </div>
  )
}

function Thumbs({ items }: { items: WardrobeItem[] }) {
  return (
    <span className="flex flex-none items-center gap-1">
      {items.slice(0, 3).map((item) => (
        <span
          key={item.id}
          className="grid h-7 w-7 place-items-center overflow-hidden rounded-sm bg-surface"
        >
          <ItemImage item={item} className="h-[78%] w-[78%]" />
        </span>
      ))}
    </span>
  )
}
