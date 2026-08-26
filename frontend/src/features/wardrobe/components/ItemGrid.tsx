import { ItemCard } from './ItemCard'
import { ItemCardSkeleton } from '@/shared/components/ui'
import { cn } from '@/shared/lib'
import type { WardrobeItem } from '@/domain/wardrobe'

/** شبكة القطع — عرضان: شبكي واسع ومضغوط (W-04). */
export function ItemGrid({
  items,
  loading,
  compact,
  skeletonCount = 8,
}: {
  items?: WardrobeItem[]
  loading?: boolean
  compact?: boolean
  skeletonCount?: number
}) {
  const grid = cn(
    'grid gap-4 md:gap-6',
    compact
      ? 'grid-cols-3 md:grid-cols-5 xl:grid-cols-6'
      : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
  )

  if (loading) {
    return (
      <div className={grid}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <ItemCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  return (
    <div className={grid}>
      {items?.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}
