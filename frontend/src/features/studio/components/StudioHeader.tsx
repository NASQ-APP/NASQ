/**
 * ترويسة الاستوديو — بسيطة عمدًا.
 *
 * الاستوديو مساحة عمل تحتاج تركيزًا، فما فيه تنقّل كبير هنا: العنوان، قائمة
 * هادئة، وزر الحفظ الأساسي.
 */
import { useState } from 'react'
import { ChevronRight, Focus, Images, MoreHorizontal, Trash2, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/ui'
import { ROUTES } from '@/shared/config'

export function StudioHeader({
  focusMode,
  canSave,
  onToggleFocus,
  onSave,
  onClear,
  onUsePhoto,
}: {
  focusMode: boolean
  canSave: boolean
  onToggleFocus: () => void
  onSave: () => void
  onClear: () => void
  onUsePhoto: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const menu = [
    { icon: Focus, label: focusMode ? 'الخروج من وضع التركيز' : 'وضع التركيز', action: onToggleFocus },
    { icon: UserRound, label: 'طريقة المعاينة', action: onUsePhoto },
    { icon: Trash2, label: 'تفريغ الإطلالة', action: onClear },
  ]

  return (
    <header className="flex flex-none items-center justify-between gap-3 border-b border-line px-5 py-3">
      <div className="flex items-center gap-2">
        <Link
          to={ROUTES.home}
          aria-label="رجوع للرئيسية"
          className="grid h-8 w-8 place-items-center rounded-md text-faint transition-colors hover:bg-surface hover:text-ink"
        >
          <ChevronRight size={16} strokeWidth={1.5} aria-hidden />
        </Link>
        <h1 className="text-[15px]">استوديو التنسيق</h1>
      </div>

      <div className="relative flex items-center gap-2">
        <Link
          to={ROUTES.looks}
          className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] text-muted transition-colors hover:bg-surface hover:text-ink sm:inline-flex"
        >
          <Images size={13} strokeWidth={1.5} aria-hidden />
          إطلالاتي
        </Link>

        <button
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="خيارات الاستوديو"
          aria-expanded={menuOpen}
          className="grid h-8 w-8 place-items-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <MoreHorizontal size={16} strokeWidth={1.5} aria-hidden />
        </button>

        {menuOpen && (
          <div className="absolute left-0 top-10 z-30 w-52 rounded-md border border-line bg-canvas p-1 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.35)]">
            {menu.map(({ icon: Icon, label, action }) => (
              <button
                key={label}
                onClick={() => {
                  action()
                  setMenuOpen(false)
                }}
                className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-right text-[12px] text-muted transition-colors hover:bg-surface hover:text-ink"
              >
                <Icon size={13} strokeWidth={1.5} aria-hidden />
                {label}
              </button>
            ))}
          </div>
        )}

        <Button size="sm" onClick={onSave} disabled={!canSave}>
          حفظ الإطلالة
        </Button>
      </div>
    </header>
  )
}
