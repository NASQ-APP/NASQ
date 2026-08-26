import type { ReactNode } from 'react'

/** غلاف حقل موحّد: تسمية فوق، وتلميح أو خطأ تحت. */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="eyebrow">{label}</span>
      {children}
      {error ? (
        <span className="text-[11.5px] text-danger">{error}</span>
      ) : hint ? (
        <span className="text-[11.5px] text-faint">{hint}</span>
      ) : null}
    </label>
  )
}
