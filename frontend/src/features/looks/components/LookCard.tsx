import { useNavigate } from 'react-router-dom'
import { Trash2, Wand2 } from 'lucide-react'
import { Badge, Button, toast } from '@/shared/components/ui'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { occasionName } from '@/domain/wardrobe'
import { useWardrobe } from '@/features/wardrobe/store'
import { useStudio } from '@/features/studio/store'
import { useLooks } from '../store'
import { formatShortDate } from '@/shared/lib'
import type { SavedLook } from '@/domain/outfit'

export function LookCard({ look }: { look: SavedLook }) {
  const navigate = useNavigate()
  const allItems = useWardrobe((s) => s.items)
  const studio = useStudio()
  const remove = useLooks((s) => s.remove)

  const items = look.itemIds.map((id) => allItems.find((i) => i.id === id)).filter(Boolean)
  const missing = look.itemIds.length - items.length

  return (
    <article className="group flex flex-col overflow-hidden rounded-md border border-line">
      <div className="relative grid h-[300px] place-items-center bg-surface">
        <img src={look.resultImageUrl} alt={look.name} className="h-full w-full object-contain p-3" />
        <div className="absolute right-3 top-3 flex gap-1.5">
          <Badge tone="dark">Look #{look.number}</Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[14px]">{look.name}</p>
            <p className="mt-0.5 text-[11.5px] text-faint">
              {occasionName(look.occasion)} · {look.itemIds.length} قطع
            </p>
          </div>
          <span className="lat flex-none text-[10.5px] text-faint">
            {formatShortDate(look.createdAt)}
          </span>
        </div>

        <ul className="mt-4 flex gap-2">
          {items.map(
            (item) =>
              item && (
                <li key={item.id}>
                  <ItemImage
                    item={item}
                    className="h-[50px] w-[40px] rounded bg-surface p-1"
                    alt={item.name}
                  />
                </li>
              ),
          )}
          {missing > 0 && (
            <li className="grid h-[50px] w-[40px] place-items-center rounded bg-surface text-[10px] text-faint">
              −{missing}
            </li>
          )}
        </ul>
        {missing > 0 && (
          <p className="mt-2 text-[10.5px] text-faint">
            {missing} من القطع انحذفت من خزانتك.
          </p>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Button
            size="sm"
            onClick={() => {
              studio.replaceAll(items.map((i) => i!.id))
              navigate('/studio')
            }}
          >
            <Wand2 size={13} strokeWidth={1.5} />
            ألبسيها اليوم
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              remove(look.id)
              toast.ok('حذفنا الإطلالة')
            }}
          >
            <Trash2 size={13} strokeWidth={1.5} />
          </Button>
        </div>
      </div>
    </article>
  )
}
