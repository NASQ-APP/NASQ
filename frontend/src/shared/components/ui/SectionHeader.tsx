import type { ReactNode } from 'react'
import { cn } from '@/shared/lib'

/** ترويسة قسم داخل الصفحة. */
export function SectionHeader({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string
  title: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-6 flex items-end justify-between gap-6', className)}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="mt-1 text-[22px]">{title}</h2>
      </div>
      {action}
    </div>
  )
}
