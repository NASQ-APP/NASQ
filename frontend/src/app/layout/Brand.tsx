import { Link } from 'react-router-dom'
import { Logo } from '@/shared/components/brand'
import { ROUTES } from '@/shared/config'
import { cn } from '@/shared/lib'

/** شعار التطبيق — العلامة مع الاسم، أو العلامة وحدها في المساحات الضيقة. */
export function Brand({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <Link to={ROUTES.home} className={cn('inline-flex', className)}>
      <Logo size={compact ? 22 : 25} />
    </Link>
  )
}
