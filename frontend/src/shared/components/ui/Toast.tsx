import { AlertCircle, Check, Info } from 'lucide-react'
import type { ReactElement } from 'react'
import { createPortal } from 'react-dom'
import { create } from 'zustand'
import { cn, uid } from '@/shared/lib'
import { layers } from '@/theme'

type ToastTone = 'ok' | 'info' | 'error'
type Toast = { id: string; message: string; tone: ToastTone }

type ToastState = {
  toasts: Toast[]
  push: (message: string, tone?: ToastTone) => void
  dismiss: (id: string) => void
}

const LIFETIME_MS = 3200

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = 'ok') => {
    const id = uid('toast')
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }))
    setTimeout(
      () => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
      LIFETIME_MS,
    )
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

/** واجهة استدعاء بسيطة تُنادى من أي مكان بدون هوك. */
export const toast = {
  ok: (message: string) => useToastStore.getState().push(message, 'ok'),
  info: (message: string) => useToastStore.getState().push(message, 'info'),
  error: (message: string) => useToastStore.getState().push(message, 'error'),
}

const ICONS: Record<ToastTone, ReactElement> = {
  ok: <Check size={15} strokeWidth={1.8} />,
  info: <Info size={15} strokeWidth={1.6} />,
  error: <AlertCircle size={15} strokeWidth={1.6} />,
}

/** يُركّب مرة واحدة في جذر التطبيق. */
export function ToastHost() {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      style={{ zIndex: layers.toast }}
      className="pointer-events-none fixed bottom-6 left-6 flex flex-col gap-2"
    >
      {toasts.map((item) => (
        <button
          key={item.id}
          onClick={() => dismiss(item.id)}
          className={cn(
            'pointer-events-auto flex animate-[toast-in_320ms_var(--ease-soft)] items-center gap-3',
            'rounded-md px-4 py-3 text-[12px] text-white',
            item.tone === 'error' ? 'bg-danger' : 'bg-ink-soft',
          )}
        >
          {ICONS[item.tone]}
          <span>{item.message}</span>
        </button>
      ))}
    </div>,
    document.body,
  )
}
