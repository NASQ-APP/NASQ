/**
 * خطأ في وجه المستخدمة — بلا تفاصيل تخصّنا نحن.
 *
 * ممنوع هنا: رمز الحالة، واسم المزوّد، ونصّ Supabase الخام، وأثر الاستدعاء.
 * كلها تُقرأ في السجل عندنا، وعرضها للمستخدمة يخيفها بلا ما يعطيها فعلاً —
 * وأحيانًا يكشف بنية النظام لمن لا يحتاجها.
 *
 * ولكل خطأ **فعل واحد واضح**: «إعادة المحاولة». الخطأ بلا مخرج طريق مسدود.
 */
import { Button } from '@/shared/components/ui'
import { cn } from '@/shared/lib'

export type PageErrorKind = 'general' | 'ai' | 'image'

const COPY: Record<PageErrorKind, { title: string; body: string }> = {
  general: {
    title: 'صار شيء غير متوقع.',
    body: 'جرّبي مرة ثانية.',
  },
  /** التوليد يفشل لأسباب لا تُصلَح بالإعادة وحدها — فنقترح الفعل المفيد */
  ai: {
    title: 'ما قدرنا نجهّز الإطلالة هالمرة.',
    body: 'جرّبي مرة ثانية أو اختاري صورة أوضح.',
  },
  image: {
    title: 'تعذّر تحميل الصورة.',
    body: 'جرّبي مرة ثانية.',
  },
}

export function PageError({
  kind = 'general',
  title,
  body,
  onRetry,
  retryLabel = 'إعادة المحاولة',
  className,
}: {
  kind?: PageErrorKind
  /** نصّ أدق حين نملكه — ويبقى للمستخدمة لا لنا */
  title?: string
  body?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}) {
  const copy = COPY[kind]

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-3 rounded-md border border-dashed border-line-strong px-6 py-20 text-center',
        className,
      )}
    >
      <h3 className="display text-[20px]">{title ?? copy.title}</h3>
      <p className="max-w-[380px] text-[12.5px] leading-8 text-muted">{body ?? copy.body}</p>
      {onRetry && (
        <div className="mt-3">
          <Button size="sm" variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
