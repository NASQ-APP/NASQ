import { forwardRef, useState, type ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/shared/lib'
import { fieldStyles } from './TextInput'

/**
 * حقل كلمة مرور مع زر إظهار.
 *
 * الإظهار مهم على الجوال: كتابة كلمة طويلة بلا رؤيتها سبب متكرر للفشل. الزر
 * يعلن حالته لقارئات الشاشة، والحقل يترك مساحة له فما يركب على النص.
 */
export const PasswordInput = forwardRef<HTMLInputElement, ComponentProps<'input'>>(
  function PasswordInput({ className, ...props }, ref) {
    const [visible, setVisible] = useState(false)

    return (
      <span className="relative block">
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn(fieldStyles, 'pl-11', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          aria-pressed={visible}
          className="absolute left-1 top-1/2 grid h-8 w-9 -translate-y-1/2 place-items-center rounded-sm text-faint transition-colors hover:text-ink"
        >
          {visible ? (
            <EyeOff size={15} strokeWidth={1.5} aria-hidden />
          ) : (
            <Eye size={15} strokeWidth={1.5} aria-hidden />
          )}
        </button>
      </span>
    )
  },
)

/** شريط قوّة كلمة المرور — إرشادي، ما يمنع الإرسال. */
export function PasswordMeter({ score, label }: { score: 0 | 1 | 2 | 3; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex flex-1 gap-1" aria-hidden>
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            className={cn(
              'h-0.5 flex-1 rounded-full transition-colors duration-[320ms]',
              score >= step ? 'bg-ink' : 'bg-line',
            )}
          />
        ))}
      </span>
      <span className="text-[11px] text-faint">{label}</span>
    </span>
  )
}
