/**
 * إلهامات المستخدمة، وخلاصة ذوقها المشتقّة منها.
 *
 * البيانات هنا وصفية فقط: صور ولوحات ألوان ووسوم. ما فيها قطعة تُلبس ولا
 * منتج يُشترى — الإلهام مرجع للستايليست، مب مخزنًا موازيًا للخزانة.
 *
 * صور الرفع تُخزَّن في IndexedDB عبر نفس مخزن صور القطع (`useItemPhotos`)،
 * فما نفتح مخزنًا ثانيًا ولا نحشو `localStorage` ببيانات صور.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storageKey } from '@/infrastructure/storage'
import { EMPTY_STYLE_PROFILE } from '@/domain/style/types'
import { categoryById } from '@/domain/wardrobe'
import { uid } from '@/shared/lib'
import type { ItemColor } from '@/domain/wardrobe'
import type { StyleInspiration, UserStyleProfile } from '@/domain/style/types'

type NewInspiration = Omit<StyleInspiration, 'id' | 'addedAt'>

type InspirationState = {
  inspirations: StyleInspiration[]
  add: (input: NewInspiration) => StyleInspiration
  update: (id: string, patch: Partial<StyleInspiration>) => void
  remove: (id: string) => void
}

export const useInspiration = create<InspirationState>()(
  persist(
    (set) => ({
      inspirations: [],

      add: (input) => {
        const inspiration: StyleInspiration = {
          ...input,
          id: uid('insp'),
          addedAt: new Date().toISOString(),
        }
        set((state) => ({ inspirations: [inspiration, ...state.inspirations] }))
        return inspiration
      },

      update: (id, patch) =>
        set((state) => ({
          inspirations: state.inspirations.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })),

      remove: (id) =>
        set((state) => ({ inspirations: state.inspirations.filter((i) => i.id !== id) })),
    }),
    { name: storageKey('inspiration') },
  ),
)

/* ------------------------- خلاصة الذوق ------------------------- */

const rank = <T,>(values: T[], key: (value: T) => string): T[] => {
  const counts = new Map<string, { value: T; count: number }>()
  for (const value of values) {
    const k = key(value)
    const entry = counts.get(k) ?? { value, count: 0 }
    entry.count += 1
    counts.set(k, entry)
  }
  return [...counts.values()].toSorted((a, b) => b.count - a.count).map((entry) => entry.value)
}

/**
 * يبني ملف الذوق من الإلهامات.
 *
 * محسوب دائمًا، ما يُخزَّن — فما يقدر يتناقض مع ما أضافته المستخدمة أو حذفته.
 */
export function styleProfileOf(inspirations: StyleInspiration[]): UserStyleProfile {
  if (inspirations.length === 0) return EMPTY_STYLE_PROFILE

  const colors: ItemColor[] = inspirations.flatMap((i) => i.palette)
  const tags = inspirations.flatMap((i) => i.tags)
  const categoryIds = inspirations
    .flatMap((i) => i.pieces.map((p) => p.categoryId))
    .filter((id): id is string => Boolean(id) && Boolean(categoryById(id as string)))

  return {
    colors: rank(colors, (c) => c.name).slice(0, 6),
    tags: rank(tags, (t) => t).slice(0, 4),
    categoryIds: rank(categoryIds, (id) => id),
    fromCount: inspirations.length,
  }
}

/** ملف الذوق الحالي — يتحدّث تلقائيًا مع كل إضافة أو حذف. */
export const useStyleProfile = (): UserStyleProfile =>
  styleProfileOf(useInspiration((s) => s.inspirations))
