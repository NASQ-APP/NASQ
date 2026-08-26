import { cn } from '@/shared/lib'

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('skeleton rounded-md', className)} aria-hidden />
)

/** الهيكل المطابق لبطاقة القطعة — يمنع قفزة التخطيط أثناء التحميل. */
export function ItemCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="mt-3 h-3 w-2/3" />
      <Skeleton className="mt-2 h-3 w-1/3" />
    </div>
  )
}
