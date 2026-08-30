/**
 * إطار الخطوة الواحدة في التعارف.
 *
 * **سؤال واحد في كل شاشة** — لا شاشة تحمل سؤالين، عشان الجواب يجي بلا تردّد.
 * عمود ضيّق موسّط رأسيًا، عنوان صغير، وكل شي يبان على شاشة اللابتوب بلا تمرير.
 *
 * الفخامة من التفاصيل: تسمية لاتينية متباعدة، وخيط تقدّم نحاسي رفيع بدل
 * مؤشّر رقمي بارز.
 */
import type { ReactNode } from 'react'

export function StepShell({
  eyebrow,
  step,
  total,
  title,
  hint,
  children,
  footer,
}: {
  /** كلمة لاتينية واحدة تسمّي السؤال — علامة مكان، مب عنوانًا */
  eyebrow: string
  step: number
  total: number
  title: string
  hint?: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <section className="w-full max-w-[560px]">
      <div className="flex items-baseline justify-between">
        <p className="lat text-[8px] tracking-[0.34em] text-muted">{eyebrow}</p>
        {/* `dir=ltr` عشان الأرقام ما تنقلب في سياق عربي */}
        <p dir="ltr" className="lat text-[8px] tracking-[0.2em] text-faint">
          {step} / {total}
        </p>
      </div>

      {/* خيط التقدّم — نحاس على خط، بلا نسب ولا أرقام كبيرة */}
      <div className="mt-2.5 h-px w-full bg-line">
        <div
          className="h-px bg-ink transition-[width] duration-[420ms] ease-out"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>

      <h1 className="mt-7 text-[21px] leading-snug sm:text-[23px]">{title}</h1>
      {hint && <p className="mt-1.5 text-[12px] leading-6 text-muted">{hint}</p>}

      <div className="mt-7">{children}</div>

      <div className="mt-8 flex items-center gap-4">{footer}</div>
    </section>
  )
}
