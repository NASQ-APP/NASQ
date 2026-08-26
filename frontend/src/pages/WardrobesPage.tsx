import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button, Field, Modal, PageHeader, SearchInput, TextInput, toast } from '@/shared/components/ui'
import { PageContainer } from '@/shared/components/layout'
import { WardrobeCard } from '@/features/wardrobe/components/WardrobeCard'
import { ItemGrid } from '@/features/wardrobe/components/ItemGrid'
import { useWardrobe } from '@/features/wardrobe/store'
import { filterItems } from '@/domain/wardrobe'

export function WardrobesPage() {
  const { wardrobes, items, createWardrobe } = useWardrobe()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [latin, setLatin] = useState('')
  const [term, setTerm] = useState('')

  // البحث العام من الشريط العلوي ينزل هنا ويدوّر داخل القطع (W-08)
  const query = params.get('q') ?? ''
  const matches = query
    ? filterItems(
        items.filter((i) => i.source === 'wardrobe'),
        { search: query },
      )
    : []

  const visible = wardrobes.filter(
    (w) =>
      !term.trim() ||
      w.name.includes(term.trim()) ||
      w.nameLatin.toLowerCase().includes(term.trim().toLowerCase()),
  )

  const create = () => {
    if (!name.trim()) {
      toast.error('اكتبي اسم الخزانة')
      return
    }
    createWardrobe(name, latin)
    setName('')
    setLatin('')
    setOpen(false)
    toast.ok('أنشأنا الخزانة')
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="My wardrobes"
        title="خزائني"
        description="كل خزانة مساحة مستقلة — رتّبيها بالموسم، بالمناسبة، أو باليوم."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={14} strokeWidth={1.6} />
            خزانة جديدة
          </Button>
        }
      />

      {query && (
        <section className="mb-12">
          <div className="mb-5 flex items-center justify-between gap-4 border-b border-line pb-4">
            <div>
              <p className="eyebrow">Search</p>
              <p className="mt-1 text-[15px]">
                نتائج «{query}» — {matches.length} قطعة
              </p>
            </div>
            <button
              onClick={() => {
                const next = new URLSearchParams(params)
                next.delete('q')
                setParams(next, { replace: true })
              }}
              className="text-[12px] text-muted hover:text-ink"
            >
              مسح البحث
            </button>
          </div>
          {matches.length === 0 ? (
            <p className="text-[13px] text-muted">ما لقينا قطعة بهذا الاسم في خزائنك.</p>
          ) : (
            <ItemGrid items={matches} compact />
          )}
        </section>
      )}

      <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-line pb-5">
        <SearchInput
          value={term}
          onChange={setTerm}
          placeholder="ابحثي في الخزائن…"
          className="w-full max-w-[300px]"
        />
        <span className="lat me-0 ms-auto text-[11px] text-faint">
          {wardrobes.length} wardrobes · {items.filter((i) => i.source === 'wardrobe').length} pieces
        </span>
      </div>

      <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">
        {visible.map((w) => (
          <WardrobeCard key={w.id} wardrobe={w} />
        ))}
        <button
          onClick={() => setOpen(true)}
          className="flex aspect-[4/4.5] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line-strong text-muted transition-colors hover:border-line-strong hover:text-ink"
        >
          <Plus size={20} strokeWidth={1.2} />
          <span className="text-[12px]">خزانة جديدة</span>
        </button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="New wardrobe"
        title="خزانة جديدة"
        width="sm"
        footer={
          <div className="flex gap-3">
            <Button onClick={create}>إنشاء</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="اسم الخزانة">
            <TextInput
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: الصيف"
            />
          </Field>
          <Field label="Latin label" hint="يظهر بخط لاتيني فوق الاسم">
            <TextInput value={latin} onChange={(e) => setLatin(e.target.value)} placeholder="Summer" />
          </Field>
        </div>
      </Modal>
    </PageContainer>
  )
}
