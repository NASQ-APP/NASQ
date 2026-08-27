/**
 * لوحة الخزانة — العمود الأول.
 *
 * تحمل الخزانة الحقيقية للمستخدمة: اختيار الخزانة، بحث، فلاتر، فئات، وشبكة
 * القطع. تُطوى لشريط رفيع بدل ما تختفي، فيبقى الرجوع لها بضغطة.
 */
import { useMemo, useRef, useState } from 'react'
import { ChevronDown, Filter, Heart, PanelRightClose, Plus, Search, X } from 'lucide-react'
import { ALL_WARDROBES, useStudio } from '../store'
import { ClothingCard } from './ClothingCard'
import { useWardrobe } from '@/features/wardrobe/store'
import { Button, EmptyState } from '@/shared/components/ui'
import { SLOT_FILTERS, matchesQuery, ownedItems, slotOfItem } from '@/domain/wardrobe'
import { cn } from '@/shared/lib'
import type { WardrobeItem } from '@/domain/wardrobe'

export function WardrobePanel({
  onPick,
  onAddItem,
  onDragStateChange,
}: {
  onPick: (item: WardrobeItem) => void
  onAddItem: () => void
  onDragStateChange: (dragging: boolean) => void
}) {
  const { wardrobes, items } = useWardrobe()
  const {
    selection,
    activeWardrobeId,
    activeCategory,
    setActiveWardrobe,
    setActiveCategory,
    setWardrobePanel,
  } = useStudio()

  const [query, setQuery] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [favouritesOnly, setFavouritesOnly] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)

  const owned = useMemo(() => ownedItems(items), [items])
  const activeWardrobe = wardrobes.find((w) => w.id === activeWardrobeId)
  const showingAll = activeWardrobeId === ALL_WARDROBES

  const visible = useMemo(() => {
    let pool = showingAll ? owned : owned.filter((item) => item.wardrobeId === activeWardrobeId)
    if (activeCategory !== 'all') pool = pool.filter((item) => slotOfItem(item) === activeCategory)
    if (favouritesOnly) pool = pool.filter((item) => item.favorite)
    if (query.trim()) {
      pool = pool.filter((item) => matchesQuery(`${item.name} ${item.colorName} ${item.brand ?? ''}`, query))
    }
    return pool
  }, [owned, showingAll, activeWardrobeId, activeCategory, favouritesOnly, query])

  const wardrobeNameFor = (item: WardrobeItem) =>
    showingAll ? wardrobes.find((w) => w.id === item.wardrobeId)?.name : undefined

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-line bg-canvas">
      {/* ---------------- ترويسة ---------------- */}
      <header className="flex flex-none items-center justify-between gap-2 px-4 pb-3 pt-4">
        <h2 className="text-[14px]">خزانتي</h2>
        <button
          onClick={() => setWardrobePanel(false)}
          aria-label="طيّ خزانتي"
          title="طيّ خزانتي"
          className="grid h-8 w-8 place-items-center rounded-md text-faint transition-colors hover:bg-surface hover:text-ink"
        >
          <PanelRightClose size={15} strokeWidth={1.5} aria-hidden />
        </button>
      </header>

      {/* ---------------- اختيار الخزانة ---------------- */}
      <div className="relative flex-none px-4">
        <button
          onClick={() => setPickerOpen((open) => !open)}
          aria-expanded={pickerOpen}
          className="flex h-9 w-full items-center justify-between rounded-md border border-line px-3 text-[12.5px] transition-colors hover:border-line-strong"
        >
          {showingAll ? 'كل ملابسي' : `خزانة ${activeWardrobe?.name ?? ''}`}
          <ChevronDown size={14} strokeWidth={1.5} aria-hidden className="text-faint" />
        </button>

        {pickerOpen && (
          <div className="absolute inset-x-4 top-11 z-20 overflow-hidden rounded-md border border-line bg-canvas py-1 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.35)]">
            {[{ id: ALL_WARDROBES, name: 'كل ملابسي' }, ...wardrobes].map((wardrobe) => (
              <button
                key={wardrobe.id}
                onClick={() => {
                  setActiveWardrobe(wardrobe.id)
                  setPickerOpen(false)
                }}
                className={cn(
                  'block w-full px-3 py-2 text-right text-[12.5px] transition-colors hover:bg-surface',
                  wardrobe.id === activeWardrobeId ? 'text-ink' : 'text-muted',
                )}
              >
                {wardrobe.id === ALL_WARDROBES ? wardrobe.name : `خزانة ${wardrobe.name}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---------------- بحث وفلاتر ---------------- */}
      <div className="relative mt-2 flex flex-none items-center gap-2 px-4">
        <span className="flex h-9 flex-1 items-center gap-2 rounded-md border border-line px-3 focus-within:border-ink">
          <Search size={14} strokeWidth={1.5} aria-hidden className="flex-none text-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحثي في خزانتك…"
            aria-label="ابحثي في خزانتك"
            className="w-full bg-transparent text-[12px] outline-none placeholder:text-faint"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="مسح البحث"
              className="flex-none text-faint transition-colors hover:text-ink"
            >
              <X size={13} strokeWidth={1.6} aria-hidden />
            </button>
          )}
        </span>

        <button
          onClick={() => setFiltersOpen((open) => !open)}
          aria-label="فلاتر"
          aria-expanded={filtersOpen}
          className={cn(
            'grid h-9 w-9 flex-none place-items-center rounded-md border transition-colors',
            favouritesOnly ? 'border-ink bg-ink text-white' : 'border-line text-muted hover:border-line-strong',
          )}
        >
          <Filter size={14} strokeWidth={1.5} aria-hidden />
        </button>

        {filtersOpen && (
          <div className="absolute left-4 top-11 z-20 w-44 rounded-md border border-line bg-canvas p-1 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.35)]">
            <button
              onClick={() => {
                setFavouritesOnly((only) => !only)
                setFiltersOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-right text-[12px] text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <Heart
                size={13}
                strokeWidth={1.5}
                aria-hidden
                className={favouritesOnly ? 'fill-ink text-ink' : ''}
              />
              المفضلة فقط
            </button>
          </div>
        )}
      </div>

      {/* ---------------- الفئات ---------------- */}
      <div className="relative mt-3 flex-none">
        <div
          ref={tabsRef}
          className="flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {SLOT_FILTERS.map((filter) => (
            <button
              key={filter.slot}
              onClick={() => setActiveCategory(filter.slot)}
              aria-pressed={activeCategory === filter.slot}
              className={cn(
                'h-7 flex-none rounded-full border px-3 text-[11px] transition-colors duration-[250ms]',
                activeCategory === filter.slot
                  ? 'border-ink bg-ink text-white'
                  : 'border-line text-muted hover:border-line-strong hover:text-ink',
              )}
            >
              {filter.name}
            </button>
          ))}
        </div>
        {/* تلميح بصري إن فيه فئات أبعد */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-l from-canvas to-transparent"
        />
      </div>

      {/* ---------------- الشبكة ---------------- */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
        {visible.length === 0 ? (
          <EmptyState
            title={owned.length === 0 ? 'خزانتك فاضية.' : 'ما لقينا قطعة.'}
            body={
              owned.length === 0
                ? 'صوّري أول قطعة وابدئي التنسيق.'
                : 'جرّبي كلمة ثانية أو غيّري الفئة.'
            }
            action={owned.length === 0 ? <Button onClick={onAddItem}>إضافة قطعة</Button> : undefined}
          />
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {visible.map((item) => (
              <ClothingCard
                key={item.id}
                item={item}
                wardrobeName={wardrobeNameFor(item)}
                selected={selection.includes(item.id)}
                onPick={() => onPick(item)}
                onDragStateChange={onDragStateChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* ---------------- إضافة ---------------- */}
      <div className="flex-none border-t border-line p-3">
        <button
          onClick={onAddItem}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-dashed border-line-strong text-[12px] text-muted transition-colors hover:border-ink hover:text-ink"
        >
          <Plus size={14} strokeWidth={1.6} aria-hidden />
          إضافة قطعة
        </button>
      </div>
    </div>
  )
}
