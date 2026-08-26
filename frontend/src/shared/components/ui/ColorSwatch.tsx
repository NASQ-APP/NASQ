import { cn } from '@/shared/lib'

export type SwatchOption = { name: string; hex: string }

export function ColorSwatch({
  hex,
  label,
  active,
  size = 'md',
  onClick,
}: {
  hex: string
  label?: string
  active?: boolean
  size?: 'sm' | 'md'
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={label}
      aria-pressed={onClick ? active : undefined}
      title={label}
      style={{ background: hex }}
      className={cn(
        'rounded-full border border-[rgba(0,0,0,0.12)] transition-all',
        size === 'sm' ? 'h-3.5 w-3.5' : 'h-7 w-7',
        active && 'ring-1 ring-ink ring-offset-2 ring-offset-canvas',
        onClick && 'cursor-pointer',
      )}
    />
  )
}

/** مجموعة ألوان قابلة للاختيار — لوحة ألوان القطعة. */
export function ColorSwatchGroup({
  options,
  value,
  onChange,
}: {
  options: SwatchOption[]
  value?: string
  onChange: (option: SwatchOption) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <ColorSwatch
          key={option.name}
          hex={option.hex}
          label={option.name}
          active={value === option.name}
          onClick={() => onChange(option)}
        />
      ))}
    </div>
  )
}
