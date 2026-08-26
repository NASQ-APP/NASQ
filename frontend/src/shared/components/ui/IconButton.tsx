import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/shared/lib'

/** زر أيقوني — `label` مطلوب دائمًا لقارئات الشاشة (متطلب X-09). */
export function IconButton({
  label,
  bordered,
  className,
  children,
  ...props
}: ComponentProps<'button'> & { label: string; bordered?: boolean; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'grid h-9 w-9 place-items-center rounded-md border text-muted transition-colors duration-[320ms] ease-soft hover:text-ink',
        bordered ? 'border-line bg-surface hover:border-line-strong' : 'border-transparent hover:bg-surface',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
