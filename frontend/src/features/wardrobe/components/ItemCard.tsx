import { Link, useNavigate } from 'react-router-dom'
import { Heart, Sparkles } from 'lucide-react'
import { categoryById } from '@/domain/wardrobe'
import { sourceById } from '@/features/try-pieces/sources'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { Badge, ColorSwatch, toast } from '@/shared/components/ui'
import { useWardrobe } from '../store'
import { useStudio } from '@/features/studio/store'
import { ROUTES } from '@/shared/config'
import { cn } from '@/shared/lib'
import type { WardrobeItem } from '@/domain/wardrobe'

/** بطاقة قطعة — مربّعة، خلفية ثانوية، والحدّ يخفّ عند المرور. */
export function ItemCard({ item }: { item: WardrobeItem }) {
  const navigate = useNavigate()
  const toggleFavorite = useWardrobe((state) => state.toggleFavorite)
  const studio = useStudio()
  const category = categoryById(item.categoryId)
  const store = sourceById(item.storeId)
  const inStudio = studio.has(item.id)

  return (
    <article className="group flex flex-col">
      <div
        className={cn(
          'lift relative aspect-square overflow-hidden rounded-md border bg-surface',
          inStudio ? 'border-ink' : 'border-line group-hover:border-line-strong',
        )}
      >
        <Link to={ROUTES.item(item.id)} className="block h-full w-full">
          <ItemImage item={item} className="h-full w-full p-5" />
        </Link>

        {item.source === 'try' && (
          <span className="absolute right-3 top-3">
            <Badge tone="dark">{store ? store.latin : 'Try'}</Badge>
          </span>
        )}

        <button
          onClick={() => {
            toggleFavorite(item.id)
            toast.ok(item.favorite ? 'أزلناها من المفضلة' : 'حفظناها في المفضلة')
          }}
          aria-label={item.favorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          className={cn(
            'absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-canvas/80 transition-opacity duration-[320ms] ease-soft',
            item.favorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
          )}
        >
          <Heart
            size={13}
            strokeWidth={1.5}
            aria-hidden
            className={item.favorite ? 'fill-ink text-ink' : 'text-muted'}
          />
        </button>

        <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-[320ms] ease-soft group-hover:translate-y-0 group-hover:opacity-100 focus-within:translate-y-0 focus-within:opacity-100">
          <button
            onClick={() => {
              studio.add(item.id)
              navigate(ROUTES.studio)
            }}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-line bg-canvas/90 text-[11.5px] backdrop-blur-sm transition-colors duration-[320ms] ease-soft hover:bg-ink-soft hover:text-white"
          >
            <Sparkles size={13} strokeWidth={1.5} aria-hidden />
            نسّقيها
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1">
        <Link to={ROUTES.item(item.id)} className="text-[12.5px] leading-6 hover:underline">
          {item.name}
        </Link>
        <p className="flex items-center gap-2 text-[11px] text-faint">
          <ColorSwatch hex={item.colorHex} label={item.colorName} size="sm" />
          {category?.name}
          {item.size ? ` · ${item.size}` : ''}
        </p>
      </div>
    </article>
  )
}
