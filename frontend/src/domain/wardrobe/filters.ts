/**
 * فلترة وترتيب القطع — منطق نقي بلا حالة ولا React، فيسهل اختباره ونقله للخادم.
 */
import { categoryById, slotOfCategory } from './categories'
import type { BodySlot, ItemFilter, WardrobeItem } from './types'

export const slotOfItem = (item: WardrobeItem): BodySlot => slotOfCategory(item.categoryId)

const matchesSearch = (item: WardrobeItem, needle: string): boolean => {
  const category = categoryById(item.categoryId)
  return [item.name, item.brand, item.colorName, category?.name, category?.nameLatin]
    .join(' ')
    .toLowerCase()
    .includes(needle)
}

const SORTERS: Record<string, (a: WardrobeItem, b: WardrobeItem) => number> = {
  name: (a, b) => a.name.localeCompare(b.name, 'ar'),
  category: (a, b) => a.categoryId.localeCompare(b.categoryId),
  recent: (a, b) => b.addedAt.localeCompare(a.addedAt),
}

export function filterItems(items: WardrobeItem[], filter: ItemFilter = {}): WardrobeItem[] {
  let out = items

  if (filter.slot && filter.slot !== 'all') out = out.filter((i) => slotOfItem(i) === filter.slot)
  if (filter.categoryIds?.length) out = out.filter((i) => filter.categoryIds!.includes(i.categoryId))
  if (filter.colorNames?.length) out = out.filter((i) => filter.colorNames!.includes(i.colorName))
  if (filter.favoritesOnly) out = out.filter((i) => i.favorite)

  const needle = filter.search?.trim().toLowerCase()
  if (needle) out = out.filter((i) => matchesSearch(i, needle))

  return out.toSorted(SORTERS[filter.sort ?? 'recent'])
}

/** قطع الخزانة فقط — تستثني قطع التجربة (المبدأ ١). */
export const ownedItems = (items: WardrobeItem[]): WardrobeItem[] =>
  items.filter((i) => i.source === 'wardrobe')

/** قطع التجربة فقط. */
export const tryItems = (items: WardrobeItem[]): WardrobeItem[] =>
  items.filter((i) => i.source === 'try')
