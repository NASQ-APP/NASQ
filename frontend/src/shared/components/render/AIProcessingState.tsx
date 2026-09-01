/**
 * انتظار التوليد — **فوق المشهد لا بدلاً منه**.
 *
 * كان الاستوديو يخفي الموديل أثناء التوليد فتبقى أرضية فارغة ومؤشّر: تفقد
 * المستخدمة ما كانت تنظر إليه، والانتظار يصير أطول لأنه بلا سياق. هنا يبقى
 * كل شيء مكانه ويمرّ فوقه حجاب خفيف.
 *
 * والمراحل تبقى معلَنة كما هي — التوحيد لغة بصرية واحدة، لا رسالة واحدة لكل
 * شيء. «نركّب إطلالتك…» تقول أكثر بكثير من «جاري التحميل».
 */
import { LogoMark } from '@/shared/components/brand'
import { cn } from '@/shared/lib'

export type AIStageLabel = { id: string; label: string }

export function AIProcessingState({
  stage,
  stages,
  className,
}: {
  /** معرّف المرحلة الحالية — من الخطّاف لا من مؤقّت */
  stage?: string
  stages: readonly AIStageLabel[]
  className?: string
}) {
  const index = stages.findIndex((entry) => entry.id === stage)
  const reached = index < 0 ? 0 : index

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        // الحجاب خفيف عمدًا: يقول «موقوف مؤقتًا» ولا يحجب ما تحته
        'page-in absolute inset-0 z-10 flex flex-col items-center justify-center',
        'bg-canvas/55 backdrop-blur-[2px]',
        className,
      )}
    >
      <LogoMark size={30} className="logo-breathe text-ink" />

      <ul className="mt-8 w-full max-w-[280px]">
        {stages.map((entry, position) => (
          <li
            key={entry.id}
            className={cn(
              'py-1 text-center text-[12px] transition-colors',
              position <= reached ? 'text-ink' : 'text-faint',
            )}
          >
            {entry.label}
          </li>
        ))}
      </ul>

      <span className="thread mt-6" aria-hidden />
      <span className="sr-only">جاري التحميل</span>
    </div>
  )
}
