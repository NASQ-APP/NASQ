import type { ComponentType } from 'react'
import { cn } from '@/shared/lib'

type Option<T extends string> = {
  value: T
  label: string
  icon?: ComponentType<{ size?: number; strokeWidth?: number }>
}

/** مبدّل بين وضعين أو أكثر — مثل عرض شبكي / مضغوط. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div role="group" className={cn('flex overflow-hidden rounded-md border border-line', className)}>
      {options.map((option) => {
        const Icon = option.icon
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-label={option.label}
            aria-pressed={active}
            title={option.label}
            className={cn(
              'grid h-9 min-w-10 place-items-center px-2 text-[11.5px] transition-colors',
              active ? 'bg-ink text-white' : 'text-faint hover:text-ink',
            )}
          >
            {Icon ? <Icon size={15} strokeWidth={1.4} /> : option.label}
          </button>
        )
      })}
    </div>
  )
}
