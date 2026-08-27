import { Link } from 'react-router-dom'
import { LogIn, PanelLeftClose, PanelLeftOpen, UserRound } from 'lucide-react'
import { Brand } from './Brand'
import { NavList } from './NavList'
import { useSidebar } from './useSidebar'
import { useAiModels } from '@/features/ai-model/store'
import { useAuth } from '@/features/auth/store'
import { useWardrobe } from '@/features/wardrobe/store'
import { ownedItems } from '@/domain/wardrobe'
import { ROUTES } from '@/shared/config'
import { cn } from '@/shared/lib'

/** شريط جانبي هادئ — هذي أداة شخصية تعيشين فيها، مو واجهة متجر تعبرينها. */
export function Sidebar() {
  const { collapsed, toggle } = useSidebar()
  const user = useAuth((state) => state.user)
  const model = useAiModels((state) => state.models[0])
  const items = useWardrobe((state) => state.items)
  const itemCount = ownedItems(items).length

  return (
    <aside className="sticky top-0 hidden h-screen flex-col border-l border-line bg-canvas lg:flex">
      <div
        className={cn(
          'flex items-center gap-2 pb-5 pt-6',
          collapsed ? 'justify-center px-2' : 'px-5',
        )}
      >
        {!collapsed && <Brand className="flex-1" />}
        <button
          onClick={toggle}
          aria-label={collapsed ? 'توسيع القائمة' : 'طيّ القائمة'}
          title={collapsed ? 'توسيع القائمة' : 'طيّ القائمة'}
          aria-expanded={!collapsed}
          className="grid h-9 w-9 flex-none place-items-center rounded-md text-faint transition-colors duration-[320ms] ease-soft hover:bg-surface hover:text-ink"
        >
          {collapsed ? (
            <PanelLeftOpen size={16} strokeWidth={1.4} />
          ) : (
            <PanelLeftClose size={16} strokeWidth={1.4} />
          )}
        </button>
      </div>

      <NavList collapsed={collapsed} />

      <div className={cn('flex flex-col border-t border-line', collapsed ? 'p-2' : 'p-3')}>
        <Link
          to={ROUTES.models}
          title={collapsed ? (model?.name ?? 'موديلي') : undefined}
          className={cn(
            'flex items-center gap-3 rounded-md transition-colors duration-[320ms] ease-soft hover:bg-surface',
            collapsed ? 'justify-center p-1.5' : 'px-3 py-2.5',
          )}
        >
          <span className="grid h-9 w-9 flex-none place-items-center overflow-hidden rounded-full border border-line bg-surface">
            {model ? (
              <img src={model.previewImageUrl} alt="" className="h-[150%] w-[150%] object-contain" />
            ) : (
              <UserRound size={15} strokeWidth={1.4} aria-hidden className="text-faint" />
            )}
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-[12.5px]">{model?.name ?? 'موديلي'}</span>
              <span className="lat block text-[9.5px] text-faint">{itemCount} pieces</span>
            </span>
          )}
        </Link>

        {/* الحساب اختياري: مدخل هادئ، ما يوقف أحدًا عن دخول دولابه */}
        <Link
          to={user ? ROUTES.settings : ROUTES.login}
          title={collapsed ? (user ? user.name : 'تسجيل الدخول') : undefined}
          className={cn(
            'flex items-center gap-3 rounded-md text-muted transition-colors duration-[320ms] ease-soft hover:bg-surface hover:text-ink',
            collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5',
          )}
        >
          <LogIn size={15} strokeWidth={1.4} aria-hidden className="flex-none" />
          {!collapsed && (
            <span className="truncate text-[12.5px]">{user ? user.name : 'تسجيل الدخول'}</span>
          )}
        </Link>
      </div>
    </aside>
  )
}
