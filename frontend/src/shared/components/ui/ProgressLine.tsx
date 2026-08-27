/**
 * خط تقدّم رفيع.
 *
 * حرف واحد من الحبر يمشي فوق خط الحدود — بلا لون ولا تدرّج، فيبقى في نظام
 * التصميم الأحادي. ويحمل قيمته نصًّا لجنبه لأن الخط وحده يقول «تقريبًا» مو
 * «كم بالضبط».
 */
import { clamp, cn } from '@/shared/lib'

export function ProgressLine({
  value,
  label,
  note,
  className,
}: {
  /** من ٠ إلى ١ */
  value: number
  label: string
  /** النص المقروء على اليسار — «٤ من ٧» */
  note?: string
  className?: string
}) {
  const percent = Math.round(clamp(value, 0, 1) * 100)

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11.5px] text-muted">{label}</span>
        {note && <span className="lat text-[10.5px] text-faint">{note}</span>}
      </div>
      <span
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="block h-px w-full bg-line"
      >
        <span
          className="block h-full bg-ink transition-[width] duration-500 ease-soft"
          style={{ width: `${percent}%` }}
        />
      </span>
    </div>
  )
}
