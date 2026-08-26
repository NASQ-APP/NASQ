import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton } from './IconButton'
import { Scrim } from './Scrim'
import { useEscapeKey, useLockScroll, useOverlayTransition } from '@/shared/hooks'
import { cn } from '@/shared/lib'
import { layers } from '@/theme'

export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  /** end = يدخل من نهاية السطر (اليسار في RTL) */
  side = 'end',
}: {
  open: boolean
  onClose: () => void
  title?: string
  eyebrow?: string
  children: ReactNode
  footer?: ReactNode
  side?: 'start' | 'end'
}) {
  const { mounted, entered } = useOverlayTransition(open, 400)
  useLockScroll(open)
  useEscapeKey(open, onClose)

  if (!mounted) return null

  const fromRight = side === 'end'
  const hidden = fromRight ? 'translate-x-full' : '-translate-x-full'

  return createPortal(
    <>
      <Scrim visible={entered} onClose={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ zIndex: layers.overlay }}
        className={cn(
          'fixed inset-y-0 flex w-[min(430px,92vw)] flex-col bg-canvas',
          'transition-transform duration-[400ms] ease-soft',
          fromRight ? 'right-0 border-l border-line' : 'left-0 border-r border-line',
          entered ? 'translate-x-0' : hidden,
        )}
      >
        <header className="flex flex-none items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2 className="mt-1 text-[17px]">{title}</h2>}
          </div>
          <IconButton label="إغلاق" onClick={onClose}>
            <X size={17} strokeWidth={1.4} />
          </IconButton>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex-none border-t border-line px-6 py-4">{footer}</footer>}
      </aside>
    </>,
    document.body,
  )
}
