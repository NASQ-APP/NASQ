import type { ComponentProps } from 'react'
import { Link } from 'react-router-dom'
import { InlineLoader } from '@/shared/components/render/InlineLoader'
import { cn } from '@/shared/lib'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  /** الأسود الناعم، نص أبيض، بدون ظلال */
  primary: 'bg-ink-soft text-white border-ink-soft hover:bg-ink',
  secondary: 'bg-surface text-ink-soft border-line hover:border-line-strong hover:bg-surface-warm',
  ghost: 'bg-transparent text-muted border-transparent hover:text-ink hover:bg-surface',
  danger: 'bg-surface text-danger border-line hover:border-danger',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-[11.5px] gap-1.5',
  md: 'h-10 px-5 text-[12px] gap-2',
  lg: 'h-12 px-7 text-[12.5px] gap-2.5',
}

const BASE =
  'inline-flex items-center justify-center whitespace-nowrap rounded-md border font-medium ' +
  'transition-all duration-[320ms] ease-soft disabled:opacity-40 disabled:pointer-events-none ' +
  // انضغاطة خفيفة عند النقر — ردّ لمسي يقول إن النقرة وصلت
  'active:scale-[0.97] motion-reduce:active:scale-100'

type StyleProps = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean }

const styles = ({ variant = 'primary', size = 'md', block }: StyleProps, className?: string) =>
  cn(BASE, VARIANTS[variant], SIZES[size], block && 'w-full', className)

/**
 * الزر أثناء الانتظار: معطَّل، ونصّه يقول ما يجري.
 *
 * التعطيل ليس تجميلاً — النقرة الثانية على «حدّثي الإطلالة» تولّد صورة ثانية
 * وتخصم رصيدًا ثانيًا، والمستخدمة تشوف واحدة. فمنع التكرار هو الغرض، وتغيّر
 * النص هو ما يجعل التعطيل مفهومًا بدل أن يبدو عطلاً.
 *
 * والمؤشّر **يحلّ محلّ الأيقونة ولا يُضاف**: إضافته تزيد عرض الزر فيقفز ما
 * حوله في اللحظة التي تنتظر فيها المستخدمة.
 */
export function Button({
  variant,
  size,
  block,
  className,
  pending,
  pendingLabel,
  children,
  ...props
}: ComponentProps<'button'> &
  StyleProps & {
    pending?: boolean
    /** «جاري الحفظ…» — يحلّ محلّ المحتوى كاملاً أثناء الانتظار */
    pendingLabel?: string
  }) {
  return (
    <button
      className={styles({ variant, size, block }, className)}
      disabled={props.disabled || pending}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending && pendingLabel ? (
        <>
          <InlineLoader />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  )
}

/**
 * رابط خارجي بشكل الزر.
 *
 * `<a>` حقيقي، مب `window.open`: مانع النوافذ المنبثقة في المتصفح يوقف
 * `window.open` بخصائص نافذة، والرابط الحقيقي يفتح تبويبًا عاديًا ويشتغل معه
 * الضغط بالزر الأوسط و«فتح في تبويب جديد».
 */
export function ButtonAnchor({
  variant,
  size,
  block,
  className,
  ...props
}: ComponentProps<'a'> & StyleProps) {
  return <a className={styles({ variant, size, block }, className)} {...props} />
}

/** نفس الزر لكن كرابط تنقّل — يمنع تكرار الأنماط بين `<button>` و`<Link>`. */
export function ButtonLink({
  variant,
  size,
  block,
  className,
  ...props
}: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={styles({ variant, size, block }, className)} {...props} />
}
