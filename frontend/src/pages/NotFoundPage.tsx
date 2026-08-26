import { ButtonLink, EmptyState } from '@/shared/components/ui'
import { PageContainer } from '@/shared/components/layout'

export function NotFoundPage() {
  return (
    <PageContainer width="prose" className="py-24">
      <EmptyState
        title="الصفحة غير موجودة."
        body="يمكن الرابط تغيّر أو انحذف."
        action={<ButtonLink to="/">الرئيسية</ButtonLink>}
      />
    </PageContainer>
  )
}
