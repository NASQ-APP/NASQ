/**
 * ظهور متتابع للقوائم والشبكات.
 *
 * البطاقات تظهر واحدة بعد وحدة بفاصل قصير، فالعين تلتقط ترتيب الشبكة بدل ما
 * يهبط كل شي دفعة. الفاصل **يُسقَّف**: بعد عنصر معيّن يصير التتابع انتظارًا لا
 * حركة، فآخر بطاقة ما تتأخر ثانيتين لأن قبلها ثلاثين.
 *
 * التتابع بمتغيّر CSS لا بجافاسكربت — بلا مراقب ولا حالة، والحالة الطبيعية
 * ظاهرة فما تختفي البطاقات لو تعطّلت الحركة.
 */
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/shared/lib'

/** أقصى عدد يشارك في التتابع — بعده يظهر الباقي معًا. */
const MAX_STAGGERED = 12
const STEP_MS = 45

export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}

export function RevealItem({
  children,
  className,
  index = 0,
}: {
  children: ReactNode
  className?: string
  /** موضع العنصر — يُستعمل لتسقيف التأخير في القوائم الطويلة */
  index?: number
}) {
  return (
    <div
      className={cn('reveal-in', className)}
      style={{ '--reveal-delay': `${Math.min(index, MAX_STAGGERED) * STEP_MS}ms` } as CSSProperties}
    >
      {children}
    </div>
  )
}
