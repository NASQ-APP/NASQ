/**
 * «وش ألبس اليوم؟» — ثلاث إطلالات جاهزة فوق الخزائن في الرئيسية.
 *
 * كلها مركّبة من قطع المستخدمة نفسها (المبدأ ٢)، والضغط عليها يجهّزها في
 * الاستوديو مباشرة بدل ما تبدأ من صفر كل صباح.
 */
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { SectionHeader, toast } from '@/shared/components/ui'
import { useWardrobe } from '@/features/wardrobe/store'
import { useStudio } from '@/features/studio/store'
import { ownedItems } from '@/domain/wardrobe'
import { ROUTES } from '@/shared/config'
import { dailyLooks, type DailyLook } from '../suggest'
import type { WardrobeItem } from '@/domain/wardrobe'

const MAX_THUMBS = 4

export function DailySuggestions({ onAskStylist }: { onAskStylist: () => void }) {
  const items = useWardrobe((state) => state.items)
  const owned = useMemo(() => ownedItems(items), [items])
  const looks = useMemo(() => dailyLooks(owned), [owned])

  if (looks.length === 0) return null

  return (
    <section className="mb-16">
      <SectionHeader
        eyebrow="Today"
        title="وش ألبس اليوم؟"
        action={
          <button onClick={onAskStylist} className="text-[12px] text-muted hover:text-ink">
            اسألي عن شي ثاني
          </button>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        {looks.map((look) => (
          <SuggestionCard key={look.occasionId} look={look} items={owned} />
        ))}
      </div>
    </section>
  )
}

function SuggestionCard({ look, items }: { look: DailyLook; items: WardrobeItem[] }) {
  const navigate = useNavigate()
  const replaceAll = useStudio((state) => state.replaceAll)

  const pieces = look.itemIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is WardrobeItem => Boolean(item))

  if (pieces.length === 0) return null

  const wear = () => {
    replaceAll(look.itemIds)
    toast.ok('جهّزنا الإطلالة في الاستوديو')
    navigate(ROUTES.studio)
  }

  return (
    <button
      onClick={wear}
      aria-label={`جرّبي إطلالة ${look.occasionLabel} — ${pieces.length} قطع`}
      className="lift group flex flex-col overflow-hidden rounded-md border border-line bg-canvas text-right hover:border-line-strong"
    >
      <span className="flex items-center justify-center gap-1 bg-surface px-3 py-5">
        {pieces.slice(0, MAX_THUMBS).map((piece) => (
          <ItemImage key={piece.id} item={piece} className="h-20 w-16 flex-1" />
        ))}
      </span>

      <span className="flex flex-1 flex-col gap-1.5 border-t border-line px-5 py-4">
        <span className="eyebrow">{look.occasionLabel}</span>
        <span className="text-[12.5px] leading-7 text-muted">{look.reason}</span>
        <span className="mt-1 flex items-center gap-1.5 text-[11.5px] text-ink">
          جرّبيها على موديلك
          <ArrowLeft
            size={13}
            strokeWidth={1.6}
            aria-hidden
            className="transition-transform duration-[320ms] ease-soft group-hover:-translate-x-1"
          />
        </span>
      </span>
    </button>
  )
}
