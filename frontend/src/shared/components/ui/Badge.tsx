import type { ReactNode } from 'react'
import { cn } from '@/shared/lib'

export type BadgeTone = 'neutral' | 'dark' | 'danger'

/** وسم صغير — يستخدمه تعليم «قطعة تجربة» وتعليم «معاينة تقريبية». */
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'lat inline-flex items-center rounded-[3px] px-2 py-1 text-[8.5px]',
        tone === 'dark' && 'bg-ink text-white',
        tone === 'danger' && 'bg-danger text-white',
        tone === 'neutral' && 'border border-line bg-canvas/90 text-muted',
      )}
    >
      {children}
    </span>
  )
}
