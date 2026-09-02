import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ExternalLink, Heart, MoveRight, Trash2, Wand2 } from 'lucide-react'
import {
  Button,
  ButtonAnchor,
  ButtonLink,
  ConfirmDialog,
  Field,
  Select,
  Modal,
  SectionHeader,
  EmptyState,
  toast,
} from '@/shared/components/ui'
import { PageContainer } from '@/shared/components/layout'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { ItemImagePicker } from '@/features/wardrobe/components/ItemImagePicker'
import { categoryById, occasionName } from '@/domain/wardrobe'
import { sourceById } from '@/features/try-pieces/sources'
import { ItemGrid } from '@/features/wardrobe/components/ItemGrid'
import { useWardrobe, wardrobeById } from '@/features/wardrobe/store'
import { useStudio } from '@/features/studio/store'
import { useLooks } from '@/features/looks/store'
import { slotOf } from '@/domain/outfit'
import { formatDate } from '@/shared/lib'
import { APP } from '@/shared/config'
import { useVoice } from '@/features/onboarding/voice'

export function ItemPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const say = useVoice()
  const { items, wardrobes, toggleFavorite, moveItem, deleteItem } = useWardrobe()
  const studio = useStudio()
  const looks = useLooks((s) => s.looks)

  const [moveOpen, setMoveOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [target, setTarget] = useState('')

  const item = items.find((i) => i.id === id)

  if (!item) {
    return (
      <PageContainer width="narrow" className="py-20">
        <EmptyState
          title="ما لقينا هذي القطعة."
          body="ممكن تكون انحذفت."
          action={<ButtonLink to="/wardrobes">خزائني</ButtonLink>}
        />
      </PageContainer>
    )
  }

  const category = categoryById(item.categoryId)
  const wardrobe = wardrobeById(item.wardrobeId)
  const store = sourceById(item.storeId)
  const isTry = item.source === 'try'

  const wornIn = looks.filter((l) => l.itemIds.includes(item.id))
  const pairsWith = items
    .filter(
      (i) =>
        i.id !== item.id &&
        i.source === 'wardrobe' &&
        slotOf(i) !== slotOf(item) &&
        (isTry || i.wardrobeId === item.wardrobeId),
    )
    .slice(0, 4)

  const rows: [string, string | undefined][] = [
    ['الفئة', category?.name],
    ['اللون', item.colorName],
    ['المقاس', item.size || undefined],
    ['الماركة', item.brand || undefined],
    ['الخزانة', wardrobe ? `خزانة ${wardrobe.name}` : undefined],
    ['المصدر', isTry ? `قطعة للتجربة${store ? ` · ${store.name}` : ''}` : 'من خزانتك'],
    ['أُضيفت', formatDate(item.addedAt)],
    ['ملاحظات', item.notes || undefined],
  ]

  return (
    <PageContainer>
      <nav className="lat mb-8 flex items-center gap-2 text-[10px] text-faint">
        {isTry ? (
          <Link to="/try" className="hover:text-ink">
            Try pieces
          </Link>
        ) : (
          <>
            <Link to="/wardrobes" className="hover:text-ink">
              Wardrobes
            </Link>
            <ChevronLeft size={12} />
            <Link to={`/wardrobe/${item.wardrobeId}`} className="hover:text-ink">
              {wardrobe?.nameLatin}
            </Link>
          </>
        )}
        <ChevronLeft size={12} />
        <span>{item.name}</span>
      </nav>

      <div className="grid gap-14 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <div className="grid aspect-square place-items-center overflow-hidden rounded-md border border-line bg-surface">
            <ItemImage item={item} className="h-[86%] w-[86%]" />
          </div>
          <ItemImagePicker
            itemId={item.id}
            images={item.images ?? []}
            current={item.imageUrl}
            className="mt-6"
          />
        </div>

        <div>
          <p className="eyebrow">{category?.nameLatin}</p>
          <h1 className="mt-2 text-[28px] font-light leading-tight">{item.name}</h1>

          <dl className="mt-8 grid grid-cols-[110px_1fr] border-t border-line text-[13px]">
            {rows
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="border-b border-line py-3.5 text-[10px] uppercase tracking-[0.2em] text-faint">
                    {k}
                  </dt>
                  <dd className="border-b border-line py-3.5">{v}</dd>
                </div>
              ))}
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              onClick={() => {
                /*
                  تبدأ إطلالة جديدة بهذي القطعة وحدها.

                  كانت تُضاف لما هو مختار، فتصل الاستوديو فوق اختيار قديم:
                  فستان فوق تيشيرت وبنطلون. و«نسّقي هذي القطعة» وعدٌ بقطعة
                  واحدة، لا بإضافتها لطبقة سابقة.
                */
                studio.replaceAll([item.id])
                navigate('/studio')
              }}
            >
              <Wand2 size={15} strokeWidth={1.5} />
              {say('نسّقي هذي القطعة', 'نسّق هذي القطعة')}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                setTarget(item.wardrobeId ?? wardrobes[0]?.id ?? '')
                setMoveOpen(true)
              }}
            >
              <MoveRight size={15} strokeWidth={1.5} />
              {isTry ? 'نقل لخزانتي' : 'نقل'}
            </Button>
            {/*
              رابط القطعة الأصلي — `<a>` حقيقي لا `window.open`.

              وقبله ما كان فيه طريق للرجوع للمتجر: القطعة تُستورد ويبقى رابطها
              مخزّنًا بلا أن يُعرض، فمن أرادت تشتريها فعلاً تبحث عنها من جديد.
              ويُعرض إن وُجد الرابط وحده — زرّ لا يذهب لشيء أسوأ من غيابه.
            */}
            {item.sourceLink && (
              <ButtonAnchor
                size="lg"
                variant="secondary"
                href={item.sourceLink}
                target="_blank"
                rel="noreferrer noopener"
              >
                <ExternalLink size={15} strokeWidth={1.5} />
                {store ? `افتحي في ${store.name}` : 'افتحي رابط القطعة'}
              </ButtonAnchor>
            )}
            <Button
              size="lg"
              variant="secondary"
              aria-label="المفضلة"
              onClick={() => toggleFavorite(item.id)}
            >
              <Heart size={15} strokeWidth={1.5} className={item.favorite ? 'fill-ink' : ''} />
            </Button>
            <Button
              size="lg"
              variant="danger"
              aria-label="حذف القطعة"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={15} strokeWidth={1.5} />
            </Button>
          </div>

          {isTry && (
            <p className="mt-5 rounded-md border border-line bg-surface px-4 py-3 text-[12px] leading-7 text-muted">
              {say(
                'هذي قطعة للتجربة — مو داخل خزانتك. لو اشتريتيها فعليًا، اضغطي «نقل لخزانتي».',
                'هذي قطعة للتجربة — مو داخل خزانتك. لو اشتريتها فعليًا، اضغط «نقل لخزانتي».',
              )}
            </p>
          )}
        </div>
      </div>

      {/* worn in */}
      <section className="mt-20">
        <SectionHeader eyebrow="Worn in" title="استُخدمت في" />
        {wornIn.length === 0 ? (
          <p className="text-[13px] text-muted">ما استخدمتيها في أي إطلالة محفوظة لحد الآن.</p>
        ) : (
          <ul className="flex flex-wrap gap-4">
            {wornIn.map((look) => (
              <li key={look.id}>
                <Link
                  to="/looks"
                  className="block w-[150px] overflow-hidden rounded-md border border-line transition-colors hover:border-line-strong"
                >
                  <img src={look.resultImageUrl} alt={look.name} className="h-[190px] w-full object-contain bg-surface" />
                  <span className="block px-3 py-2 text-[11.5px]">
                    {look.name}
                    <span className="block text-[10px] text-faint">{occasionName(look.occasion)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* pairs with */}
      <section className="mt-16">
        <SectionHeader eyebrow="Suggested" title={`${APP.shortName} يقترح تنسيقها مع`} />
        {pairsWith.length === 0 ? (
          <p className="text-[13px] text-muted">ما فيه قطع كافية في خزانتك عشان أقترح.</p>
        ) : (
          <ItemGrid items={pairsWith} />
        )}
      </section>

      <Modal
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        eyebrow="Move"
        title="نقل إلى خزانة"
        width="sm"
        footer={
          <div className="flex gap-3">
            <Button
              onClick={() => {
                moveItem(item.id, target)
                setMoveOpen(false)
                toast.ok('صارت في خزانتك')
              }}
            >
              نقل
            </Button>
            <Button variant="secondary" onClick={() => setMoveOpen(false)}>
              إلغاء
            </Button>
          </div>
        }
      >
        <Field label="الخزانة">
          <Select value={target} onChange={(e) => setTarget(e.target.value)}>
            {wardrobes.map((w) => (
              <option key={w.id} value={w.id}>
                خزانة {w.name}
              </option>
            ))}
          </Select>
        </Field>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false)
          deleteItem(item.id)
          toast.ok('حذفنا القطعة')
          navigate(isTry ? '/try' : `/wardrobe/${item.wardrobeId}`)
        }}
        eyebrow="Delete"
        title={`حذف ${item.name}؟`}
        confirmLabel="حذف القطعة"
      >
        {wornIn.length > 0
          ? `القطعة مستخدمة في ${wornIn.length} إطلالة محفوظة — الإطلالات تبقى، والقطعة تروح بلا رجعة.`
          : 'القطعة تنحذف من خزانتك بلا رجعة.'}
      </ConfirmDialog>
    </PageContainer>
  )
}
