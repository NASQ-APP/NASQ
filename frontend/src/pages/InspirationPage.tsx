/**
 * إلهامي — لوكات أعجبت المستخدمة.
 *
 * مب مصدر استيراد ولا متجر: ما فيه سعر ولا شراء ولا قطعة تدخل الخزانة. الصورة
 * هنا مرجع بصري، منها نقرأ ألوان اللوك ونفهم ذوقها، ثم يبني عليها الستايليست.
 */
import { useRef, useState } from 'react'
import { ImagePlus, Link2, Sparkles, Trash2, X } from 'lucide-react'
import {
  Button,
  Chip,
  ColorSwatch,
  EmptyState,
  Modal,
  PageHeader,
  SectionHeader,
  TextInput,
  toast,
} from '@/shared/components/ui'
import { PageContainer } from '@/shared/components/layout'
import { ACCEPTED_PHOTO_TYPES, MAX_PHOTO_MB, preparePhoto } from '@/infrastructure/rendering'
import { useItemPhotos } from '@/features/wardrobe/photos'
import { useInspiration, useStyleProfile } from '@/features/inspiration/store'
import { inspirationAnalyzer } from '@/features/inspiration/analyze'
import { resolveImageUrl } from '@/features/inspiration/resolve'
import { STYLE_TAGS, type StyleInspiration } from '@/domain/style/types'
import { MissingPieceSearch } from '@/features/inspiration/components/MissingPieceSearch'
import { cn } from '@/shared/lib'

