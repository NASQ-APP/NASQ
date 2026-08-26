/** الإطلالات المحفوظة: الصورة المولّدة مع معرّفات القطع اللي صنعتها فعليًا. */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storageKey } from '@/infrastructure/storage'
import { uid } from '@/shared/lib'
import type { SavedLook } from '@/domain/outfit'

type LooksState = {
  looks: SavedLook[]
  counter: number
  save: (look: Omit<SavedLook, 'id' | 'number' | 'createdAt'>) => SavedLook
  remove: (id: string) => void
  rename: (id: string, name: string) => void
  byId: (id: string) => SavedLook | undefined
}

export const useLooks = create<LooksState>()(
  persist(
    (set, get) => ({
      looks: [],
      counter: 100,
      save: (input) => {
        const number = get().counter + 1
        const look: SavedLook = {
          ...input,
          id: uid('look'),
          number,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ looks: [look, ...state.looks], counter: number }))
        return look
      },
      remove: (id) => set((state) => ({ looks: state.looks.filter((l) => l.id !== id) })),
      rename: (id, name) =>
        set((state) => ({ looks: state.looks.map((l) => (l.id === id ? { ...l, name } : l)) })),
      byId: (id) => get().looks.find((l) => l.id === id),
    }),
    { name: storageKey('looks') },
  ),
)
