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

  /*
    القياسات **ما تعيش هنا**.
    مصدرها الوحيد `useAiModels`: الموديل المحفوظ يملك قياساته بمعرّفه، ويقرأها
    الاستوديو وصفحة «موديلاتي» من نفس المكان. نسخة ثانية هنا كانت تعني مصدرين
    يتفارقان — تعدّلين من صفحة وما يظهر في الأخرى — وتربط القياسات بحالة
    الإطلالة، فتضيع مع أي تفريغ للاختيار.
  */

  add: (itemId: string) => void
  remove: (itemId: string) => void
  toggle: (itemId: string) => void
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
      version: 3,
      /*
        نسخة ١: ما تعرف الاقتراحات — تأخذ الافتراضي بدل ما تُهمل الحالة كلها.
        نسخة ٣: `bodyParameters` انتقلت لبيانات الموديل، فتُسقَط من هنا. القيمة
        القديمة لا تُنقَل: المخزن ما يقدر يكتب في مخزن آخر أثناء الهجرة، والقياس
        يُعاد إدخاله مرة من «تعديل الموديل».
      */
      migrate: (state, from) => {
        const { bodyParameters: _dropped, ...rest } = state as StudioState & {
          bodyParameters?: unknown
        }
        return from >= 2
          ? (rest as StudioState)
          : { ...(rest as StudioState), suggestionsHeight: SUGGESTIONS_DEFAULT_HEIGHT, suggestionsOpen: true }
      },
    },
  ),
)

/** هل الاستوديو في وضع التركيز الآن؟ */
export const useFocusMode = (): boolean =>
  useStudio((s) => !s.wardrobePanelOpen && !s.outfitPanelOpen)
