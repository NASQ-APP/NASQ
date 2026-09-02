/**
 * هياكل التحميل — واحد لكل تخطيط، لا هيكل عام لكل شيء.
 *
 * الغاية أن تبقى الصفحة في مكانها: الهيكل يحجز نفس المساحة التي سيأخذها
 * المحتوى، فما تقفز الشبكة عند وصول البيانات. وهيكل لا يشبه ما بعده يخالف
 * غرضه — يصير زينة انتظار بدل وعدٍ بالشكل القادم.
 *
 * الاستدارة والفواصل من نفس البطاقات الحقيقية عمدًا.
 */
import { ItemCardSkeleton, Skeleton } from '@/shared/components/ui'
import { cn } from '@/shared/lib'

/** شبكة الخزانة — نفس أعمدة `ItemGrid` وفواصلها. */
export function WardrobeGridSkeleton({
  count = 8,
  compact,
}: {
  count?: number
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'grid gap-4 md:gap-6',
        compact
          ? 'grid-cols-3 md:grid-cols-5 xl:grid-cols-6'
          : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
      )}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, index) => (
        <ItemCardSkeleton key={index} />
      ))}
    </div>
  )
}

/** بطاقات الإطلالات — أطول من مربّع القطعة لأن الإطلالة بطول الجسم. */
export function LooksGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          <Skeleton className="aspect-[3/4] w-full" />
          <Skeleton className="mt-3 h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

/** صفوف الإعدادات — عنوان الحقل ثم مربّعه. */
export function SettingsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index}>
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="mt-3 h-10 w-full" />
        </div>
      ))}
    </div>
  )
}
