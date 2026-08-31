/**
 * الإطلالات المحفوظة: الصورة المولّدة مع معرّفات القطع اللي صنعتها فعليًا.
 *
 * تعيش على الخادم مثل الخزانة، وبنفس النمط: كتابة متفائلة تمر على طابور،
 * ولا نسخة محلية تزاحم الخادم.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storageKey } from '@/infrastructure/storage'
import { hasBackend } from '@/shared/config'
import { uid, uuid } from '@/shared/lib'
import { toast } from '@/shared/components/ui'
import * as remote from '@/infrastructure/looks/repository'
import { itemById } from '@/features/wardrobe/store'
import { slotOfCategory } from '@/domain/wardrobe'
import type { SavedLook } from '@/domain/outfit'
import type { BodySlot } from '@/domain/shared/types'

const newId = () => (hasBackend() ? uuid() : uid('look'))

/** ميل القطعة في الجسم — يُقرأ من فئتها في الخزانة، لا من الواجهة. */
const slotOf = (itemId: string): BodySlot => {
  const item = itemById(itemId)
  return item ? slotOfCategory(item.categoryId) : 'top'
}

type LooksState = {
  looks: SavedLook[]
  counter: number
  load: () => Promise<void>
  reset: () => void
  save: (look: Omit<SavedLook, 'id' | 'number' | 'createdAt'>) => SavedLook
  remove: (id: string) => void
  rename: (id: string, name: string) => void
  byId: (id: string) => SavedLook | undefined
}

/** أول رقم إطلالة — رقم ثلاثي أجمل من «إطلالة ١». */
const FIRST_NUMBER = 100

export const useLooks = create<LooksState>()(
  persist(
    (set, get) => {
      let queue: Promise<void> = Promise.resolve()

      const push = (action: () => Promise<void>, whatFailed: string) => {
        if (!hasBackend()) return
        queue = queue.then(action).catch(() => {
          toast.error(`ما قدرنا نحفظ ${whatFailed} على الخادم — رجّعنا آخر نسخة محفوظة.`)
          return get().load()
        })
      }

      return {
        looks: [],
        counter: FIRST_NUMBER,

        load: async () => {
          if (!hasBackend()) return
          try {
            const looks = await remote.fetchLooks()
            set({
              looks,
              // العدّاد يكمل من أعلى رقم محفوظ، فما يتكرّر رقم بعد دخول من جهاز ثاني
              counter: looks.reduce((max, look) => Math.max(max, look.number), FIRST_NUMBER),
            })
          } catch {
            // القراءة فشلت: نخلّي القائمة فاضية بدل ما نعرض إطلالات مستخدمة قبلها
          }
        },

        reset: () => set({ looks: [], counter: FIRST_NUMBER }),

        save: (input) => {
          const number = get().counter + 1
          const look: SavedLook = {
            ...input,
            id: newId(),
            number,
            createdAt: new Date().toISOString(),
          }
          set((state) => ({ looks: [look, ...state.looks], counter: number }))
          push(() => remote.insertLook(look, slotOf), 'الإطلالة')
          return look
        },

        remove: (id) => {
          set((state) => ({ looks: state.looks.filter((l) => l.id !== id) }))
          push(() => remote.deleteLook(id), 'حذف الإطلالة')
        },

        rename: (id, name) => {
          set((state) => ({ looks: state.looks.map((l) => (l.id === id ? { ...l, name } : l)) }))
          push(() => remote.renameLook(id, name), 'اسم الإطلالة')
        },

        byId: (id) => get().looks.find((l) => l.id === id),
      }
    },
    {
      name: storageKey('looks'),
      version: 1,
      partialize: (state) =>
        hasBackend() ? {} : { looks: state.looks, counter: state.counter },
      migrate: (persisted, version) =>
        hasBackend() || version < 1
          ? { looks: [], counter: FIRST_NUMBER }
          : (persisted as LooksState),
    },
  ),
)
