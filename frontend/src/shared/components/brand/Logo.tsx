/**
 * علامة التطبيق ووسمه الكتابي.
 *
 * العلامة خطّية بلون `currentColor`، فتشتغل على أبيض وعلى حبر بلا نسختين.
 * ومرسومة بحيث تُقرأ عند ١٦ بكسل مثل ما تُقرأ عند ٩٦ — بلا تفاصيل تضيع.
 */
import { APP } from '@/shared/config'
import { cn } from '@/shared/lib'

/** علاّقة ملابس: خطّاف يعلو ومثلث ينزل لقاعدة مستقيمة. */
export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M12 8.6V7a2 2 0 1 1 2 2" />
      <path d="M12 8.6 5.2 14.3a1.2 1.2 0 0 0 .8 2.1h12a1.2 1.2 0 0 0 .8-2.1L12 8.6Z" />
    </svg>
  )
}

type LogoProps = {
  /** حجم العلامة بالبكسل */
  size?: number
  /** إخفاء الاسم والاكتفاء بالعلامة */
  markOnly?: boolean
  /** تكديس الاسم تحت العلامة بدل جنبها */
  stacked?: boolean
  className?: string
}

export function Logo({ size = 24, markOnly, stacked, className }: LogoProps) {
  return (
    <span
      className={cn(
        'inline-flex text-ink',
        stacked ? 'flex-col items-center gap-3' : 'items-center gap-2.5',
        className,
      )}
    >
      <LogoMark size={size} />
      {!markOnly && (
        <span className={cn('flex flex-col', stacked && 'items-center')}>
          <span
            className="font-heading leading-none"
            style={{ fontSize: size * 0.72, fontWeight: 300, letterSpacing: '-0.01em' }}
          >
            {APP.name}
          </span>
          <span className="lat mt-1 text-[9px] opacity-45">{APP.latin}</span>
        </span>
      )}
    </span>
  )
}
