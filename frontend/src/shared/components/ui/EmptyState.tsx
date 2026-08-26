import type { ReactNode } from 'react'

/** حالة فراغ — حدود متقطعة، محتوى متوسط، وإجراء واحد واضح للخروج منها. */
export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string
  body?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-line-strong px-6 py-20 text-center">
      {icon && <div className="mb-1 text-faint">{icon}</div>}
      <h3 className="display text-[24px]">{title}</h3>
      {body && <p className="max-w-[400px] text-[12.5px] leading-8 text-muted">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
