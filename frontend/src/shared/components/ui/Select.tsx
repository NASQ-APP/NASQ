import type { ComponentProps } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/shared/lib'
import { fieldStyles } from './TextInput'

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select className={cn(fieldStyles, 'appearance-none pl-10', className)} {...props}>
        {children}
      </select>
      <ChevronDown
        size={14}
        strokeWidth={1.5}
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
      />
    </div>
  )
}
