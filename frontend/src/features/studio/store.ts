/**
 * حالة الاستوديو.
 *
 * قسمان: **الإطلالة الحالية** (وش يلبس الموديل)، و**تفضيلات مساحة العمل**
 * (اللوحات والخزانة والفئة). كلاهما يُحفظ، فالمستخدمة ترجع للاستوديو كما
 * تركته بدل ما يعيد نفسه من الصفر كل مرة.
 *
 * الإطلالة منفصلة عن الخزانة نفسها — التنسيق ما يعدّل الدولاب أبدًا.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  SUGGESTIONS_DEFAULT_HEIGHT,
  clampSuggestionsHeight,
  isFocusMode,
  toggleFocus,
  type PanelState,
} from '@/domain/studio'
import { storageKey } from '@/infrastructure/storage'

/** «كل ملابسي» — تنسيق من كل الخزائن مو من وحدة (متطلب ٧). */
export const ALL_WARDROBES = 'all'

export type PreviewStatus = 'empty' | 'ready' | 'generating' | 'generated' | 'stale'

type StudioState = {
  /** معرّفات القطع المختارة، بترتيب الإضافة */
  selection: string[]

  wardrobePanelOpen: boolean
  outfitPanelOpen: boolean
  /** آخر وضع قبل التركيز — يُرجَّع عند الخروج منه */
  beforeFocus: PanelState

  activeWardrobeId: string
  activeCategory: string

  /** ارتفاع شريط الاقتراحات بالبكسل — تتحكم فيه المستخدمة بالسحب */
  suggestionsHeight: number
  suggestionsOpen: boolean

  add: (itemId: string) => void
  remove: (itemId: string) => void
  toggle: (itemId: string) => void
  /** يضيف قطعة ويشيل ما يتعارض معها — تُنادى بعد تأكيد المستخدمة */
  replaceWith: (itemId: string, removeIds: string[]) => void
  replaceAll: (itemIds: string[]) => void
  clear: () => void
  has: (itemId: string) => boolean

  setWardrobePanel: (open: boolean) => void
  setOutfitPanel: (open: boolean) => void
  toggleFocusMode: () => void
  setActiveWardrobe: (id: string) => void
  setActiveCategory: (slot: string) => void
  setSuggestionsHeight: (height: number) => void
  toggleSuggestions: () => void
}

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      selection: [],
      wardrobePanelOpen: true,
      outfitPanelOpen: true,
      beforeFocus: { wardrobeOpen: true, outfitOpen: true },
      activeWardrobeId: ALL_WARDROBES,
      activeCategory: 'all',
      suggestionsHeight: SUGGESTIONS_DEFAULT_HEIGHT,
      suggestionsOpen: true,

      add: (itemId) =>
        set((s) => (s.selection.includes(itemId) ? s : { selection: [...s.selection, itemId] })),

      remove: (itemId) => set((s) => ({ selection: s.selection.filter((id) => id !== itemId) })),

      toggle: (itemId) =>
        set((s) => ({
          selection: s.selection.includes(itemId)
            ? s.selection.filter((id) => id !== itemId)
            : [...s.selection, itemId],
        })),

      replaceWith: (itemId, removeIds) =>
        set((s) => {
          const kept = s.selection.filter((id) => !removeIds.includes(id))
          return { selection: kept.includes(itemId) ? kept : [...kept, itemId] }
        }),

      replaceAll: (itemIds) => set({ selection: itemIds }),
      clear: () => set({ selection: [] }),
      has: (itemId) => get().selection.includes(itemId),

      setWardrobePanel: (open) => set({ wardrobePanelOpen: open }),
      setOutfitPanel: (open) => set({ outfitPanelOpen: open }),

      toggleFocusMode: () =>
        set((s) => {
          const current: PanelState = {
            wardrobeOpen: s.wardrobePanelOpen,
            outfitOpen: s.outfitPanelOpen,
          }
          const next = toggleFocus(current, s.beforeFocus)
          return {
            wardrobePanelOpen: next.wardrobeOpen,
            outfitPanelOpen: next.outfitOpen,
            // نحفظ الوضع الحالي فقط عند الدخول، مو عند الخروج
            beforeFocus: isFocusMode(current) ? s.beforeFocus : current,
          }
        }),

      setActiveWardrobe: (id) => set({ activeWardrobeId: id }),
      setActiveCategory: (slot) => set({ activeCategory: slot }),

      // السحب يفتح الشريط ضمنيًا: من يسحب يريد أن يرى، لا أن يفتح ثم يسحب
      setSuggestionsHeight: (height) =>
        set({ suggestionsHeight: clampSuggestionsHeight(height), suggestionsOpen: true }),

      toggleSuggestions: () => set((s) => ({ suggestionsOpen: !s.suggestionsOpen })),
    }),
    {
      name: storageKey('studio'),
      version: 2,
      // نسخة ١ ما تعرف الاقتراحات — تأخذ الافتراضي بدل ما تُهمل الحالة كلها
      migrate: (state, from) =>
        from >= 2
          ? (state as StudioState)
          : {
              ...(state as StudioState),
              suggestionsHeight: SUGGESTIONS_DEFAULT_HEIGHT,
              suggestionsOpen: true,
            },
    },
  ),
)

/** هل الاستوديو في وضع التركيز الآن؟ */
export const useFocusMode = (): boolean =>
  useStudio((s) => !s.wardrobePanelOpen && !s.outfitPanelOpen)
