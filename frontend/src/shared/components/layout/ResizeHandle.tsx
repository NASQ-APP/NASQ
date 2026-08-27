/**
 * مقبض تغيير الحجم.
 *
 * سحب بالمؤشر أو باللمس، **ومعه لوحة المفاتيح** — لأن السحب وحده يقفل الميزة
 * على من يستخدم لوحة المفاتيح أو قارئ الشاشة. يُعلن نفسه `separator` بقيمه
 * الحالية والحدّين، فالقارئ يقول «٤٠٪» بدل «فاصل».
 *
 * الحساب هنا بالبكسل فقط؛ المكوّن المنادي هو اللي يقرّر معنى الرقم.
 */
import { useRef, useState } from 'react'
import { clamp, cn } from '@/shared/lib'

export function ResizeHandle({
  value,
  min,
  max,
  step = 16,
  onChange,
  onToggle,
  label,
  /** الاتجاه الذي يكبر فيه القسم: up = المنطقة تحت المقبض */
  grow = 'down',
  className,
}: {
  value: number
  min: number
  max: number
  step?: number
  onChange: (next: number) => void
  /** يُنادى بمفتاح الإدخال أو النقر المزدوج — طيّ وفتح سريع */
  onToggle?: () => void
  label: string
  grow?: 'up' | 'down'
  className?: string
}) {
  const drag = useRef<{ origin: number; value: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const apply = (next: number) => onChange(clamp(Math.round(next), min, max))

  /** السهم «للأعلى» يكبّر لما تكون المنطقة تحت المقبض. */
  const nudge = (towards: 'up' | 'down') =>
    apply(value + (towards === grow ? step : -step))

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title={label}
      onPointerDown={(event) => {
        // الالتقاط يخلّي السحب يكمل حتى لو خرج المؤشر عن المقبض. لو رفضه
        // المتصفح نكمل بالتقاط الأحداث العادي بدل ما يموت السحب بصمت.
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          /* المتصفح ما دعم الالتقاط */
        }
        drag.current = { origin: event.clientY, value }
        setDragging(true)
      }}
      onPointerMove={(event) => {
        const start = drag.current
        if (!start) return
        const delta = event.clientY - start.origin
        apply(grow === 'up' ? start.value - delta : start.value + delta)
      }}
      onPointerUp={() => {
        drag.current = null
        setDragging(false)
      }}
      onLostPointerCapture={() => {
        drag.current = null
        setDragging(false)
      }}
      onDoubleClick={onToggle}
      onKeyDown={(event) => {
        const keys: Record<string, () => void> = {
          ArrowUp: () => nudge('up'),
          ArrowDown: () => nudge('down'),
          Home: () => apply(min),
          End: () => apply(max),
          Enter: () => onToggle?.(),
        }
        const action = keys[event.key]
        if (!action) return
        event.preventDefault()
        action()
      }}
      className={cn(
        'group flex h-2.5 flex-none cursor-row-resize touch-none items-center justify-center',
        'outline-none focus-visible:bg-surface',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'h-[3px] w-9 rounded-full transition-colors duration-[250ms]',
          dragging ? 'bg-ink' : 'bg-line group-hover:bg-line-strong group-focus-visible:bg-ink',
        )}
      />
    </div>
  )
}
