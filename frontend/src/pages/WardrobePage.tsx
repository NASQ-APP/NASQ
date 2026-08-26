import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Grid3x3, Heart, Plus, Rows3, Trash2 } from 'lucide-react'
import {
  Button,
  ButtonLink,
  Chip,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  SearchInput,
  Segmented,
  toast,
} from '@/shared/components/ui'
import { PageContainer } from '@/shared/components/layout'
import { SLOT_FILTERS, filterItems } from '@/domain/wardrobe'
import { AddItemModal } from '@/features/wardrobe/components/AddItemModal'
import { ItemGrid } from '@/features/wardrobe/components/ItemGrid'
import { useWardrobe } from '@/features/wardrobe/store'
import { slotOf } from '@/domain/outfit'
import { cn, formatDate } from '@/shared/lib'

export function WardrobePage() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const { wardrobes, items, deleteWardrobe } = useWardrobe()
  const [addOpen, setAddOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [view, setView] = useState<'grid' | 'compact'>('grid')

  const wardrobe = wardrobes.find((w) => w.id === id)
  const slot = params.get('slot') ?? 'all'
  const term = params.get('q') ?? ''
  const favOnly = params.get('fav') === '1'

  const visible = useMemo(() => {
    if (!wardrobe) return []
    let pool = items.filter((i) => i.wardrobeId === wardrobe.id && i.source === 'wardrobe')
    if (slot !== 'all') pool = pool.filter((i) => slotOf(i) === slot)
    return filterItems(pool, { search: term, favoritesOnly: favOnly })
  }, [items, wardrobe, slot, term, favOnly])

  if (!wardrobe) {
    return (
      <PageContainer width="narrow" className="py-20">
        <EmptyState
          title="الخزانة غير موجودة."
          body="ممكن تكون انحذفت."
          action={<ButtonLink to="/wardrobes">خزائني</ButtonLink>}
        />
      </PageContainer>
    )
  }

  const patch = (key: string, value?: string | null) => {
    const next = new URLSearchParams(params)
    if (!value) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const total = items.filter((i) => i.wardrobeId === wardrobe.id && i.source === 'wardrobe').length

  return (
    <PageContainer>
      <nav className="lat mb-6 flex items-center gap-2 text-[10px] text-faint">
        <Link to="/wardrobes" className="hover:text-ink">
          Wardrobes
        </Link>
        <ChevronLeft size={12} />
        <span>{wardrobe.nameLatin}</span>
      </nav>

      <PageHeader
        eyebrow={wardrobe.nameLatin}
        title={`خزانة ${wardrobe.name}`}
        description={`${total} قطعة · آخر تحديث ${formatDate(wardrobe.updatedAt)}`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setConfirmDelete(true)} aria-label="حذف الخزانة">
              <Trash2 size={14} strokeWidth={1.5} />
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus size={14} strokeWidth={1.6} />
              إضافة قطعة
            </Button>
          </div>
        }
      />

      <div className="mb-8 flex flex-wrap items-center gap-3 border-b border-line pb-5">
        <SearchInput
          value={term}
          onChange={(value) => patch('q', value || null)}
          placeholder="ابحثي في القطع…"
          className="w-full max-w-[240px]"
        />
        <div className="flex flex-wrap gap-2">
          {SLOT_FILTERS.map((f) => (
            <Chip key={f.slot} active={slot === f.slot} onClick={() => patch('slot', f.slot)}>
              {f.name}
            </Chip>
          ))}
        </div>
        <Chip active={favOnly} onClick={() => patch('fav', favOnly ? null : '1')}>
          <Heart size={11} strokeWidth={1.6} className={cn('inline', favOnly && 'fill-white')} />
          <span className="ms-1.5">المفضلة</span>
        </Chip>

        <Segmented
          className="me-0 ms-auto"
          value={view}
          onChange={setView}
          options={[
            { value: 'grid', label: 'عرض شبكي', icon: Grid3x3 },
            { value: 'compact', label: 'عرض مضغوط', icon: Rows3 },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="ما فيه شيء هنا بعد."
          body="أضيفي أول قطعة لهذي الخزانة وابدئي التنسيق."
          action={<Button onClick={() => setAddOpen(true)}>إضافة قطعة</Button>}
        />
      ) : (
        <ItemGrid items={visible} compact={view === 'compact'} />
      )}

      <AddItemModal open={addOpen} onClose={() => setAddOpen(false)} wardrobeId={wardrobe.id} />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteWardrobe(wardrobe.id)
          toast.ok('حذفنا الخزانة — القطع انتقلت لخزانة ثانية')
          setConfirmDelete(false)
        }}
        eyebrow="Delete"
        title={`حذف خزانة ${wardrobe.name}؟`}
        confirmLabel="حذف الخزانة"
      >
        {`ملابسك ما تنحذف — القطع الـ ${total} راح تنتقل لأول خزانة عندك.`}
      </ConfirmDialog>
    </PageContainer>
  )
}
