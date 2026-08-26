import { useState } from 'react'
import { Wand2 } from 'lucide-react'
import { ButtonLink, Chip, PageHeader, EmptyState } from '@/shared/components/ui'
import { PageContainer } from '@/shared/components/layout'
import { OCCASIONS } from '@/domain/wardrobe'
import { LookCard } from '@/features/looks/components/LookCard'
import { useLooks } from '@/features/looks/store'

export function LooksPage() {
  const looks = useLooks((s) => s.looks)
  const [occasion, setOccasion] = useState('all')

  const visible = occasion === 'all' ? looks : looks.filter((l) => l.occasion === occasion)

  return (
    <PageContainer>
      <PageHeader
        eyebrow="My looks"
        title="إطلالاتي"
        description={`${looks.length} إطلالة محفوظة من خزائنك.`}
        action={
          <ButtonLink to="/studio">
            <Wand2 size={14} strokeWidth={1.5} />
            إطلالة جديدة
          </ButtonLink>
        }
      />

      {looks.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2 border-b border-line pb-5">
          <Chip active={occasion === 'all'} onClick={() => setOccasion('all')}>
            الكل
          </Chip>
          {OCCASIONS.map((o) => (
            <Chip key={o.id} active={occasion === o.id} onClick={() => setOccasion(o.id)}>
              {o.name}
            </Chip>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title={looks.length ? 'ما فيه إطلالات بهذي المناسبة.' : 'ما فيه إطلالات محفوظة.'}
          body="ابدئي التنسيق من خزانتك واحفظي أول إطلالة."
          action={<ButtonLink to="/studio">افتحي الاستوديو</ButtonLink>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((look) => (
            <LookCard key={look.id} look={look} />
          ))}
        </div>
      )}
    </PageContainer>
  )
}
