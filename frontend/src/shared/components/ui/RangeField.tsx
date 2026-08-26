/** سلايدر بتسمية وقيمة — يستخدمه باني الموديل لكل مقاس. */
export function RangeField({
  label,
  value,
  unit,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  unit?: string
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-line py-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px]">{label}</span>
        <span className="font-latin text-[12px] text-muted">
          {value}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
      />
    </div>
  )
}
