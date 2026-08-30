/**
 * منسّق الإطلالات الذكي تحت لوحة الموديل.
 *
 * يركّب اقتراحاته من خزانة المستخدمة وحدها، ويراعي المناسبة وذوقها المشتق
 * من «إلهامي». كل اقتراح قابل للتطبيق مباشرة، والمساحة قابلة للطي والتوسيع
 * عشان يبقى الموديل هو بطل الاستوديو.
 */
import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, MessageCircleMore, Sparkles } from 'lucide-react'
import { colorPairingFor, suggest } from '@/features/stylist'
import { useStyleProfile } from '@/features/try-pieces/taste'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { ResizeHandle } from '@/shared/components/layout'
import { colorByName, ownedItems } from '@/domain/wardrobe'
import { useWardrobe } from '@/features/wardrobe/store'
import { cn } from '@/shared/lib'
import {
  SUGGESTIONS_MAX_HEIGHT,
  SUGGESTIONS_MIN_HEIGHT,
  SUGGESTIONS_STEP,
  suggestionsView,
} from '@/domain/studio'
import type { StylistLook } from '@/features/stylist'
import type { WardrobeItem } from '@/domain/wardrobe'

const BASE_MODES = [
  { id: 'daily', label: 'يومي مرتب', prompt: 'نسّقي لي إطلالة كاجوال مرتبة لليوم' },
  { id: 'work', label: 'دوام وجامعة', prompt: 'نسّقي لي إطلالة عملية ومرتبة للعمل أو الجامعة' },
  { id: 'event', label: 'مناسبة', prompt: 'نسّقي لي إطلالة أنيقة لمناسبة مسائية' },
  { id: 'travel', label: 'سفر', prompt: 'نسّقي لي إطلالة مريحة ومرتبة للسفر' },
] as const

const PAIR_MODE = {
  id: 'pair',
  label: 'نسّقي حول قطعة',
  prompt: 'وش يناسب القطعة المختارة؟',
} as const

const PAIRING_MIN_HEIGHT = 180

