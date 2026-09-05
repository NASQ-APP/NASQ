import { NavLink } from 'react-router-dom'
import { NAV_GROUPS } from './navigation'
import { useAuth } from '@/features/auth/store'
import { cn } from '@/shared/lib'

/** قائمة الروابط — يشترك فيها الشريط الجانبي والقائمة المنسدلة على الجوال. */
export function NavList({
  onNavigate,
  collapsed,
}: {
  onNavigate?: () => void
  collapsed?: boolean
}) {
  const signedIn = useAuth((state) => Boolean(state.user))

  return (
    <nav className={cn('flex flex-1 flex-col overflow-y-auto py-2', collapsed ? 'px-2' : 'px-3')}>
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          {collapsed ? (
            <span className="my-3 block h-px bg-line" aria-hidden />
          ) : (
            <p className="eyebrow px-3 pb-2 pt-5">{group.label}</p>
          )}
          {group.links
            .filter((link) => signedIn || !link.needsAccount)
            .map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onNavigate}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md text-[12.5px] transition-colors duration-[320ms] ease-soft',
                    collapsed ? 'h-10 w-10 justify-center' : 'px-3 py-2.5',
                    isActive ? 'bg-ink text-white' : 'text-muted hover:bg-surface hover:text-ink',
                  )
                }
              >
                <Icon size={17} strokeWidth={1.4} />
                {!collapsed && label}
              </NavLink>
            ))}
        </div>
      ))}
    </nav>
  )
}
