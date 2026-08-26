/**
 * الاستوديو بثلاث لوحات (S-01): «من يلبسها» على جانب، لوحة العرض في الوسط،
 * و«إطلالتك» على الجانب الآخر. ما فيه شي للبيع — المخرج الوحيد إطلالة محفوظة.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Camera,
  Check,
  Download,
  Info,
  Plus,
  RotateCcw,
  Share2,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import { Button, ButtonLink, Card, EmptyState, Field, Modal, Select, TextArea, TextInput, toast } from '@/shared/components/ui'
import { PageContainer } from '@/shared/components/layout'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { OCCASIONS, categoryById } from '@/domain/wardrobe'
import { useWardrobe, wardrobeById } from '@/features/wardrobe/store'
import { useStudio } from '@/features/studio/store'
import { STAGE_LABELS, useTryOn } from '@/features/studio/useTryOn'
import { ItemPicker } from '@/features/studio/components/ItemPicker'
import { PhotoUploader } from '@/features/studio/components/PhotoUploader'
import { useAiModels } from '@/features/ai-model/store'
import { useLooks } from '@/features/looks/store'
import { useAppShell } from '@/app/layout'
import { chooseFraming, neutralCompletion, toGarment } from '@/domain/outfit'
import { cn } from '@/shared/lib'
import type { Gender, WardrobeItem } from '@/domain/wardrobe'

const FRAMING_LABEL: Record<string, string> = {
  full: 'لقطة كاملة للجسم',
  upper: 'لقطة للجزء العلوي',
  lower: 'لقطة سفلية تركّز على الحذاء',
  detail: 'لقطة قريبة على القطعة',
}

export function StudioPage() {
  const allItems = useWardrobe((s) => s.items)
  const studio = useStudio()
  const models = useAiModels()
  const looks = useLooks()
  const tryOn = useTryOn()

  const { openStylist } = useAppShell()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [gender, setGender] = useState<Gender>('female')
  const [lookName, setLookName] = useState('')
  const [occasion, setOccasion] = useState<string>(OCCASIONS[0].id)
  const [lookNotes, setLookNotes] = useState('')

  const source = models.preferredSource
  const model = models.modelFor(gender)
  const photo = models.photo

  const items = useMemo(
    () => studio.selection.map((id) => allItems.find((i) => i.id === id)).filter(Boolean),
    [studio.selection, allItems],
  ) as NonNullable<(typeof allItems)[number]>[]

  const garments = items.map(toGarment)
  const { framing } = chooseFraming(garments)
  const fillers = neutralCompletion(garments, framing)

  const canGenerate =
    items.length > 0 && (source === 'model' ? Boolean(model) : Boolean(photo))

  const generate = async () => {
    if (!canGenerate) return
    await tryOn.run({ items, source, model, personImageUrl: photo?.url, gender })
  }

  const saveLook = () => {
    if (!tryOn.result) return
    const look = looks.save({
      name: lookName.trim() || `إطلالة ${new Date().toLocaleDateString('ar-SA-u-nu-latn', { day: 'numeric', month: 'long' })}`,
      occasion,
      notes: lookNotes.trim() || undefined,
      resultImageUrl: tryOn.result.resultImageUrl,
      source,
      modelId: model?.id,
      itemIds: items.map((i) => i.id),
      framing: tryOn.result.framing,
      simulated: tryOn.result.simulated,
    })
    setSaveOpen(false)
    setLookName('')
    setLookNotes('')
    toast.ok(`حفظنا الإطلالة #${look.number}`)
  }

  return (
    <PageContainer width="full" className="py-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Studio</p>
          <h1 className="mt-2 text-[30px]">استوديو التنسيق</h1>
          <p className="mt-2 max-w-[520px] text-[13px] text-muted">
            اختاري قطعًا من خزائنك وشوفيها على موديلك قبل ما تلبسينها.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openStylist}>
            <Sparkles size={14} strokeWidth={1.5} />
            اسألي دولابي
          </Button>
          <ButtonLink to="/looks" variant="ghost">
            إطلالاتي
          </ButtonLink>
        </div>
      </header>

      <div className="grid gap-8 xl:grid-cols-[330px_1fr_330px]">
        {/* ---------------- who wears it ---------------- */}
        <aside className="flex flex-col gap-6">
          <section className="rounded-md border border-line p-5">
            <p className="eyebrow mb-3">من يلبسها؟</p>
            <div className="grid grid-cols-2 gap-2">
              <SourceTab
                active={source === 'model'}
                onClick={() => models.setPreferredSource('model')}
                icon={<UserRound size={15} strokeWidth={1.4} />}
                label="موديل دولابي"
              />
              <SourceTab
                active={source === 'photo'}
                onClick={() => models.setPreferredSource('photo')}
                icon={<Camera size={15} strokeWidth={1.4} />}
                label="صورتي"
              />
            </div>

            {source === 'model' ? (
              <div className="mt-5 flex flex-col gap-4">
                <div className="flex gap-2">
                  {(['female', 'male'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={cn(
                        'h-9 flex-1 rounded-md border text-[12px] transition-colors',
                        gender === g
                          ? 'border-ink bg-ink text-white'
                          : 'border-line text-muted hover:border-line-strong',
                      )}
                    >
                      {g === 'female' ? 'نسائي' : 'رجالي'}
                    </button>
                  ))}
                </div>

                {model ? (
                  <div className="flex items-center gap-4 rounded-md border border-line bg-surface p-3">
                    <img
                      src={model.previewImageUrl}
                      alt={model.name}
                      className="h-[86px] w-[62px] flex-none object-contain"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px]">{model.name}</p>
                      <p className="mt-0.5 text-[11px] text-faint">
                        {model.characteristics.heightCm} سم
                        {model.characteristics.weightKg ? ` · ${model.characteristics.weightKg} كجم` : ''}
                      </p>
                      <Link
                        to="/models"
                        className="mt-1 inline-block text-[11px] text-muted underline-offset-4 hover:text-ink hover:underline"
                      >
                        تعديل الموديل
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-line-strong p-5 text-center">
                    <p className="text-[13px]">
                      ما عندك موديل {gender === 'female' ? 'نسائي' : 'رجالي'} بعد.
                    </p>
                    <p className="mt-1 text-[11.5px] text-muted">
                      أنشئيه مرة وحدة، ونستخدمه في كل تجربة.
                    </p>
                    <ButtonLink to="/models/new" size="sm" className="mt-4">
                      أنشئي موديلك
                    </ButtonLink>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-5">
                <PhotoUploader />
              </div>
            )}
          </section>

          {fillers.length > 0 && items.length > 0 && (
            <Card as="section" className="p-5">
              <p className="eyebrow mb-3">إكمال محايد</p>
              <ul className="flex flex-col gap-2">
                {fillers.map((f) => (
                  <li key={f.slot} className="flex items-start gap-2.5 text-[12px] leading-6 text-muted">
                    <span
                      className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full border border-line-strong"
                      style={{ background: f.colorHex }}
                    />
                    {f.reason}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-faint">
                القطع المحايدة مو من خزانتك — موجودة عشان الإطلالة تبان كاملة.
              </p>
            </Card>
          )}
        </aside>

        {/* ---------------- canvas ---------------- */}
        <section className="flex flex-col gap-5">
          <div className="relative grid min-h-[560px] place-items-center overflow-hidden rounded-md border border-line bg-stage">
            {tryOn.status === 'generating' || tryOn.status === 'processing' ? (
              <GeneratingState stage={tryOn.stage} />
            ) : tryOn.status === 'failed' ? (
              <div className="max-w-[380px] px-6 text-center">
                <p className="text-[16px]">{tryOn.error?.message}</p>
                {tryOn.error?.hint && (
                  <p className="mt-2 text-[12.5px] text-muted">{tryOn.error.hint}</p>
                )}
                <Button className="mt-5" onClick={generate}>
                  جرّبي مرة ثانية
                </Button>
              </div>
            ) : tryOn.result ? (
              <ResultView
                url={tryOn.result.resultImageUrl}
                notice={tryOn.result.notice}
                sideStrip={source === 'photo' ? items : []}
              />
            ) : items.length === 0 ? (
              <EmptyState
                title="اختاري قطعة عشان نبدأ."
                body="أضيفي قطعة أو أكثر من خزائنك، واختاري موديلك أو ارفعي صورتك."
                action={<Button onClick={() => setPickerOpen(true)}>أضيفي قطعة</Button>}
              />
            ) : (
              <div className="max-w-[420px] px-6 text-center">
                <Sparkles size={22} strokeWidth={1.2} className="mx-auto text-faint" />
                <p className="mt-4 text-[17px] font-light">جاهزين نجهّز إطلالتك</p>
                <p className="mt-2 text-[12.5px] leading-7 text-muted">
                  {items.length} قطع مختارة · {FRAMING_LABEL[framing]}
                </p>
                <Button className="mt-6" size="lg" onClick={generate} disabled={!canGenerate}>
                  اعرضيها على الموديل
                </Button>
                {!canGenerate && (
                  <p className="mt-3 text-[11.5px] text-faint">اختاري موديلك أو ارفعي صورتك أول.</p>
                )}
              </div>
            )}
          </div>

          {tryOn.result && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setSaveOpen(true)}>
                <Check size={14} strokeWidth={1.6} />
                احفظي الإطلالة
              </Button>
              <Button variant="secondary" onClick={generate}>
                <RotateCcw size={14} strokeWidth={1.5} />
                جرّبي مرة ثانية
              </Button>
              <Button variant="secondary" onClick={() => setPickerOpen(true)}>
                غيّري القطع
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href)
                  toast.ok('نسخنا الرابط')
                }}
              >
                <Share2 size={14} strokeWidth={1.5} />
                مشاركة
              </Button>
              <a
                href={tryOn.result.resultImageUrl}
                download={`dulabi-look-${tryOn.result.id}.svg`}
                className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-5 text-[12.5px] transition-colors hover:border-line-strong"
              >
                <Download size={14} strokeWidth={1.5} />
                تنزيل
              </a>
            </div>
          )}
        </section>

        {/* ---------------- the look ---------------- */}
        <aside className="flex flex-col gap-4 rounded-md border border-line p-5">
          <div className="flex items-center justify-between">
            <p className="eyebrow">إطلالتك ({items.length})</p>
            {items.length > 0 && (
              <button
                onClick={() => {
                  studio.clear()
                  tryOn.reset()
                }}
                className="text-[11.5px] text-muted hover:text-ink"
              >
                تفريغ
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="py-8 text-center text-[12.5px] leading-7 text-muted">
              ما اخترتي شيء بعد.
              <br />
              أضيفي قطعة من خزائنك.
            </p>
          ) : (
            <ul className="flex flex-col">
              {items.map((item) => {
                const wardrobe = wardrobeById(item.wardrobeId)
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 border-b border-line py-3 last:border-b-0"
                  >
                    <ItemImage item={item} className="h-[58px] w-[46px] flex-none rounded bg-surface p-1" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/item/${item.id}`} className="block truncate text-[12.5px] hover:underline">
                        {item.name}
                      </Link>
                      <p className="text-[10.5px] text-faint">
                        {categoryById(item.categoryId)?.name}
                        {item.source === 'try' ? ' · قطعة تجربة' : wardrobe ? ` · ${wardrobe.name}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => studio.remove(item.id)}
                      aria-label="إزالة"
                      className="text-faint transition-colors hover:text-ink"
                    >
                      <X size={14} strokeWidth={1.6} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <Button variant="secondary" block size="sm" onClick={() => setPickerOpen(true)}>
            <Plus size={14} strokeWidth={1.5} />
            أضيفي قطعة
          </Button>
          <Button variant="secondary" block size="sm" onClick={openStylist}>
            <Sparkles size={14} strokeWidth={1.5} />
            اسألي دولابي
          </Button>
        </aside>
      </div>

      <ItemPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />

      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        eyebrow="Save look"
        title="حفظ الإطلالة"
        width="md"
        footer={
          <div className="flex gap-3">
            <Button onClick={saveLook}>حفظ</Button>
            <Button variant="secondary" onClick={() => setSaveOpen(false)}>
              إلغاء
            </Button>
          </div>
        }
      >
        <div className="grid gap-6 sm:grid-cols-[170px_1fr]">
          <div className="grid aspect-[3/4] place-items-center rounded-md bg-stage">
            {tryOn.result && (
              <img
              src={tryOn.result.resultImageUrl}
              alt=""
              className="h-[92%] object-contain mix-blend-multiply"
            />
            )}
          </div>
          <div className="flex flex-col gap-4">
            <Field label="اسم الإطلالة">
              <TextInput
                value={lookName}
                onChange={(e) => setLookName(e.target.value)}
                placeholder="أبيض على أسود"
              />
            </Field>
            <Field label="المناسبة">
              <Select value={occasion} onChange={(e) => setOccasion(e.target.value)}>
                {OCCASIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="ملاحظات (اختياري)">
              <TextArea value={lookNotes} onChange={(e) => setLookNotes(e.target.value)} />
            </Field>
          </div>
        </div>
      </Modal>
    </PageContainer>
  )
}

/* ---------------- pieces ---------------- */

function SourceTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-11 items-center justify-center gap-2 rounded-md border text-[12.5px] transition-colors',
        active ? 'border-ink bg-ink text-white' : 'border-line text-muted hover:border-line-strong hover:text-ink',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function GeneratingState({ stage }: { stage?: string }) {
  const activeIndex = STAGE_LABELS.findIndex((s) => s.id === stage)
  return (
    <div className="w-[300px]">
      <p className="mb-6 text-center text-[15px] font-light">نجهّز إطلالتك…</p>
      <ul className="flex flex-col gap-1">
        {STAGE_LABELS.map((s, i) => {
          const done = activeIndex > i
          const current = activeIndex === i
          return (
            <li
              key={s.id}
              className={cn(
                'flex items-center gap-3 py-2 text-[12.5px] transition-colors',
                done || current ? 'text-ink' : 'text-faint',
              )}
            >
              <span
                className={cn(
                  'grid h-4 w-4 flex-none place-items-center rounded-full border transition-colors',
                  done ? 'border-ink bg-ink' : current ? 'border-ink' : 'border-line-strong',
                )}
              >
                {done && <Check size={9} strokeWidth={3} className="text-white" />}
              </span>
              {s.label}
            </li>
          )
        })}
      </ul>
      <div className="mt-6 h-px w-full overflow-hidden bg-line">
        <div
          className="h-full bg-ink transition-all duration-500"
          style={{ width: `${((activeIndex + 1) / STAGE_LABELS.length) * 100}%` }}
        />
      </div>
    </div>
  )
}

function ResultView({
  url,
  notice,
  sideStrip,
}: {
  url: string
  notice?: string
  sideStrip: Pick<WardrobeItem, 'id' | 'shape' | 'colorHex' | 'name'>[]
}) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex flex-1 items-center justify-center gap-6 p-6">
        <img
          src={url}
          alt="نتيجة التجربة"
          className="max-h-[520px] max-w-full object-contain mix-blend-multiply"
        />
        {sideStrip.length > 0 && (
          <div className="flex flex-col gap-3">
            {sideStrip.map((item) => (
              <ItemImage
                key={item.id}
                item={item}
                className="h-[92px] w-[74px] rounded-md border border-line bg-canvas p-1"
              />
            ))}
          </div>
        )}
      </div>
      {notice && (
        <p className="flex items-start gap-2 border-t border-line bg-canvas px-5 py-3 text-[11.5px] leading-6 text-muted">
          <Info size={13} strokeWidth={1.5} className="mt-1 flex-none" />
          {notice}
        </p>
      )}
    </div>
  )
}