export function SmartSuggestionsStrip({
  height,
  open,
  selectedIds,
  onResize,
  onToggle,
  onApply,
  onAskStylist,
  onAddItem,
}: {
  height: number
  open: boolean
  selectedIds: string[]
  onResize: (height: number) => void
  onToggle: () => void
  onApply: (itemIds: string[]) => void
  onAskStylist: () => void
  onAddItem: () => void
}) {
  const items = useWardrobe((state) => state.items)
  const style = useStyleProfile()
  const [modeId, setModeId] = useState<string>(BASE_MODES[0].id)
  const [pairItemId, setPairItemId] = useState<string>()

  const owned = useMemo(() => ownedItems(items), [items])
  const ownedIds = useMemo(() => new Set(owned.map((item) => item.id)), [owned])
  const selectedOwnedIds = useMemo(
    () => selectedIds.filter((id) => ownedIds.has(id)),
    [selectedIds, ownedIds],
  )
  const modes = owned.length > 0 ? [...BASE_MODES, PAIR_MODE] : BASE_MODES
  const activeMode = modes.find((mode) => mode.id === modeId) ?? BASE_MODES[0]
  const isPairing = activeMode.id === PAIR_MODE.id
  const pairingItem =
    owned.find((item) => item.id === pairItemId) ??
    selectedOwnedIds.toReversed().map((id) => owned.find((item) => item.id === id)).find(Boolean) ??
    owned[0]
  const pairingIds = isPairing && pairingItem ? [pairingItem.id] : selectedOwnedIds

  const answer = suggest(activeMode.prompt, owned, pairingIds, style)
  const looks: StylistLook[] =
    answer.looks.length > 0
      ? answer.looks
      : answer.pieces.length > 0
        ? [
            {
              title: 'تكملة اختيارك',
              reason: answer.message,
              itemIds: [...new Set([...selectedOwnedIds, ...answer.pieces])],
            },
          ]
        : []

  const view = suggestionsView(height)

  const pieces = (ids: string[]): WardrobeItem[] =>
    ids
      .map((id) => owned.find((item) => item.id === id))
      .filter((item): item is WardrobeItem => Boolean(item))

  return (
    <section
      aria-label="منسّق الإطلالات الذكي"
      className="flex flex-none flex-col border-t border-line bg-canvas"
      style={{ height: open ? height : undefined }}
    >
      {open && (
        <ResizeHandle
          label="ارتفاع منسّق الإطلالات"
          value={height}
          min={isPairing ? PAIRING_MIN_HEIGHT : SUGGESTIONS_MIN_HEIGHT}
          max={SUGGESTIONS_MAX_HEIGHT}
          step={SUGGESTIONS_STEP}
          grow="up"
          onChange={onResize}
          onToggle={onToggle}
        />
      )}

      <div className={cn('flex flex-none items-center gap-2 px-4', open ? 'pb-2 pt-1' : 'py-2')}>
        <span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-ink text-white">
          <Sparkles size={14} strokeWidth={1.6} aria-hidden />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[11.5px] font-medium">منسّق الإطلالات الذكي</span>
            <span className="lat rounded-sm bg-surface px-1.5 text-[8.5px] text-muted">AI</span>
          </span>
          <span className="hidden truncate text-[10px] text-faint xl:block">
            يراعي المناسبة وذوقك، ويختار من خزانتك فقط
          </span>
        </span>

        {open && (
          <label className="relative flex-none">
            <span className="sr-only">نوع الإطلالة</span>
            <select
              value={activeMode.id}
              onChange={(event) => {
                const nextMode = event.target.value
                setModeId(nextMode)
                if (nextMode === PAIR_MODE.id && height < PAIRING_MIN_HEIGHT) {
                  onResize(PAIRING_MIN_HEIGHT)
                }
              }}
              className="h-9 max-w-[142px] appearance-none rounded-md border border-line bg-canvas py-0 pe-2.5 ps-7 text-[10.5px] text-ink outline-none transition-colors hover:border-line-strong focus:border-ink"
            >
              {modes.map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {mode.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              strokeWidth={1.6}
              aria-hidden
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-faint"
            />
          </label>
        )}

        <button
          type="button"
          onClick={onAskStylist}
          aria-label="اطلبي تنسيقًا مخصصًا"
          title="تنسيق مخصص"
          className="grid h-9 w-9 flex-none place-items-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <MessageCircleMore size={14} strokeWidth={1.5} aria-hidden />
        </button>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? 'طيّ منسّق الإطلالات' : 'إظهار منسّق الإطلالات'}
          title={open ? 'طيّ المنسّق' : 'إظهار المنسّق'}
          className="grid h-9 w-9 flex-none place-items-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          {open ? (
            <ChevronDown size={14} strokeWidth={1.5} aria-hidden />
          ) : (
            <ChevronUp size={14} strokeWidth={1.5} aria-hidden />
          )}
        </button>
      </div>

      {open && isPairing && pairingItem && (
        <PairingBrief
          item={pairingItem}
          items={owned}
          onChange={setPairItemId}
        />
      )}

      {open && looks.length === 0 && (
        <EmptySuggestions
          hasItems={owned.length > 0}
          message={answer.gap ?? answer.message}
          onAddItem={onAddItem}
          onAskStylist={onAskStylist}
        />
      )}

      {open && looks.length > 0 && view === 'row' && (
        <div className="min-h-0 px-4 pb-3" aria-live="polite">
          <LookRow looks={looks} pieces={pieces} onApply={onApply} />
        </div>
      )}

      {open && looks.length > 0 && view === 'grid' && (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4" aria-live="polite">
          <ul className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
            {looks.map((look, index) => (
              <li key={`${look.title}-${index}`}>
                <button
                  type="button"
                  onClick={() => onApply(look.itemIds)}
                  aria-label={`تطبيق الخيار ${index + 1} — ${look.itemIds.length} قطع`}
                  className="flex w-full items-center gap-3 rounded-md bg-surface p-2.5 text-right transition-colors duration-[250ms] hover:bg-surface-warm"
                >
                  <Thumbs items={pieces(look.itemIds)} />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-[12px]">الخيار {index + 1}</span>
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

function PairingBrief({
  item,
  items,
  onChange,
}: {
  item: WardrobeItem
  items: WardrobeItem[]
  onChange: (itemId: string) => void
}) {
  const advice = colorPairingFor(item)

  return (
    <div className="flex flex-none items-center gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <span className="grid h-10 w-10 flex-none place-items-center overflow-hidden rounded-md bg-surface">
        <ItemImage item={item} className="h-[82%] w-[82%]" />
      </span>

      <label className="flex flex-none items-center gap-2">
        <span className="whitespace-nowrap text-[10px] text-faint">القطعة الأساسية</span>
        <span className="relative">
          <select
            aria-label="القطعة الأساسية"
            value={item.id}
            onChange={(event) => onChange(event.target.value)}
            className="h-9 max-w-[170px] appearance-none rounded-md border border-line bg-canvas py-0 pe-2.5 ps-7 text-[10.5px] text-ink outline-none transition-colors hover:border-line-strong focus:border-ink"
          >
            {items.map((ownedItem) => (
              <option key={ownedItem.id} value={ownedItem.id}>
                {ownedItem.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            strokeWidth={1.6}
            aria-hidden
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-faint"
          />
        </span>
      </label>

      <span className="h-7 w-px flex-none bg-line" aria-hidden />

      <div className="flex flex-none items-center gap-2" aria-label={advice.message}>
        <span className="whitespace-nowrap text-[10px] text-faint">ألوان تناسبها</span>
        {advice.colors.slice(0, 5).map((colorName) => (
          <span
            key={colorName}
            title={colorName}
            className="flex flex-none items-center gap-1 text-[9.5px] text-muted"
          >
            <span
              className="h-3.5 w-3.5 rounded-full border border-black/10"
              style={{ backgroundColor: colorByName(colorName).hex }}
              aria-hidden
            />
            <span className="whitespace-nowrap">{colorName}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function EmptySuggestions({
  hasItems,
  message,
  onAddItem,
  onAskStylist,
}: {
  hasItems: boolean
  message: string
  onAddItem: () => void
  onAskStylist: () => void
}) {
  return (
    <div className="flex min-h-0 items-center gap-3 px-4 pb-3">
      <p className="min-w-0 flex-1 truncate text-[10.5px] text-faint">{message}</p>
      <button
        type="button"
        onClick={hasItems ? onAskStylist : onAddItem}
        className="h-9 flex-none rounded-md border border-line px-3 text-[10.5px] text-muted transition-colors hover:border-line-strong hover:text-ink"
      >
        {hasItems ? 'اطلبي تنسيقًا' : 'أضيفي قطعًا'}
      </button>
    </div>
  )
}

function LookRow({
  looks,
  pieces,
  onApply,
}: {
  looks: StylistLook[]
  pieces: (ids: string[]) => WardrobeItem[]
  onApply: (itemIds: string[]) => void
}) {
  return (
    <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {looks.map((look, index) => (
        <button
          type="button"
          key={`${look.title}-${index}`}
          onClick={() => onApply(look.itemIds)}
          aria-label={`تطبيق الخيار ${index + 1} — ${look.itemIds.length} قطع`}
          title={look.reason}
          className="flex h-10 flex-none items-center gap-2.5 rounded-md bg-surface px-2.5 transition-colors duration-[250ms] hover:bg-surface-warm"
        >
          <Thumbs items={pieces(look.itemIds)} />
          <span className="whitespace-nowrap text-[11.5px]">الخيار {index + 1}</span>
          <span className="lat text-[9.5px] text-faint">{look.itemIds.length}</span>
        </button>
      ))}
    </div>
  )
}

function Thumbs({ items }: { items: WardrobeItem[] }) {
  return (
    <span className="flex flex-none items-center gap-1">
      {items.slice(0, 4).map((item) => (
        <span
          key={item.id}
          className="grid h-7 w-7 place-items-center overflow-hidden rounded-sm bg-canvas"
        >
          <ItemImage item={item} className="h-[78%] w-[78%]" />
        </span>
      ))}
    </span>
  )
}
