import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib'

/** حبّة تصفية — النشط أسود نقي بنص أبيض. */
export function Chip({
  active,
  className,
  children,
  ...props
}: ComponentProps<'button'> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'h-9 rounded-full border px-4 text-[11.5px] transition-colors duration-[320ms] ease-soft',
        active
          ? 'border-ink bg-ink text-white'
          : 'border-line bg-transparent text-muted hover:border-line-strong hover:text-ink',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
