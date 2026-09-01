import { useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { Drawer, Chip, EmptyState } from '@/shared/components/ui'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { SLOT_FILTERS, filterItems } from '@/domain/wardrobe'
import { useWardrobe } from '@/features/wardrobe/store'
import { slotOf } from '@/domain/outfit'
import { useStudio } from '../store'
import { cn } from '@/shared/lib'
import { useVoice } from '@/features/onboarding/voice'

export function ItemPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const say = useVoice()
  const { wardrobes, items } = useWardrobe()
  const studio = useStudio()
  const [term, setTerm] = useState('')
  const [wardrobeId, setWardrobeId] = useState<string>('all')
  const [slot, setSlot] = useState<string>('all')

  const visible = useMemo(() => {
    let pool = items
    if (wardrobeId === 'try') pool = pool.filter((i) => i.source === 'try')
    else if (wardrobeId !== 'all') pool = pool.filter((i) => i.wardrobeId === wardrobeId)
    if (slot !== 'all') pool = pool.filter((i) => slotOf(i) === slot)
    return filterItems(pool, { search: term })
  }, [items, wardrobeId, slot, term])

  const tryCount = items.filter((i) => i.source === 'try').length

  return (
    <Drawer open={open} onClose={onClose} eyebrow="Wardrobe" title={say('أضيفي قطع للإطلالة', 'أضِف قطع للإطلالة')} side="start">
      <div className="flex flex-col gap-4">
        <label className="flex h-11 items-center gap-3 rounded-md border border-line px-4">
          <Search size={15} strokeWidth={1.4} className="text-faint" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={say('ابحثي في خزائنك…', 'ابحث في خزائنك…')}
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-faint"
          />
        </label>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip active={wardrobeId === 'all'} onClick={() => setWardrobeId('all')} className="whitespace-nowrap">
            كل الخزائن
          </Chip>
          {wardrobes.map((w) => (
            <Chip
              key={w.id}
              active={wardrobeId === w.id}
              onClick={() => setWardrobeId(w.id)}
              className="whitespace-nowrap"
            >
              {w.name}
            </Chip>
          ))}
          {tryCount > 0 && (
            <Chip
              active={wardrobeId === 'try'}
              onClick={() => setWardrobeId('try')}
              className="whitespace-nowrap"
            >
              قطع للتجربة
            </Chip>
          )}
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {SLOT_FILTERS.map((f) => (
            <Chip
              key={f.slot}
              active={slot === f.slot}
              onClick={() => setSlot(f.slot)}
              className="whitespace-nowrap"
            >
              {f.name}
            </Chip>
          ))}
        </div>

        {visible.length === 0 ? (
          <EmptyState title="ما فيه قطع هنا." body={say('جرّبي خزانة ثانية أو غيّري الفلتر.', 'جرّب خزانة ثانية أو غيّر الفلتر.')} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {visible.map((item) => {
              const picked = studio.has(item.id)
              return (
                <button
                  key={item.id}
                  onClick={() => studio.toggle(item.id)}
                  className={cn(
                    'relative flex flex-col overflow-hidden rounded-md border bg-surface p-2 text-right transition-colors',
                    picked ? 'border-ink' : 'border-transparent hover:border-line-strong',
                  )}
                >
                  <ItemImage item={item} className="h-[110px] w-full" />
                  <span className="mt-1 line-clamp-1 text-[11.5px]">{item.name}</span>
                  {picked && (
                    <span className="absolute left-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-ink">
                      <Check size={11} strokeWidth={2.5} className="text-white" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </Drawer>
  )
}
