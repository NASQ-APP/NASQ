/**
 * درج جانبي / ورقة سفلية.
 *
 * مكوّن واحد لكل الأجهزة: `side` يصف مكانه على سطح المكتب، وتحت مقاس سطح
 * المكتب يتحوّل تلقائيًا إلى ورقة سفلية — لأن الإبهام يصل لأسفل الشاشة ولا
 * يصل لحافتها البعيدة. الصفحات ما تكرّر نسختين من نفس المحتوى.
 *
 * لإيقاف التكيّف: `adaptive={false}`.
 */
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton } from './IconButton'
import { Scrim } from './Scrim'
import { useDeviceClass, useEscapeKey, useLockScroll, useOverlayTransition } from '@/shared/hooks'
import { cn } from '@/shared/lib'
import { layers } from '@/theme'

/** start = يدخل من بداية السطر · end = من نهايته · bottom = ورقة سفلية. */
export type DrawerSide = 'start' | 'end' | 'bottom'

export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  side = 'end',
  adaptive = true,
  bleed,
}: {
  open: boolean
  onClose: () => void
  title?: string
  eyebrow?: string
  children: ReactNode
  footer?: ReactNode
  /** مكانه على سطح المكتب */
  side?: DrawerSide
  /** يصير ورقة سفلية تحت مقاس سطح المكتب (افتراضيًا نعم) */
  adaptive?: boolean
  /** المحتوى يملأ الدرج بلا حشوة — للوحات التي تدير تمريرها بنفسها */
  bleed?: boolean
}) {
  const device = useDeviceClass()
  const { mounted, entered } = useOverlayTransition(open, 400)
  useLockScroll(open)
  useEscapeKey(open, onClose)

  if (!mounted) return null

  const resolved: DrawerSide = adaptive && device !== 'desktop' ? 'bottom' : side
  const bottom = resolved === 'bottom'
  const fromRight = resolved === 'end'
  const hidden = bottom ? 'translate-y-full' : fromRight ? 'translate-x-full' : '-translate-x-full'
  const rest = bottom ? 'translate-y-0' : 'translate-x-0'

  return createPortal(
    <>
      <Scrim visible={entered} onClose={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ zIndex: layers.overlay }}
        className={cn(
          'fixed flex flex-col bg-canvas',
          'transition-transform duration-[400ms] ease-soft',
          bottom
            ? cn(
                'inset-x-0 bottom-0 rounded-t-xl border-t border-line',
                // ارتفاع محدّد لما يملأ المحتوى الورقة، وإلا يتمدّد بقدره
                bleed ? 'h-[82vh]' : 'max-h-[86vh]',
              )
            : cn(
                'inset-y-0 w-[min(430px,92vw)]',
                fromRight ? 'right-0 border-l border-line' : 'left-0 border-r border-line',
              ),
          entered ? rest : hidden,
        )}
      >
        {/* مقبض بصري — يقول إن هذي ورقة تُسحب وتُغلق */}
        {bottom && (
          <span
            aria-hidden
            className="mx-auto mt-2.5 h-1 w-9 flex-none rounded-full bg-line-strong"
          />
        )}

        <header className="flex flex-none items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2 className="mt-1 text-[17px]">{title}</h2>}
          </div>
          <IconButton label="إغلاق" onClick={onClose}>
            <X size={17} strokeWidth={1.4} />
          </IconButton>
        </header>

        <div className={cn('min-h-0 flex-1', bleed ? 'overflow-hidden' : 'overflow-y-auto px-6 py-5')}>
          {children}
        </div>

        {footer && <footer className="flex-none border-t border-line px-6 py-4">{footer}</footer>}
      </aside>
    </>,
    document.body,
  )
}
