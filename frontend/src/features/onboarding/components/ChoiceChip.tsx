/**
 * حبّة اختيار في التعارف.
 *
 * صغيرة وهادئة: الشاشة سؤال سريع، فالحبّة ما تاخذ أكثر من حجم كلمتها.
 * المختار بحبر وحدّ نحاسي، والمعطّل يخفت بدل ما يختفي — عشان تعرف المستخدمة
 * إنها بلغت الحد، مب إن الخيار راح.
 */
import { cn } from '@/shared/lib'

export function ChoiceChip({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string
  active: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled && !active}
      onClick={onClick}
      className={cn(
        'h-9 rounded-full border px-4 text-[12.5px] transition-all duration-[320ms] ease-out',
        active
          ? 'border-ink bg-ink text-canvas'
          : 'border-line text-muted hover:border-line-strong hover:text-ink',
        disabled && !active && 'opacity-35',
      )}
    >
      {label}
    </button>
  )
}
