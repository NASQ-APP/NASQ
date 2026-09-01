import { Menu, Plus } from 'lucide-react'
import { Brand } from './Brand'
import { Button, SearchInput } from '@/shared/components/ui'
import { layers, shell } from '@/theme'
import { useVoice } from '@/features/onboarding/voice'

/** شريط علوي ثابت بخلفية شفافة وتأثير blur. */
export function TopBar({
  term,
  onTermChange,
  onSearch,
  onOpenNav,
  onOpenAdd,
}: {
  term: string
  onTermChange: (value: string) => void
  onSearch: () => void
  onOpenNav: () => void
  onOpenAdd: () => void
}) {
  const say = useVoice()

  return (
    <header
      style={{ zIndex: layers.header, height: shell.topBarHeight }}
      className="sticky top-0 flex flex-none items-center gap-3 border-b border-line bg-canvas/75 px-6 backdrop-blur-md"
    >
      <button className="lg:hidden" onClick={onOpenNav} aria-label="القائمة">
        <Menu size={20} strokeWidth={1.4} />
      </button>
      <Brand compact className="lg:hidden" />

      <SearchInput
        value={term}
        onChange={onTermChange}
        onSubmit={onSearch}
        placeholder={say('ابحثي في خزائنك…', 'ابحث في خزائنك…')}
        className="hidden h-9 max-w-[360px] flex-1 sm:flex"
      />

      {/* التسمية مخفية على الشاشات الصغيرة، فالاسم البديل مطلوب دائمًا (X-09) */}
      <div className="me-0 ms-auto flex items-center gap-2">
        <Button size="sm" onClick={onOpenAdd} aria-label="إضافة قطعة">
          <Plus size={14} strokeWidth={1.6} aria-hidden />
          <span className="hidden sm:inline">إضافة قطعة</span>
        </Button>
      </div>
    </header>
  )
}
