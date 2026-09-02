/**
 * الانتظار الكبير — إقلاع التطبيق، وحسم الجلسة، وما يأخذ الشاشة كلها.
 *
 * العلامة نفسها التي في الشريط الجانبي، لا رسمة ثانية: المستخدمة تنتظر أمام
 * شيء تعرفه، فيبقى الانتظار داخل التطبيق لا خارجه.
 *
 * **الاسم يثبت والعلامة تتنفّس.** جرّبنا تنفّس الكتلة كاملة فبهت الاسم مع كل
 * دورة وبدا المشهد مترددًا. تثبيت الاسم يعطي المشهد مركزًا ساكنًا، وتصير
 * الحركة مقصودة لا عامّة.
 *
 * والخيط **تحت الرسالة لا تحت الاسم**: وضعه ملاصقًا للاسم يقرأ خطًّا تحته
 * كأنه من الشعار، فيضيع كونه مؤشّر انتظار.
 *
 * **لا يُستعمل لكل طلب**: حذف قطعة أو تبديل فلتر يأخذ `InlineLoader` أو حالة
 * الزر. شاشة كاملة لأجل نداء صغير تقطع السياق وتخسر مكان المستخدمة.
 */
import { APP } from '@/shared/config'
import { LogoMark } from '@/shared/components/brand'
import { cn } from '@/shared/lib'

export type GlobalLoaderProps = {
  /** ما ننتظره بالضبط — «نجهّز خزانتك…». يُقرأ صوتيًا مع المؤشّر. */
  message?: string
  /** يأخذ الشاشة كاملة (الإقلاع)، أو يبقى داخل حاويته (قسم من صفحة). */
  fullScreen?: boolean
  /** حجم العلامة — يصغر على الجوال ويكبر على المكتب */
  size?: 'sm' | 'md'
  className?: string
}

const MARK = { sm: 28, md: 40 } as const

export function GlobalLoader({
  message,
  fullScreen,
  size = 'md',
  className,
}: GlobalLoaderProps) {
  /*
    الاسم مع شاشة الإقلاع وحدها. تكراره فوق كل قسم يحمّل الصفحة هوية لا
    تحتاجها — المستخدمة داخل التطبيق أصلاً وتعرف أين هي.
  */
  const branded = Boolean(fullScreen)

  return (
    <div
      // `status` مع `polite`: يُعلن بلا مقاطعة لما تقرأه المستخدمة الآن
      role="status"
      aria-live="polite"
      className={cn(
        'page-in flex flex-col items-center justify-center text-center',
        fullScreen ? 'min-h-screen w-full bg-canvas' : 'w-full py-20',
        className,
      )}
    >
      <span className="inline-flex flex-col items-center gap-4 text-ink">
        <LogoMark size={MARK[branded ? 'md' : size]} className="logo-breathe" />

        {branded && (
          <span className="flex flex-col items-center">
            <span
              className="font-heading leading-none"
              style={{ fontSize: 27, fontWeight: 300, letterSpacing: '-0.01em' }}
            >
              {APP.name}
            </span>
            <span className="lat mt-2 text-[9px] opacity-45">{APP.latin}</span>
          </span>
        )}
      </span>

      {message && (
        <p className={cn('text-[12.5px] leading-7 text-muted', branded ? 'mt-14' : 'mt-8')}>
          {message}
        </p>
      )}

      {/* خيط يمرّ فيه ضوء — يقول «يجري شيء» بلا ادّعاء تقدّم */}
      <span className={cn('thread', message ? 'mt-5' : 'mt-8')} aria-hidden />

      {/*
        نصّ للقارئ الصوتي دائمًا: الرسالة قد تغيب، و«جاري التحميل» هي الحقيقة
        التي لا تتغيّر. مخفيّ بصريًا بلا `display:none` — المخفيّ بذاك لا يُقرأ.
      */}
      <span className="sr-only">جاري التحميل</span>
    </div>
  )
}
