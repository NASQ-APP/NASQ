import { Link } from 'react-router-dom'
import { APP, ROUTES } from '@/shared/config'
import { cn } from '@/shared/lib'

/** شعار التطبيق — الاسم العربي فوق تسميته اللاتينية. */
export function Brand({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <Link to={ROUTES.home} className={cn('flex flex-col gap-0.5', className)}>
      <span className={compact ? 'text-[17px]' : 'text-[19px]'}>
        {compact ? APP.shortName : APP.name}
      </span>
      {!compact && <span className="lat text-[8.5px] text-faint">{APP.latin}</span>}
    </Link>
  )
}
