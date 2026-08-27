/**
 * نافذة حوار.
 *
 * على الشاشات الصغيرة ترسو على أسفل الشاشة كورقة بعرض كامل — قريبة من
 * الإبهام — وترجع نافذة مركزية من مقاس `sm` وفوق. التكيّف بالـCSS وحده،
 * فما فيه قياس جافاسكربت ولا وميض في أول إطار.
 */
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton } from './IconButton'
import { Scrim } from './Scrim'
import { useEscapeKey, useLockScroll, useOverlayTransition } from '@/shared/hooks'
import { cn } from '@/shared/lib'
import { layers } from '@/theme'

const WIDTHS = { sm: 'max-w-[440px]', md: 'max-w-[640px]', lg: 'max-w-[900px]' } as const

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  width = 'md',
}: {
  open: boolean
  onClose: () => void
  title?: string
  eyebrow?: string
  children: ReactNode
  footer?: ReactNode
  width?: keyof typeof WIDTHS
}) {
  const { mounted, entered } = useOverlayTransition(open)
  useLockScroll(open)
  useEscapeKey(open, onClose)

  if (!mounted) return null

  return createPortal(
    <>
      <Scrim visible={entered} onClose={onClose} />
      <div
        style={{ zIndex: layers.overlay }}
        className="pointer-events-none fixed inset-0 grid items-end justify-items-center sm:place-items-center sm:p-4"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={cn(
            'pointer-events-auto flex max-h-[88vh] w-full flex-col overflow-hidden bg-canvas',
            'rounded-t-xl border-t border-line sm:rounded-md sm:border',
            'transition-all duration-[320ms] ease-soft',
            entered
              ? 'translate-y-0 scale-100 opacity-100'
              : 'translate-y-6 scale-100 opacity-0 sm:translate-y-3 sm:scale-[0.985]',
            WIDTHS[width],
          )}
        >
          {(title || eyebrow) && (
            <header className="flex items-start justify-between gap-4 px-5 pt-6 sm:px-7">
              <div>
                {eyebrow && <p className="eyebrow">{eyebrow}</p>}
                {title && <h2 className="mt-1 text-[19px]">{title}</h2>}
              </div>
              <IconButton label="إغلاق" onClick={onClose}>
                <X size={17} strokeWidth={1.4} />
              </IconButton>
            </header>
          )}
          <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">{children}</div>
          {footer && <footer className="border-t border-line px-5 py-4 sm:px-7">{footer}</footer>}
        </div>
      </div>
    </>,
    document.body,
  )
}
