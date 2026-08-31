/**
 * الخزانة — المصدر الوحيد للحقيقة في التطبيق كله.
 *
 * تعيش على الخادم: كل صفّ مملوك لمستخدمة وتحميه RLS، فما تشوف وحدة خزانة
 * غيرها. كل ما بعدها (الاستوديو، الستايليست، السفر، الإطلالات) يقرأ القطع
 * من هنا.
 *
 * **الكتابة متفائلة**: نغيّر الحالة في اللحظة ثم نرسل للخادم، فالواجهة ما
 * تتجمّد بانتظار شبكة. ولو رفض الخادم نرجّع القراءة من عنده ونقول للمستخدمة —
 * الأسوأ من التأخير أن تظن إن شغلها انحفظ وهو ضاع.
 *
 * **ما نحفظ نسخة محلية مع الخادم**: نسختان تختلفان، والأسوأ إن متصفّحًا
 * مشتركًا يعرض خزانة الأولى للثانية قبل ما تصل القراءة. بلا خادم (تطوير بلا
 * مفاتيح) يشتغل الحفظ المحلي كما كان.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storageKey } from '@/infrastructure/storage'
import { hasBackend } from '@/shared/config'
import { stamp, uid, uuid } from '@/shared/lib'
import { toast } from '@/shared/components/ui'
import * as remote from '@/infrastructure/wardrobe/repository'
import { useItemPhotos } from './photos'
import type { Wardrobe, WardrobeItem } from '@/domain/wardrobe'

/** المعرّف من القاعدة `uuid`، ومن غيرها بادئة مقروءة تكفي التطوير المحلي. */
const newId = (prefix: string) => (hasBackend() ? uuid() : uid(prefix))

export type SyncStatus = 'idle' | 'loading' | 'ready' | 'error'

type WardrobeState = {
  wardrobes: Wardrobe[]
  items: WardrobeItem[]
  status: SyncStatus

  /** يقرأ خزانة المستخدمة من الخادم — يُستدعى بعد ما تُحسم الجلسة. */
  load: () => Promise<void>
  /** ينسى ما في الذاكرة عند الخروج، فما تتسرّب خزانة لمستخدمة بعدها. */
  reset: () => void

  createWardrobe: (name: string, nameLatin?: string) => Wardrobe
  renameWardrobe: (id: string, name: string, nameLatin?: string) => void
  deleteWardrobe: (id: string) => void

  addItem: (item: Omit<WardrobeItem, 'id' | 'addedAt' | 'favorite'>) => WardrobeItem
  updateItem: (id: string, patch: Partial<WardrobeItem>) => void
  moveItem: (id: string, wardrobeId: string) => void
  deleteItem: (id: string) => void
  toggleFavorite: (id: string) => void

  /** يحذف كل القطع ويبقي الخزائن بأسمائها */
  clearItems: () => void
  /** يحذف القطع والخزائن معًا */
  clearAll: () => void
}

const EMPTY = { wardrobes: [] as Wardrobe[], items: [] as WardrobeItem[] }

