import type { ReactNode } from 'react'

/** ترويسة الصفحة — عنوان واحد من مستوى h1 لكل شاشة. */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-2 text-[32px]">{title}</h1>
        {description && <p className="mt-2 max-w-[540px] text-[13px] text-muted">{description}</p>}
      </div>
      {action}
    </header>
  )
}