export function InspirationPage() {
  const { inspirations, add, update, remove } = useInspiration()
  const profile = useStyleProfile()
  const photos = useItemPhotos((s) => s.urls)
  const setPhoto = useItemPhotos((s) => s.set)

  const fileInput = useRef<HTMLInputElement>(null)
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [openId, setOpenId] = useState<string>()

  const imageOf = (i: StyleInspiration) => photos[i.id] ?? i.imageUrl

  /** يقرأ ألوان اللوك ثم يحفظه. الصورة المرفوعة تُخزَّن بمعرّف الإلهام. */
  const save = async (src: string, base: Partial<StyleInspiration>, blob?: Blob) => {
    setBusy(true)
    try {
      const reading = await inspirationAnalyzer.read(src)
      const inspiration = add({
        source: base.source ?? 'upload',
        imageUrl: base.imageUrl,
        sourceLink: base.sourceLink,
        palette: reading.palette,
        pieces: [],
        tags: [],
      })
      if (blob) await setPhoto(inspiration.id, blob)
      toast.ok(reading.notice)
      setOpenId(inspiration.id)
    } finally {
      setBusy(false)
    }
  }

  const onFile = async (file?: File) => {
    if (!file) return
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      toast.error(`حجم الصورة أكبر من ${MAX_PHOTO_MB} ميجا.`)
      return
    }
    try {
      const prepared = await preparePhoto(file)
      const url = URL.createObjectURL(prepared.blob)
      await save(url, { source: 'upload' }, prepared.blob)
      URL.revokeObjectURL(url)
    } catch {
      toast.error('ما قدرنا نفتح هذي الصورة. جرّبي JPG أو PNG.')
    }
  }

  const onLink = async () => {
    const url = link.trim()
    if (!url) {
      toast.error('الصقي رابط صورة اللوك أولًا')
      return
    }
    if (!URL.canParse(url)) {
      toast.error('الرابط غير صالح.')
      return
    }

    /* رابط المشاركة من بنترست صفحة مب صورة — نحوّله لصورتها قبل الحفظ، وإلا
       انحفظ رابط ما يقدر `<img>` يعرضه. */
    setBusy(true)
    const imageUrl = await resolveImageUrl(url).finally(() => setBusy(false))
    if (!imageUrl) {
      toast.error('ما لقينا صورة في هذا الرابط. جرّبي رابط Pin أو ارفعي الصورة.')
      return
    }

    await save(imageUrl, {
      source: url.includes('pinterest') || url.includes('pin.it') || url.includes('pinimg')
        ? 'pinterest'
        : 'link',
      imageUrl,
      sourceLink: url,
    })
    setLink('')
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Style inspiration"
        title="إلهامي"
        description="لوكات عجبتك من برّا. نقرأ ألوانها ونفهم ذوقك، ويبني عليها الستايليست — ما فيه شراء ولا قطع تدخل خزانتك من هنا."
      />

      {/* ---------------- إضافة ---------------- */}
      <SectionHeader eyebrow="Add" title="أضيفي لوكًا" />
      <div className="mb-4 flex max-w-[720px] items-center gap-3 rounded-md border border-line p-2 ps-5 focus-within:border-ink">
        <Link2 size={17} strokeWidth={1.3} className="text-faint" />
        <TextInput
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void onLink()}
          placeholder="الصقي رابط Pin أو صورة من بنترست…"
          className="h-10 w-full border-0 bg-transparent px-0 text-[13.5px] focus:ring-0"
          dir="ltr"
        />
        <Button onClick={() => void onLink()} disabled={busy}>
          إضافة
        </Button>
      </div>

      <div className="mb-14 flex flex-wrap items-center gap-3">
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED_PHOTO_TYPES}
          className="hidden"
          onChange={(event) => {
            void onFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        <Button variant="secondary" onClick={() => fileInput.current?.click()} disabled={busy}>
          <ImagePlus size={14} strokeWidth={1.5} />
          ارفعي صورة من جهازك
        </Button>
        <p className="text-[11.5px] leading-6 text-faint">
          أو افتحي بنترست واضغطي «أضيفيها لإلهامي» من إضافة المتصفح.
        </p>
      </div>

      {/* ---------------- ذوقك ---------------- */}
      {profile.fromCount > 0 && (
        <>
          <SectionHeader eyebrow="Your taste" title="ذوقك من إلهاماتك" />
          <div className="mb-14 flex flex-wrap items-center gap-2 rounded-md border border-line p-5">
            {profile.colors.map((color) => (
              <ColorSwatch key={color.name} hex={color.hex} label={color.name} />
            ))}
            {profile.tags.map((tag) => (
              <Chip key={tag}>{tag}</Chip>
            ))}
            <span className="lat ms-auto text-[10px] text-faint">
              from {profile.fromCount} looks
            </span>
          </div>
        </>
      )}

      {/* ---------------- المكتبة ---------------- */}
      <SectionHeader eyebrow="Looks" title="إلهاماتي" />
      {inspirations.length === 0 ? (
        <EmptyState
          title="ما فيه إلهام بعد."
          body="أضيفي لوكًا عجبك — نقرأ ألوانه ونقترح لك من خزانتك ما يشبهه."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {inspirations.map((inspiration) => (
            <article key={inspiration.id} className="group flex flex-col">
              <button
                type="button"
                onClick={() => setOpenId(inspiration.id)}
                className="lift relative aspect-[3/4] overflow-hidden rounded-md border border-line bg-surface"
              >
                {imageOf(inspiration) ? (
                  <img
                    src={imageOf(inspiration)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center text-[11.5px] text-faint">
                    ما وصلتنا الصورة
                  </span>
                )}
              </button>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {inspiration.palette.slice(0, 5).map((color) => (
                  <ColorSwatch key={color.name} hex={color.hex} label={color.name} size="sm" />
                ))}
                <button
                  type="button"
                  onClick={() => {
                    remove(inspiration.id)
                    toast.ok('شلناه من إلهاماتك')
                  }}
                  aria-label="حذف الإلهام"
                  className="ms-auto text-faint transition-colors hover:text-danger"
                >
                  <Trash2 size={13} strokeWidth={1.5} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <InspirationDetail id={openId} onClose={() => setOpenId(undefined)} onChange={update} />
    </PageContainer>
  )
}

/* ---------------- تفاصيل اللوك ---------------- */

function InspirationDetail({
  id,
  onClose,
  onChange,
}: {
  id?: string
  onClose: () => void
  onChange: (id: string, patch: Partial<StyleInspiration>) => void
}) {
  // نقرأ من المخزن مب من لقطة محفوظة، وإلا ما ظهرت الإضافات فور حفظها
  const inspiration = useInspiration((s) => s.inspirations.find((i) => i.id === id))
  const image = useItemPhotos((s) => (id ? s.urls[id] : undefined)) ?? inspiration?.imageUrl
  const [piece, setPiece] = useState('')
  if (!inspiration) return null

  const toggleTag = (tag: string) =>
    onChange(inspiration.id, {
      tags: inspiration.tags.includes(tag)
        ? inspiration.tags.filter((t) => t !== tag)
        : [...inspiration.tags, tag],
    })

  const addPiece = () => {
    const label = piece.trim()
    if (!label) return
    onChange(inspiration.id, { pieces: [...inspiration.pieces, { label }] })
    setPiece('')
  }

  return (
    <Modal open onClose={onClose} eyebrow="Look" title="مكوّنات اللوك">
      <div className="grid gap-6 sm:grid-cols-[160px_1fr]">
        <div className="aspect-[3/4] overflow-hidden rounded-md border border-line bg-surface">
          {image && <img src={image} alt="" className="h-full w-full object-cover" />}
        </div>

        <div>
          <p className="eyebrow mb-2">ألوان اللوك</p>
          {inspiration.palette.length > 0 ? (
            <div className="mb-5 flex flex-wrap gap-2">
              {inspiration.palette.map((color) => (
                <ColorSwatch key={color.name} hex={color.hex} label={color.name} />
              ))}
            </div>
          ) : (
            <p className="mb-5 text-[12px] text-faint">ما قدرنا نقرأ ألوان الصورة.</p>
          )}

          <p className="eyebrow mb-2">الستايل</p>
          <div className="mb-5 flex flex-wrap gap-1.5">
            {STYLE_TAGS.map((tag) => (
              <button key={tag} type="button" onClick={() => toggleTag(tag)}>
                <Chip
                  className={cn(
                    'cursor-pointer',
                    inspiration.tags.includes(tag) && 'border-ink bg-ink text-white',
                  )}
                >
                  {tag}
                </Chip>
              </button>
            ))}
          </div>

          <p className="eyebrow mb-2">قطع اللوك</p>
          <p className="mb-3 text-[11.5px] leading-6 text-faint">
            تحديد القطع من الصورة يحتاج تحليل في الخادم — اكتبيها بنفسك الآن، ونبحث لك عنها.
          </p>
          <div className="mb-3 flex gap-2">
            <TextInput
              value={piece}
              onChange={(e) => setPiece(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPiece()}
              placeholder="بليزر بيج"
              className="h-9 flex-1 text-[12.5px]"
            />
            <Button size="sm" onClick={addPiece}>
              أضيفي
            </Button>
          </div>

          <ul className="flex flex-col gap-4">
            {inspiration.pieces.map((look, index) => (
              <li key={`${look.label}-${index}`} className="border-b border-line pb-4">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles size={12} strokeWidth={1.5} className="text-faint" />
                  <span className="text-[13px]">{look.label}</span>
                  <button
                    type="button"
                    aria-label="حذف القطعة"
                    onClick={() =>
                      onChange(inspiration.id, {
                        pieces: inspiration.pieces.filter((_, i) => i !== index),
                      })
                    }
                    className="ms-auto text-faint hover:text-danger"
                  >
                    <X size={12} strokeWidth={1.6} />
                  </button>
                </div>
                <MissingPieceSearch query={look.label} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  )
}