export const useWardrobe = create<WardrobeState>()(
  persist(
    (set, get) => {
      /**
       * طابور الكتابة — طلب واحد في كل لحظة، بترتيب ما فعلته المستخدمة.
       *
       * التوازي يكسر المراجع: تضيف قطعة لخزانة أنشأتها قبل ثانية، فيسبق
       * ربط القطعة وصول الخزانة ويرفض المفتاح الأجنبي. الطابور يجعل ترتيب الخادم
       * هو نفس ترتيب الشاشة.
       */
      let queue: Promise<void> = Promise.resolve()

      /**
       * يرسل التغيير للخادم بعد ما رُسم محليًا.
       *
       * الفشل ما يُبتلع: نعيد القراءة من الخادم فتصير الشاشة صادقة، ونقول
       * للمستخدمة بدل ما تكتشف الضياع بعد أسبوع.
       */
      const push = (action: () => Promise<void>, whatFailed: string) => {
        if (!hasBackend()) return
        queue = queue.then(action).catch(() => {
          toast.error(`ما قدرنا نحفظ ${whatFailed} على الخادم — رجّعنا آخر نسخة محفوظة.`)
          return get().load()
        })
      }

      return {
        ...EMPTY,
        status: 'idle',

        load: async () => {
          if (!hasBackend()) {
            set({ status: 'ready' })
            return
          }

          set({ status: 'loading' })
          try {
            const snapshot = await remote.fetchWardrobe()
            set({ ...snapshot, status: 'ready' })
            void useItemPhotos.getState().hydrate()
          } catch {
            set({ status: 'error' })
          }
        },

        reset: () => set({ ...EMPTY, status: 'idle' }),

        createWardrobe: (name, nameLatin) => {
          const wardrobe: Wardrobe = {
            id: newId('w'),
            name: name.trim(),
            nameLatin: nameLatin?.trim() || 'Wardrobe',
            createdAt: stamp(),
            updatedAt: stamp(),
          }
          const sortOrder = get().wardrobes.length
          set((state) => ({ wardrobes: [...state.wardrobes, wardrobe] }))
          push(() => remote.insertWardrobe(wardrobe, sortOrder), 'الخزانة')
          return wardrobe
        },

        renameWardrobe: (id, name, nameLatin) => {
          set((state) => ({
            wardrobes: state.wardrobes.map((w) =>
              w.id === id
                ? { ...w, name, nameLatin: nameLatin ?? w.nameLatin, updatedAt: stamp() }
                : w,
            ),
          }))
          push(() => remote.renameWardrobe(id, name, nameLatin), 'اسم الخزانة')
        },

        /** حذف الخزانة لا يحذف قطعها أبدًا — تنتقل لأول خزانة متبقية. */
        deleteWardrobe: (id) => {
          const fallback = get().wardrobes.find((w) => w.id !== id)?.id ?? null
          set((state) => ({
            wardrobes: state.wardrobes.filter((w) => w.id !== id),
            items: state.items.map((item) =>
              item.wardrobeId === id ? { ...item, wardrobeId: fallback } : item,
            ),
          }))
          push(() => remote.deleteWardrobe(id, fallback), 'حذف الخزانة')
        },

        addItem: (input) => {
          /*
            أول قطعة وما فيه خزانة بعد: نفتح لها واحدة باسمها.

            التطبيق يبدأ فاضيًا عمدًا — ما نحشو خزائن ما طلبتها أحد. لكن قطعة بلا
            خزانة تضيع من صفحة الخزائن، فأول إضافة تصنع المكان اللي تقعد فيه — وتقدر
            تغيّر اسمها أو تضيف عليها بعدين.
          */
          let wardrobeId = input.wardrobeId
          if (input.source === 'wardrobe' && !wardrobeId && get().wardrobes.length === 0) {
            wardrobeId = get().createWardrobe('خزانتي', 'My closet').id
          }

          const item: WardrobeItem = {
            ...input,
            wardrobeId,
            id: newId('item'),
            favorite: false,
            addedAt: stamp(),
          }
          set((state) => ({
            items: [item, ...state.items],
            wardrobes: state.wardrobes.map((w) =>
              w.id === item.wardrobeId ? { ...w, updatedAt: stamp() } : w,
            ),
          }))
          push(() => remote.insertItem(item), 'القطعة')
          return item
        },

        updateItem: (id, patch) => {
          set((state) => ({
            items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
          }))
          push(() => remote.updateItem(id, patch), 'تعديل القطعة')
        },

        /** نقل قطعة تجربة للخزانة = قرار يدوي صريح يحوّلها لقطعة مملوكة (I-03). */
        moveItem: (id, wardrobeId) => {
          set((state) => ({
            items: state.items.map((item) =>
              item.id === id ? { ...item, wardrobeId, source: 'wardrobe' as const } : item,
            ),
            wardrobes: state.wardrobes.map((w) =>
              w.id === wardrobeId ? { ...w, updatedAt: stamp() } : w,
            ),
          }))
          push(() => remote.moveItem(id, wardrobeId), 'نقل القطعة')
        },

        /** حذف القطعة يحذف صورتها المرفوعة معها — ما نخلّي ملفات يتيمة. */
        deleteItem: (id) => {
          void useItemPhotos.getState().remove(id)
          set((state) => ({ items: state.items.filter((item) => item.id !== id) }))
          push(() => remote.deleteItem(id), 'حذف القطعة')
        },

        toggleFavorite: (id) => {
          const next = !get().items.find((item) => item.id === id)?.favorite
          set((state) => ({
            items: state.items.map((item) =>
              item.id === id ? { ...item, favorite: next } : item,
            ),
          }))
          push(() => remote.setFavorite(id, next), 'المفضّلة')
        },

        clearItems: () => {
          void useItemPhotos.getState().clear()
          set({ items: [] })
          push(() => remote.deleteAllItems(), 'حذف القطع')
        },

        clearAll: () => {
          void useItemPhotos.getState().clear()
          set({ ...EMPTY })
          push(() => remote.deleteEverything(), 'تصفير الخزانة')
        },
      }
    },
    {
      name: storageKey('wardrobe'),
      version: 3,
      /**
       * مع الخادم ما نحفظ نسخة محلية أبدًا — الخزانة تُقرأ من عنده عند كل
       * إقلاع. وبلا خادم نحفظ وإلا ضاعت مع كل تحديث.
       *
       * `status` ما يُحفظ في الحالتين: حالة الجلسة الحالية لا حالة محفوظة.
       */
      partialize: (state) =>
        hasBackend() ? {} : { wardrobes: state.wardrobes, items: state.items },
      /**
       * الإصدار ٣: انتقلت الخزانة للخادم. أي نسخة محفوظة من قبل تُسقَط —
       * الخادم هو المرجع، والاحتفاظ بنسخة قديمة جنبه يعرض بيانات ميتة.
       */
      migrate: (persisted, version) =>
        hasBackend() || version < 3 ? { ...EMPTY } : (persisted as WardrobeState),
    },
  ),
)

/* ---------------- محدّدات خارج التفاعل ---------------- */

export const itemById = (id: string): WardrobeItem | undefined =>
  useWardrobe.getState().items.find((item) => item.id === id)

export const wardrobeById = (id?: string | null): Wardrobe | undefined =>
  useWardrobe.getState().wardrobes.find((wardrobe) => wardrobe.id === id)
