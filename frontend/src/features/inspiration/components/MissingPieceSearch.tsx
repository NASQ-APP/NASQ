/**
 * قطعة من اللوك ما تملكينها — وين تلقينها.
 *
 * ما نخترع منتجًا ولا سعرًا: نفتح **بحث المتجر نفسه** عن نفس الوصف، فتشوفين
 * نتائجه الحقيقية وتضيفين ما يعجبك بزر الإضافة أو باللصق. وقبل هذا كله نقول
 * لك إن كان عندك في خزانتك ما يشبهها أصلًا.
 */
import { ExternalLink } from 'lucide-react'
import { ButtonAnchor } from '@/shared/components/ui'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { useWardrobe } from '@/features/wardrobe/store'
import { searchStores } from '@/features/try-pieces/store-search'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/shared/config'
import type { WardrobeItem } from '@/domain/wardrobe'

/** تطابق بسيط بالكلمات: اسم القطعة أو لونها أو فئتها يذكر ما تبحث عنه. */
function fromWardrobe(items: WardrobeItem[], query: string): WardrobeItem[] {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2)
  if (words.length === 0) return []

  return items
    .map((item) => {
      const haystack = `${item.name} ${item.colorName} ${item.brand ?? ''}`.toLowerCase()
      return { item, score: words.filter((word) => haystack.includes(word)).length }
    })
    .filter((entry) => entry.score > 0)
    .toSorted((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.item)
}

export function MissingPieceSearch({ query }: { query: string }) {
  const items = useWardrobe((s) => s.items)
  const owned = fromWardrobe(items, query)
  const stores = searchStores(query)

  return (
    <div>
      {owned.length > 0 && (
        <div className="mb-3">
          <p className="mb-2 text-[11.5px] text-muted">عندك في خزانتك ما يشبهها:</p>
          <div className="flex gap-2">
            {owned.map((item) => (
              <Link
                key={item.id}
                to={ROUTES.item(item.id)}
                title={item.name}
                className="h-14 w-11 flex-none overflow-hidden rounded-md border border-line bg-surface"
              >
                <ItemImage item={item} className="h-full w-full p-1" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="mb-2 text-[11.5px] text-muted">
        {owned.length > 0 ? 'أو دوّري عليها في المتاجر:' : 'دوّري عليها في المتاجر:'}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {stores.map(({ store, url }) => (
          <ButtonAnchor
            key={store.id}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            variant="secondary"
            className="lat h-8 px-2.5 text-[10.5px]"
          >
            <ExternalLink size={11} strokeWidth={1.5} />
            {store.latin}
          </ButtonAnchor>
        ))}
      </div>
    </div>
  )
}
