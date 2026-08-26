/**
 * إضافة قطعة تملكينها: اختاري طريقة الإدخال، شوفي التجهيز، ثم راجعي التفاصيل.
 *
 * الصورة **حقيقية**: تُقرأ من الملف، تُقصّ مربّعة وتُصغّر في المتصفح، وتُخزّن
 * في IndexedDB مربوطة بالقطعة. مرحلة «نجهّز القطعة» تعكس الخط الحقيقي عشان
 * الانتظار يكون مشروحًا مو مخفيًا (W-05 · المبدأ ٧).
 *
 * ما زال على الخادم (W-05 · A-07): إزالة الخلفية والتصنيف التلقائي. لين يجي،
 * الحقول تنتظر إدخالك بدل ما نزيّف اقتراحًا (المبدأ ٤).
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Check, Image as ImageIcon, Link2, Upload } from 'lucide-react'
import {
  Button,
  ColorSwatchGroup,
  Field,
  Modal,
  Select,
  TextArea,
  TextInput,
  toast,
} from '@/shared/components/ui'
import { CATEGORIES, ITEM_COLORS, categoryById, colorByName, shapesForSlot } from '@/domain/wardrobe'
import { ACCEPTED_PHOTO_TYPES, MAX_PHOTO_MB, preparePhoto } from '@/infrastructure/rendering'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { useWardrobe } from '../store'
import { useItemPhotos } from '../photos'
import { useAiModels } from '@/features/ai-model/store'
import { ROUTES } from '@/shared/config'
import { cn } from '@/shared/lib'
import type { GarmentShape, WardrobeItem } from '@/domain/wardrobe'

type MethodKind = 'file' | 'camera' | 'link'

const METHODS: {
  id: string
  kind: MethodKind
  icon: typeof Camera
  title: string
  note: string
}[] = [
  { id: 'camera', kind: 'camera', icon: Camera, title: 'التقاط صورة', note: 'صوّري القطعة مباشرة من دولابك' },
  { id: 'upload', kind: 'file', icon: Upload, title: 'رفع صورة', note: 'من ملفاتك أو الاستوديو' },
  { id: 'screenshot', kind: 'file', icon: ImageIcon, title: 'رفع لقطة شاشة', note: 'لقطة من أي تطبيق' },
  { id: 'link', kind: 'link', icon: Link2, title: 'استيراد من رابط', note: 'يدخل «قطع للتجربة»' },
]

const STEPS = ['قراءة الصورة', 'تجهيز القصّة', 'تحضير الحقول']

type Draft = Omit<WardrobeItem, 'id' | 'addedAt' | 'favorite'>

export function AddItemModal({
  open,
  onClose,
  wardrobeId,
}: {
  open: boolean
  onClose: () => void
  wardrobeId?: string
}) {
  const navigate = useNavigate()
  const { wardrobes, addItem } = useWardrobe()
  const setPhoto = useItemPhotos((state) => state.set)
  const gender = useAiModels((state) => state.models[0]?.characteristics.gender) ?? 'female'

  const [phase, setPhase] = useState<'method' | 'processing' | 'review'>('method')
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Draft>()
  const [photo, setPhotoBlob] = useState<Blob>()
  const [preview, setPreview] = useState<string>()
  const fileInput = useRef<HTMLInputElement>(null)
  const [useCamera, setUseCamera] = useState(false)

  /** الإغلاق يصفّر المودال — من الحدث نفسه، مو من effect. */
  const close = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPhase('method')
    setStep(0)
    setDraft(undefined)
    setPhotoBlob(undefined)
    setPreview(undefined)
    onClose()
  }

  // المؤقّت هو النظام الخارجي هنا، وكل تغيير حالة يصير داخل نداء المؤقّت
  useEffect(() => {
    if (phase !== 'processing') return
    const timer = setTimeout(
      () => (step >= STEPS.length ? setPhase('review') : setStep((s) => s + 1)),
      step >= STEPS.length ? 320 : 420,
    )
    return () => clearTimeout(timer)
  }, [phase, step])

  const pickMethod = (kind: MethodKind) => {
    if (kind === 'link') {
      close()
      navigate(ROUTES.tryPieces)
      return
    }
    setUseCamera(kind === 'camera')
    fileInput.current?.click()
  }

  const onFile = async (file?: File) => {
    if (!file) return
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      toast.error('حجم الصورة أكبر من ' + MAX_PHOTO_MB + ' ميجا.')
      return
    }

    let prepared
    try {
      prepared = await preparePhoto(file)
    } catch {
      toast.error('ما قدرنا نفتح هذي الصورة. جرّبي JPG أو PNG.')
      return
    }

    if (preview) URL.revokeObjectURL(preview)
    setPhotoBlob(prepared.blob)
    setPreview(URL.createObjectURL(prepared.blob))

    // القطعة موجودة أصلاً؟ نبدّل صورتها فقط ونبقى في المراجعة
    if (draft) {
      setPhase('review')
      return
    }

    const firstCategory = CATEGORIES.find((c) => c.gender === gender)!
    setDraft({
      name: file.name.replace(/\.[^.]+$/, '').slice(0, 40),
      categoryId: firstCategory.id,
      shape: shapesForSlot(firstCategory.slot)[0].id,
      colorHex: ITEM_COLORS[1].hex,
      colorName: ITEM_COLORS[1].name,
      wardrobeId: wardrobeId ?? wardrobes[0]?.id ?? null,
      source: 'wardrobe',
      size: '',
      brand: '',
      notes: '',
    })
    setStep(0)
    setPhase('processing')
  }

  const patch = (next: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...next } : d))

  const onCategoryChange = (categoryId: string) => {
    const slot = categoryById(categoryId)?.slot ?? 'top'
    patch({ categoryId, shape: shapesForSlot(slot)[0].id })
  }

  const save = async () => {
    if (!draft) return
    if (!draft.name.trim()) {
      toast.error('اكتبي اسم القطعة')
      return
    }
    const item = addItem({ ...draft, name: draft.name.trim() })
    if (photo) await setPhoto(item.id, photo)
    toast.ok('أضفناها لخزانتك')
    close()
  }

  const shapes = shapesForSlot(draft ? (categoryById(draft.categoryId)?.slot ?? 'top') : 'top')

  return (
    <Modal
      open={open}
      onClose={close}
      eyebrow={phase === 'review' ? 'Review' : 'Add a piece'}
      title={
        phase === 'method'
          ? 'أضيفي قطعة لخزانتك'
          : phase === 'processing'
            ? 'نجهّز القطعة…'
            : 'راجعي التفاصيل'
      }
      width={phase === 'review' ? 'lg' : 'md'}
      footer={
        phase === 'review' && (
          <div className="flex gap-3">
            <Button onClick={save}>أضيفيها للخزانة</Button>
            <Button variant="secondary" onClick={close}>
              إلغاء
            </Button>
          </div>
        )
      }
    >
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPTED_PHOTO_TYPES}
        capture={useCamera ? 'environment' : undefined}
        onChange={(event) => {
          void onFile(event.target.files?.[0])
          event.target.value = ''
        }}
        className="hidden"
      />

      {phase === 'method' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {METHODS.map(({ id, kind, icon: Icon, title, note }) => (
            <button
              key={id}
              onClick={() => pickMethod(kind)}
              className="lift flex flex-col gap-2 rounded-md border border-line bg-surface p-5 text-right hover:border-line-strong"
            >
              <Icon size={19} strokeWidth={1.3} aria-hidden />
              <span className="text-[13.5px]">{title}</span>
              <span className="text-[11.5px] leading-6 text-faint">{note}</span>
            </button>
          ))}
        </div>
      )}

      {phase === 'processing' && (
        <div>
          {preview && (
            <div className="mx-auto mb-6 grid aspect-square max-w-[220px] place-items-center overflow-hidden rounded-md bg-surface">
              <img src={preview} alt="" className="h-full w-full object-contain" />
            </div>
          )}
          <ul className="flex flex-col">
            {STEPS.map((label, index) => (
              <li
                key={label}
                className={cn(
                  'flex items-center gap-3 py-3 text-[12.5px] transition-colors',
                  index < step ? 'text-ink' : 'text-faint',
                )}
              >
                <span
                  className={cn(
                    'grid h-4 w-4 flex-none place-items-center rounded-full border transition-colors',
                    index < step ? 'border-ink bg-ink' : 'border-line-strong',
                  )}
                >
                  {index < step && (
                    <Check size={9} strokeWidth={3} aria-hidden className="text-white" />
                  )}
                </span>
                {label}
              </li>
            ))}
          </ul>
          <div className="mt-4 h-px overflow-hidden bg-line">
            <div
              className="h-full bg-ink transition-all duration-500"
              style={{ width: (step / STEPS.length) * 100 + '%' }}
            />
          </div>
        </div>
      )}

      {phase === 'review' && draft && (
        <div className="grid gap-7 sm:grid-cols-[200px_1fr]">
          <div>
            <div className="grid aspect-square place-items-center overflow-hidden rounded-md border border-line bg-surface">
              {preview ? (
                <img src={preview} alt="" className="h-full w-full object-contain" />
              ) : (
                <ItemImage
                  item={{ ...draft, name: draft.name || 'قطعة' }}
                  className="h-[86%] w-[86%]"
                />
              )}
            </div>
            <button
              onClick={() => fileInput.current?.click()}
              className="mt-2 w-full text-[11.5px] text-muted transition-colors hover:text-ink"
            >
              تغيير الصورة
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <Field label="اسم القطعة">
              <TextInput
                autoFocus
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="قميص كتان أبيض"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الفئة">
                <Select value={draft.categoryId} onChange={(e) => onCategoryChange(e.target.value)}>
                  {CATEGORIES.filter((c) => c.gender === gender).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="الشكل" hint="يُستخدم لعرض القطعة على الموديل">
                <Select
                  value={draft.shape}
                  onChange={(e) => patch({ shape: e.target.value as GarmentShape })}
                >
                  {shapes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="اللون">
              <ColorSwatchGroup
                options={ITEM_COLORS}
                value={draft.colorName}
                onChange={(color) => patch({ colorHex: color.hex, colorName: color.name })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="المقاس (اختياري)">
                <TextInput
                  value={draft.size ?? ''}
                  onChange={(e) => patch({ size: e.target.value })}
                  placeholder="M"
                />
              </Field>
              <Field label="الماركة (اختياري)">
                <TextInput
                  value={draft.brand ?? ''}
                  onChange={(e) => patch({ brand: e.target.value })}
                />
              </Field>
            </div>

            <Field label="الخزانة">
              <Select
                value={draft.wardrobeId ?? ''}
                onChange={(e) => patch({ wardrobeId: e.target.value })}
              >
                {wardrobes.map((w) => (
                  <option key={w.id} value={w.id}>
                    خزانة {w.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="ملاحظات (اختياري)">
              <TextArea
                value={draft.notes ?? ''}
                onChange={(e) => patch({ notes: e.target.value })}
                placeholder="مثلًا: تنكمش بالغسيل الساخن"
              />
            </Field>
          </div>
        </div>
      )}
    </Modal>
  )
}

/** مساعد اللون — يستخدمه مسار الاستيراد كمان. */
export const randomColor = () =>
  colorByName(ITEM_COLORS[Math.floor(Math.random() * ITEM_COLORS.length)].name)
