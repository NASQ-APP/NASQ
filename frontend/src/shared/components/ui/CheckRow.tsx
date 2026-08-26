import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/shared/lib'

/** صف اختيار بمربع — للفلاتر والقوائم القابلة للتعليم. */
export function CheckRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className="flex w-full items-center gap-3 py-2 text-right text-[13px] font-light transition-colors hover:text-ink"
    >
      <span
        className={cn(
          'grid h-4 w-4 flex-none place-items-center rounded-[3px] border transition-colors',
          checked ? 'border-ink-soft bg-ink-soft' : 'border-line-strong',
        )}
      >
        {checked && <Check size={10} strokeWidth={3} aria-hidden className="text-white" />}
      </span>
      <span className={cn(checked ? 'text-ink' : 'text-muted')}>{children}</span>
    </button>
  )
}
