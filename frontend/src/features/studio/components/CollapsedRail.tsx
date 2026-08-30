/**
 * شريط اللوحة المطويّة.
 *
 * اللوحة تنطوي ولا تختفي: يبقى زر فتح واضح وعدّاد يقول وش فيها. الاختفاء
 * الكامل يخلي المستخدمة تدوّر كيف ترجّعها.
 */
import type { ComponentType } from 'react'

export function CollapsedRail({
  label,
  icon: Icon,
  count,
  onOpen,
}: {
  label: string
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
  count?: number
  onOpen: () => void
}) {
  return (
    <div className="flex h-full flex-col items-center gap-3 bg-canvas py-4">
      <button
        onClick={onOpen}
        aria-label={label}
        title={label}
        className="grid h-9 w-9 place-items-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink"
      >
        <Icon size={16} strokeWidth={1.5} />
      </button>

      {count !== undefined && count > 0 && (
        <span className="lat grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[9px] text-white">
          {count}
        </span>
      )}

      {/* الاسم رأسيًا: يبقى مقروءًا في ٥٦ بكسل */}
      <span
        className="mt-1 whitespace-nowrap text-[11px] text-faint"
        style={{ writingMode: 'vertical-rl' }}
      >
        {label}
      </span>
    </div>
  )
}
