import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib'

/** أنماط الحقول — خلفية شفافة وحدّ رفيع. مصدر واحد للإدخال والمنسدلة والبحث. */
export const fieldStyles =
  'h-10 w-full rounded-md border border-line bg-transparent px-3.5 text-[12.5px] outline-none ' +
  'transition-colors duration-[320ms] ease-soft placeholder:text-faint focus:border-ink-soft'

export const TextInput = ({ className, ...props }: ComponentProps<'input'>) => (
  <input className={cn(fieldStyles, className)} {...props} />
)

export const TextArea = ({ className, ...props }: ComponentProps<'textarea'>) => (
  <textarea className={cn(fieldStyles, 'h-24 resize-none py-2.5 leading-7', className)} {...props} />
)
