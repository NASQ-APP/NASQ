/**
 * لوحة جانبية تتكيّف مع الجهاز.
 *
 * نفس المحتوى يُعلن مرّة واحدة: على سطح المكتب يُرسّى في عمود الشبكة ويُطوى
 * إلى شريط، وعلى الجوال يُفتح كورقة سفلية. الصفحة ما تكتب نسختين من نفس
 * اللوحة، فما تتفرّع سلوكياتهما مع الوقت.
 */
import type { ReactNode } from 'react'
import { Drawer } from '@/shared/components/ui'
import { cn } from '@/shared/lib'
import type { PanelPlacement } from '@/domain/studio'

export function AdaptivePanel({
  placement,
  open,
  onClose,
  title,
  eyebrow,
  rail,
  className,
  children,
}: {
  placement: PanelPlacement
  open: boolean
  onClose: () => void
  title: string
  eyebrow?: string
  /** بديل مضغوط يظهر بدل اللوحة لما تنطوي وهي مرسّاة */
  rail?: ReactNode
  className?: string
  children: ReactNode
}) {
  if (placement === 'sheet') {
    return (
      <Drawer open={open} onClose={onClose} side="bottom" title={title} eyebrow={eyebrow} bleed>
        {children}
      </Drawer>
    )
  }

  return <div className={cn('min-h-0', className)}>{open ? children : rail}</div>
}
