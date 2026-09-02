/**
 * انتظار صغير داخل السطر — بجانب نص، أو داخل زر، أو في زاوية بطاقة.
 *
 * علامة كاملة هنا مبالغة: القياس هو حجم النص المجاور، والغرض إشارة لا مشهد.
 */
import { cn } from '@/shared/lib'

export function InlineLoader({
  label = 'جاري التحميل',
  className,
}: {
  /** ما يُقرأ صوتيًا — البصر يرى النقطة، والقارئ يحتاج كلمة */
  label?: string
  className?: string
}) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn('inline-flex items-center gap-2', className)}
    >
      <span
        aria-hidden
        className="logo-breathe inline-block h-1.5 w-1.5 rounded-full bg-muted"
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}
