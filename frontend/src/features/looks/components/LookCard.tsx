import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Share2, Trash2, Wand2 } from 'lucide-react'
import { Badge, Button, IconButton, Modal, toast } from '@/shared/components/ui'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { occasionName } from '@/domain/wardrobe'
import { useWardrobe } from '@/features/wardrobe/store'
import { useStudio } from '@/features/studio/store'
import { useLooks } from '../store'
import { formatDate, formatShortDate } from '@/shared/lib'
import type { SavedLook } from '@/domain/outfit'
import type { WardrobeItem } from '@/domain/wardrobe'

function LookArtwork({
  look,
  items,
  preview = false,
}: {
  look: SavedLook
  items: WardrobeItem[]
  preview?: boolean
}) {
  if (look.resultImageUrl) {
    return (
      <img
        src={look.resultImageUrl}
        alt={look.name}
        className="h-full w-full object-contain p-3 sm:p-5"
      />
    )
  }

  return (
    <ul
      aria-label="قطع الإطلالة"
      className={
        preview
          ? 'grid h-full w-full grid-cols-2 place-items-center gap-3 p-8 sm:p-12'
          : 'grid h-full w-full grid-cols-2 place-items-center gap-2 p-7'
      }
    >
      {items.slice(0, 4).map((item) => (
        <li key={item.id} title={item.name} className="grid h-full max-h-32 w-full place-items-center">
          <ItemImage item={item} className="h-[82%] w-[82%]" />
        </li>
      ))}
    </ul>
  )
}

export function LookCard({ look }: { look: SavedLook }) {
  const navigate = useNavigate()
  const [previewOpen, setPreviewOpen] = useState(false)
  const allItems = useWardrobe((state) => state.items)
  const studio = useStudio()
  const remove = useLooks((state) => state.remove)

  const items = look.itemIds
    .map((id) => allItems.find((item) => item.id === id))
    .filter((item): item is WardrobeItem => Boolean(item))
  const missing = look.itemIds.length - items.length

  const wearLook = () => {
    studio.replaceAll(items.map((item) => item.id))
    navigate('/studio')
  }

  const shareLook = async () => {
    const text = `${look.name} — ${occasionName(look.occasion)}، ${look.itemIds.length} قطع`

    try {
      if (navigator.share) {
        if (look.resultImageUrl) {
          try {
            const response = await fetch(look.resultImageUrl)
            const blob = await response.blob()
            const extension = blob.type.includes('png') ? 'png' : 'jpg'
            const file = new File([blob], `look-${look.number}.${extension}`, { type: blob.type })
            const data = { title: look.name, text, files: [file] }

            if (!navigator.canShare || navigator.canShare(data)) {
              await navigator.share(data)
              return
            }
          } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return
          }
        }

        await navigator.share({ title: look.name, text })
        return
      }

      await navigator.clipboard.writeText(text)
      toast.ok('نسخنا تفاصيل الإطلالة للمشاركة')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      toast.error('ما قدرنا نشارك الإطلالة الآن')
    }
  }

  return (
    <>
      <article className="group relative flex flex-col overflow-hidden rounded-lg border border-line bg-canvas transition-[transform,border-color] duration-[320ms] ease-soft hover:-translate-y-0.5 hover:border-line-strong">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="absolute inset-0 z-10 cursor-pointer rounded-lg"
          aria-label={`معاينة ${look.name}`}
        />

        <div className="relative aspect-[4/4.6] overflow-hidden bg-surface">
          <LookArtwork look={look} items={items} />

          <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
            <Badge tone="dark">Look #{look.number}</Badge>
            <IconButton
              label={`مشاركة ${look.name}`}
              onClick={() => void shareLook()}
              bordered
              className="relative z-20 bg-canvas text-ink"
            >
              <Share2 size={15} strokeWidth={1.5} />
            </IconButton>
          </div>

          <div className="pointer-events-none absolute inset-x-4 bottom-4 flex translate-y-1 items-center justify-center gap-2 rounded-md bg-ink-soft px-4 py-2.5 text-[11.5px] text-white opacity-0 transition-all duration-[320ms] ease-soft group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
            <Eye size={14} strokeWidth={1.5} />
            معاينة الإطلالة
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-normal">{look.name}</h2>
              <p className="mt-1 text-[11.5px] text-muted">
                {occasionName(look.occasion)} · {look.itemIds.length} قطع
              </p>
            </div>
            <span className="lat flex-none pt-0.5 text-[10px] text-faint">
              {formatShortDate(look.createdAt)}
            </span>
          </div>

          <ul className="mt-4 flex min-h-[44px] gap-1.5" aria-label="قطع الإطلالة">
            {items.slice(0, 5).map((item) => (
              <li key={item.id} title={item.name}>
                <ItemImage
                  item={item}
                  className="h-11 w-9 rounded-sm bg-surface p-1"
                  alt={item.name}
                />
              </li>
            ))}
            {missing > 0 && (
              <li className="grid h-11 w-9 place-items-center rounded-sm bg-surface text-[10px] text-faint">
                −{missing}
              </li>
            )}
          </ul>

          <div className="relative z-20 mt-auto flex items-center gap-2 pt-4">
            <Button size="sm" onClick={wearLook} className="flex-1">
              <Wand2 size={13} strokeWidth={1.5} />
              ألبسيها اليوم
            </Button>
            <Button
              size="sm"
              variant="danger"
              aria-label={`حذف ${look.name}`}
              title="حذف الإطلالة"
              onClick={() => {
                remove(look.id)
                toast.ok('حذفنا الإطلالة')
              }}
              className="px-3"
            >
              <Trash2 size={14} strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </article>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        eyebrow={`Look #${look.number}`}
        title={look.name}
        width="lg"
        footer={
          <div className="flex flex-wrap gap-2">
            <Button onClick={wearLook}>
              <Wand2 size={14} strokeWidth={1.5} />
              ألبسيها اليوم
            </Button>
            <Button variant="secondary" onClick={() => void shareLook()}>
              <Share2 size={14} strokeWidth={1.5} />
              مشاركة الإطلالة
            </Button>
          </div>
        }
      >
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.25fr)_minmax(220px,0.75fr)]">
          <div className="aspect-[4/4.5] overflow-hidden rounded-md bg-surface">
            <LookArtwork look={look} items={items} preview />
          </div>

          <div className="flex flex-col">
            <div className="border-b border-line pb-5">
              <p className="text-[15px]">{occasionName(look.occasion)}</p>
              <p className="mt-1 text-[12px] text-muted">
                {look.itemIds.length} قطع · حُفظت في {formatDate(look.createdAt)}
              </p>
            </div>

            <div className="pt-5">
              <p className="text-[12px] text-muted">قطع الإطلالة</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {items.map((item) => (
                  <li key={item.id} className="w-[58px]">
                    <ItemImage
                      item={item}
                      className="h-[68px] w-[58px] rounded-sm bg-surface p-1.5"
                      alt={item.name}
                    />
                    <p className="mt-1 truncate text-[9.5px] text-muted">{item.name}</p>
                  </li>
                ))}
              </ul>
              {missing > 0 && (
                <p className="mt-4 text-[11px] text-faint">
                  {missing} من القطع انحذفت من خزانتك.
                </p>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
