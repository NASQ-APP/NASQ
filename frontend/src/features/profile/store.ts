import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storageKey } from '@/infrastructure/storage'

type ProfileState = {
  name: string
  email: string
  setProfile: (patch: Partial<Pick<ProfileState, 'name' | 'email'>>) => void
}

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      name: 'ليانا',
      email: '',
      setProfile: (patch) => set(patch),
    }),
    { name: storageKey('profile') },
  ),
)
