/**
 * شريط التنقّل السفلي للاستوديو.
 *
 * يعرض تبويبًا لكل لوحة تُفتح كورقة على هذا الجهاز فقط — فعلى اللوحي تبقى
 * الخزانة مرسّاة ويظهر تبويب الإطلالة وحده، وعلى الجوال يظهر الاثنان. القرار
 * يجي من خطة التخطيط بدل ما يُكرّر هنا بنقاط توقّف.
 */
import { Shirt, Sparkles, Wand2 } from 'lucide-react'
import { cn } from '@/shared/lib'
import type { LucideIcon } from 'lucide-react'

export type MobileSheet = 'wardrobe' | 'outfit' | undefined
type SheetId = Exclude<MobileSheet, undefined>

const TABS: Record<SheetId, { label: string; icon: LucideIcon }> = {
  wardrobe: { label: 'خزانتي', icon: Shirt },
  outfit: { label: 'الإطلالة', icon: Sparkles },
}

export function StudioMobileBar({
  sheets,
  active,
  wardrobeCount,
  outfitCount,
  onOpen,
  onAskStylist,
}: {
  /** اللوحات التي تُفتح كأوراق على هذا الجهاز */
  sheets: SheetId[]
  active: MobileSheet
  wardrobeCount: number
  outfitCount: number
  onOpen: (sheet: SheetId) => void
  onAskStylist: () => void
}) {
  if (sheets.length === 0) return null

  const counts: Record<SheetId, number> = { wardrobe: wardrobeCount, outfit: outfitCount }

  return (
    <nav
      aria-label="أقسام الاستوديو"
      className="flex flex-none items-stretch border-t border-line bg-canvas px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
    >
      {sheets.map((id) => {
        const { label, icon: Icon } = TABS[id]
        const badge = counts[id]

        return (
          <button
            key={id}
            onClick={() => onOpen(id)}
            aria-pressed={active === id}
            className={cn(
              'flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-md text-[11px] transition-colors',
              active === id ? 'bg-surface text-ink' : 'text-muted hover:bg-surface',
            )}
          >
            <span className="relative">
              <Icon size={17} strokeWidth={1.5} aria-hidden />
              {badge > 0 && (
                <span className="lat absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-1 text-[8.5px] text-white">
                  {badge}
                </span>
              )}
            </span>
            {label}
          </button>
        )
      })}

      <button
        onClick={onAskStylist}
        className="flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-md text-[11px] text-muted transition-colors hover:bg-surface hover:text-ink"
      >
        <Wand2 size={17} strokeWidth={1.5} aria-hidden />
        دولابي
      </button>
    </nav>
  )
}
