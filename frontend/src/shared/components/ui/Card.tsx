import type { ComponentProps, ElementType } from 'react'
import { cn } from '@/shared/lib'

type CardProps = ComponentProps<'div'> & {
  /** عنصر HTML الناتج — للحفاظ على المعنى الدلالي للصفحة */
  as?: Extract<ElementType, 'div' | 'section' | 'article' | 'aside'>
  /** surface = خلفية ثانوية بحدّ رفيع · plain = أبيض بحدّ رفيع */
  tone?: 'surface' | 'plain'
  padded?: boolean
  /** يرفع البطاقة قليلاً عند المرور */
  interactive?: boolean
}

/** سطح موحّد للبطاقات واللوحات — يمنع تكرار قيم الحدود والاستدارة في الشاشات. */
export function Card({
  as: Tag = 'div',
  tone = 'surface',
  padded = true,
  interactive,
  className,
  ...props
}: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-md border border-line',
        tone === 'surface' ? 'bg-surface' : 'bg-canvas',
        padded && 'px-6 py-5',
        interactive && 'lift hover:border-line-strong',
        className,
      )}
      {...props}
    />
  )
}
