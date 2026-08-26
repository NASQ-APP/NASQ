import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storageKey } from '@/infrastructure/storage'

type SidebarState = {
  collapsed: boolean
  toggle: () => void
}

/** حالة طيّ الشريط الجانبي — تُحفظ عشان تبقى بين الجلسات. */
export const useSidebar = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set((state) => ({ collapsed: !state.collapsed })),
    }),
    { name: storageKey('sidebar') },
  ),
)
