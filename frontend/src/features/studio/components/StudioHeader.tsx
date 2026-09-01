/**
 * ترويسة الاستوديو — بسيطة عمدًا.
 *
 * الاستوديو مساحة عمل تحتاج تركيزًا، فما فيه تنقّل كبير هنا: العنوان، قائمة
 * هادئة، وزر الحفظ الأساسي.
 */
import { useState } from 'react'
import { ChevronRight, Focus, Images, MoreHorizontal, Save, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, ButtonLink } from '@/shared/components/ui'
import { ROUTES } from '@/shared/config'

export function StudioHeader({
  focusMode,
  canSave,
  selectedCount,
  onToggleFocus,
  onSave,
  onClear,
}: {
  focusMode: boolean
  canSave: boolean
  selectedCount: number
  onToggleFocus: () => void
  onSave: () => void
  onClear: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const menu = [
    { icon: Focus, label: focusMode ? 'الخروج من وضع التركيز' : 'وضع التركيز', action: onToggleFocus },
    { icon: Trash2, label: 'تفريغ الإطلالة', action: onClear },
  ]

  return (
    <header className="flex flex-none items-center justify-between gap-3 border-b border-line bg-canvas px-3 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        {/* الاستوديو شاشة تملأ النافذة بلا شريط تنقّل — فطريق الخروج لازم يبين */}
        <ButtonLink
          to={ROUTES.home}
          variant="secondary"
          size="sm"
          className="flex-none"
        >
          <ChevronRight size={15} strokeWidth={1.6} aria-hidden />
          <span className="hidden sm:inline">رجوع</span>
        </ButtonLink>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-[16px] sm:text-[17px]">استوديو التنسيق</h1>
            {selectedCount > 0 && (
              <span className="hidden rounded-full bg-surface px-2 py-0.5 text-[10.5px] text-muted sm:inline">
                {selectedCount} {selectedCount === 1 ? 'قطعة' : 'قطع'}
              </span>
            )}
          </div>
          <p className="mt-0.5 hidden text-[11px] text-faint md:block">
            اختاري القطع، عاينيها على الموديل، ثم احفظي إطلالتك.
          </p>
        </div>
      </div>

      <div className="relative flex items-center gap-2">
        <Link
          to={ROUTES.looks}
          className="hidden h-9 items-center gap-1.5 rounded-md px-3 text-[11.5px] text-muted transition-colors hover:bg-surface hover:text-ink md:inline-flex"
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
          <Save size={13} strokeWidth={1.5} aria-hidden />
          <span className="hidden sm:inline">حفظ الإطلالة</span>
          <span className="sm:hidden">حفظ</span>
        </Button>
      </div>
    </header>
  )
}
