/**
 * يوم واحد من الرحلة.
 *
 * بطاقة مستقلة بدل صف في جدول: اليوم وحدة تخطيط قائمة بذاتها — له تسمية
 * تُعدَّل، وإطلالة تُعرض، وأفعال خاصة به. والتسمية قابلة للكتابة هنا لأن
 * «عشاء» و«المطار» تفرق في اختيار القطع أكثر من رقم اليوم.
 */
import { useState } from 'react'
import { Pencil, Plus, Sparkles, X } from 'lucide-react'
import { Button, TextInput } from '@/shared/components/ui'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { cn } from '@/shared/lib'
import { useVoice } from '@/features/onboarding/voice'
import type { TripDay } from '@/domain/travel'
import type { WardrobeItem } from '@/domain/wardrobe'

export function DayCard({
  day,
  items,
  onEdit,
  onRename,
  onClear,
  onPreview,
}: {
  day: TripDay
  items: WardrobeItem[]
  onEdit: () => void
  onRename: (label: string) => void
  onClear: () => void
  onPreview: () => void
}) {
  const say = useVoice()
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(day.label)

  const commit = () => {
    const next = draft.trim()
    if (next && next !== day.label) onRename(next)
    else setDraft(day.label)
    setRenaming(false)
  }

  const planned = items.length > 0

  return (
    <article
      className={cn(
        'flex flex-col gap-4 rounded-md border p-5 transition-colors duration-[250ms]',
        planned ? 'border-line' : 'border-dashed border-line',
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="lat text-[9.5px] tracking-[0.22em] text-faint">
            DAY {String(day.day).padStart(2, '0')}
          </p>

          {renaming ? (
            <TextInput
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commit()
                if (event.key === 'Escape') {
                  setDraft(day.label)
                  setRenaming(false)
                }
              }}
              className="mt-1 h-8 text-[13.5px]"
              aria-label={`تسمية اليوم ${day.day}`}
            />
          ) : (
            <button
              onClick={() => setRenaming(true)}
              title="تعديل التسمية"
              className="group mt-1 flex items-center gap-1.5 text-[14px] transition-colors hover:text-ink"
            >
              {day.label}
              <Pencil
                size={11}
                strokeWidth={1.5}
                aria-hidden
                className="text-faint opacity-0 transition-opacity group-hover:opacity-100"
              />
            </button>
          )}
        </div>

        {planned && (
          <button
            onClick={onClear}
            aria-label={`تفريغ اليوم ${day.day}`}
            title="تفريغ اليوم"
            className="grid h-7 w-7 flex-none place-items-center rounded-sm text-faint transition-colors hover:bg-surface hover:text-ink"
          >
            <X size={13} strokeWidth={1.5} aria-hidden />
          </button>
        )}
      </header>

      {planned ? (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              title={item.name}
              className="grid h-14 w-12 place-items-center overflow-hidden rounded-sm bg-surface"
            >
              <ItemImage item={item} className="h-[78%] w-[78%]" />
            </li>
          ))}
        </ul>
      ) : (
        <button
          onClick={onEdit}
          className="flex h-14 items-center justify-center gap-2 rounded-sm bg-surface text-[12px] text-muted transition-colors hover:text-ink"
        >
          <Plus size={13} strokeWidth={1.5} aria-hidden />
          {say('أضيفي إطلالة', 'أضِف إطلالة')}
        </button>
      )}

      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={onEdit}>
          {planned ? 'تعديل' : 'اختيار القطع'}
        </Button>
        {planned && (
          <Button size="sm" variant="ghost" onClick={onPreview}>
            <Sparkles size={12} strokeWidth={1.5} aria-hidden />
            اعرضيها
          </Button>
        )}
      </div>
    </article>
  )
}
