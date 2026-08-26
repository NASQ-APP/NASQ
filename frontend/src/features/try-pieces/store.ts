/**
 * المتاجر التي فوّضتها المستخدمة كمصدر استيراد.
 *
 * ما نحفظ إلا علم الاتصال — بدون رموز وصول ولا بيانات دخول ولا أي شي يقدر
 * يتصرّف نيابة عنها. الحد الأمني في I-04: دولابي ما تطلب كلمة مرور أي متجر.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storageKey } from '@/infrastructure/storage'

type ImportState = {
  connected: string[]
  connect: (sourceId: string) => void
  disconnect: (sourceId: string) => void
  isConnected: (sourceId: string) => boolean
}

export const useImportSources = create<ImportState>()(
  persist(
    (set, get) => ({
      connected: [],
      connect: (sourceId) =>
        set((s) => (s.connected.includes(sourceId) ? s : { connected: [...s.connected, sourceId] })),
      disconnect: (sourceId) =>
        set((s) => ({ connected: s.connected.filter((id) => id !== sourceId) })),
      isConnected: (sourceId) => get().connected.includes(sourceId),
    }),
    { name: storageKey('try-pieces') },
  ),
)
