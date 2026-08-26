import type { ComponentProps } from 'react'
import { Link } from 'react-router-dom'
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
  'transition-all duration-[320ms] ease-soft disabled:opacity-40 disabled:pointer-events-none'

type StyleProps = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean }

const styles = ({ variant = 'primary', size = 'md', block }: StyleProps, className?: string) =>
  cn(BASE, VARIANTS[variant], SIZES[size], block && 'w-full', className)

export function Button({
  variant,
  size,
  block,
  className,
  ...props
}: ComponentProps<'button'> & StyleProps) {
  return <button className={styles({ variant, size, block }, className)} {...props} />
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
