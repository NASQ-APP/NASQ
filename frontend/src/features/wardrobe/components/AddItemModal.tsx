/**
 * إضافة قطعة تملكينها: اختاري طريقة الإدخال ← الصورة وإزالة الخلفية ←
 * راجعي التفاصيل ← احفظي.
 *
 * الصورة كلها مسؤولية `ImageUploader` المشترك — ما فيه منطق معالجة هنا.
 * الشاشة تهتم بالحقول فقط، وتحفظ بعد ما توافق المستخدمة على الصورة.
 *
 * الحقول تتعبّى من الصورة (A-07): اللون يُقرأ في المتصفح فيشتغل دائمًا،
 * والفئة والشكل والاسم من مزوّد الرؤية لو كان مفعّلاً. كل حقل **اقتراح قابل
 * للتعديل**، وما تعبّى منها يبقى فاضيًا بدل ما نخترع له قيمة (المبدأ ٤).
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Image as ImageIcon, Link2, Sparkles, Upload } from 'lucide-react'
import { InlineLoader } from '@/shared/components/render'
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
import { ImageUploader } from '@/shared/components/media/ImageUploader'
import { prepareForStorage } from '@/infrastructure/images'
import { useGarmentAnalysis } from '@/shared/hooks'
import { cn } from '@/shared/lib'
import { useWardrobe } from '../store'
import { useVoice } from '@/features/onboarding/voice'
import { useItemPhotos } from '../photos'
import { useAiModels } from '@/features/ai-model/store'
import { ROUTES } from '@/shared/config'
import type { FieldSuggestion, ImageCandidate } from '@/domain/images'
import type { GarmentShape, WardrobeItem } from '@/domain/wardrobe'

type MethodKind = 'file' | 'camera' | 'link'

const METHODS: {
  id: string
  kind: MethodKind
  icon: typeof Camera
  title: string
  note: string
}[] = [
  { id: 'camera', kind: 'camera', icon: Camera, title: 'التقاط صورة', note: 'التقاط صورة القطعة مباشرة من دولابك' },
  { id: 'upload', kind: 'file', icon: Upload, title: 'رفع صورة', note: 'من ملفاتك أو الاستوديو' },
  { id: 'screenshot', kind: 'file', icon: ImageIcon, title: 'رفع لقطة شاشة', note: 'لقطة من أي تطبيق' },
  { id: 'link', kind: 'link', icon: Link2, title: 'استيراد من رابط', note: 'يدخل «قطع للتجربة»' },
]

type Draft = Omit<WardrobeItem, 'id' | 'addedAt' | 'favorite'>

/** يطبّق ما قرأه الذكاء على المسودّة. كل قيمة اقتراح، والمستخدمة تعدّل فوقه. */
function applySuggestion(draft: Draft, suggestion: FieldSuggestion): Draft {
  const next = { ...draft }
  if (suggestion.categoryId) next.categoryId = suggestion.categoryId
  if (suggestion.shape) next.shape = suggestion.shape
  if (suggestion.colorName && suggestion.colorHex) {
    next.colorName = suggestion.colorName
    next.colorHex = suggestion.colorHex
  }
  if (suggestion.name) next.name = suggestion.name
  if (suggestion.brand) next.brand = suggestion.brand
  return next
}

/** تسمية عربية للحقول المعبّاة — تُعرض للمستخدمة عشان تعرف وش تغيّر. */
const FIELD_LABELS: Record<string, string> = {
  name: 'الاسم',
  categoryId: 'الفئة',
  shape: 'الشكل',
  colorName: 'اللون',
  brand: 'الماركة',
}

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
  const say = useVoice()
  const { wardrobes, addItem } = useWardrobe()
  const setPhoto = useItemPhotos((state) => state.set)
  const gender = useAiModels((state) => state.models[0]?.characteristics.gender) ?? 'female'
  const [phase, setPhase] = useState<'method' | 'photo' | 'review'>('method')
  const [useCamera, setUseCamera] = useState(false)
  const [photo, setPhotoCandidate] = useState<ImageCandidate>()
  const [previewUrl, setPreviewUrl] = useState<string>()
  const [draft, setDraft] = useState<Draft>()

  // التعبئة تصل من الهوك بعد قراءة الصورة، فتُطبّق على المسودّة مباشرة
  const analysis = useGarmentAnalysis(gender, (suggestion) =>
    setDraft((current) => (current ? applySuggestion(current, suggestion) : current)),
  )

  /** الإغلاق يصفّر المودال — من الحدث نفسه، مو من effect. */
  const close = () => {
    analysis.clear()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPhase('method')
    setPhotoCandidate(undefined)
    setPreviewUrl(undefined)
    setDraft(undefined)
    onClose()
  }

  const pickMethod = (kind: MethodKind) => {
    if (kind === 'link') {
      close()
      navigate(ROUTES.tryPieces)
      return
    }
    setUseCamera(kind === 'camera')
    setPhase('photo')
  }

  /** المستخدمة وافقت على الصورة — ننتقل للحقول ونبدأ قراءتها. */
  const acceptPhoto = (candidate: ImageCandidate) => {
    const firstCategory = CATEGORIES.find((c) => c.gender === gender)!
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPhotoCandidate(candidate)
    setPreviewUrl(URL.createObjectURL(candidate.blob))
    setDraft({
      name: candidate.fileName.replace(/\.[^.]+$/, '').slice(0, 40),
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
    setPhase('review')
    analysis.analyze(candidate.blob)
  }


  const patch = (next: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...next } : d))

  const onCategoryChange = (categoryId: string) => {
    const slot = categoryById(categoryId)?.slot ?? 'top'
    patch({ categoryId, shape: shapesForSlot(slot)[0].id })
  }

  /*
    حارس الإرسال — **الزرّ كان بلا أي حماية**.

    `addItem` تُنشئ الصفّ فورًا، ثم تنتظر الدالةُ حفظَ الصورة. والانتظار قد
    يطول ثانيةً أو ثانيتين، والنموذج يبقى مفتوحًا والزرّ حيًّا. فمن ضغطت مرةً
    ثانية — وهو ما يفعله كلّ من ظنّ أن الضغطة ما وصلت — أنشأت قطعةً ثانية.

    والقاعدة ظهرت في بياناتها: «ساعه بني» خمس مرات في **أربع ثوانٍ**، و«بوت»
    ثلاثًا في أربع. هذي ليست إضافةً مقصودة.
  */
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (saving || !draft) return
    if (!draft.name.trim()) {
      toast.error(say('اكتبي اسم القطعة', 'اكتب اسم القطعة'))
      return
    }

    setSaving(true)
    try {
      const item = addItem({ ...draft, name: draft.name.trim() })
      if (photo) {
        try {
          const stored = await prepareForStorage(photo.blob)
          await setPhoto(item.id, stored.blob)
        } catch {
          // القطعة انحفظت بدون صورة — الرسم المتّجه يغطّيها فما تنكسر الشبكة
          toast.error('حفظنا القطعة، لكن تعذّر حفظ صورتها.')
          close()
          return
        }
      }
      toast.ok('أضفناها لخزانتك')
      close()
    } finally {
      // في `finally` لا بعد النجاح — وإلا بقي الزرّ ميتًا بعد أي فشل
      setSaving(false)
    }
  }

  const shapes = shapesForSlot(draft ? (categoryById(draft.categoryId)?.slot ?? 'top') : 'top')

  return (
    <Modal
      open={open}
      onClose={close}
      eyebrow={phase === 'review' ? 'Review' : 'Add a piece'}
      title={
        phase === 'method'
          ? say('أضيفي قطعة لخزانتك', 'أضِف قطعة لخزانتك')
          : phase === 'photo'
            ? 'صورة القطعة'
            : say('راجعي التفاصيل', 'راجع التفاصيل')
      }
      width={phase === 'review' ? 'lg' : 'md'}
      footer={
        phase === 'review' && (
          <div className="flex gap-3">
            <Button onClick={save} pending={saving} pendingLabel="نضيفها…">
              {say('أضيفيها للخزانة', 'أضِفها للخزانة')}
            </Button>
            <Button variant="secondary" onClick={close}>
              إلغاء
            </Button>
          </div>
        )
      }
    >
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

      {phase === 'photo' && (
        <ImageUploader
          capture={useCamera}
          confirmLabel={say('كمّلي التفاصيل', 'كمّل التفاصيل')}
          onConfirm={acceptPhoto}
          onCancel={() => setPhase('method')}
          onError={(error) => toast.error(error.message)}
        />
      )}

      {phase === 'review' && draft && (
        <div className="grid gap-7 sm:grid-cols-[200px_1fr]">
          <div>
            <div className="grid aspect-square place-items-center overflow-hidden rounded-md border border-line bg-canvas">
              {previewUrl && <img src={previewUrl} alt="" className="h-full w-full object-contain" />}
            </div>
            <button
              onClick={() => setPhase('photo')}
              className="mt-2 w-full text-[11.5px] text-muted transition-colors hover:text-ink"
            >
              تغيير الصورة
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <AutoFillNotice
              status={analysis.status}
              filled={analysis.suggestion?.filled ?? []}
              visionAvailable={analysis.visionAvailable}
            />

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

/** شريط هادئ يقول وش عبّاه الذكاء من الصورة. */
function AutoFillNotice({
  status,
  filled,
  visionAvailable,
}: {
  status: 'idle' | 'reading' | 'done'
  filled: string[]
  visionAvailable: boolean
}) {
  const say = useVoice()

  if (status === 'idle') return null

  const labels = filled.map((field) => FIELD_LABELS[field]).filter(Boolean)

  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-start gap-2 rounded-md border border-line bg-surface px-3.5 py-2.5 text-[11.5px] leading-6',
        status === 'reading' ? 'text-muted' : 'text-ink',
      )}
    >
      {status === 'reading' ? (
        <>
          <InlineLoader className="mt-2 flex-none" label="نقرأ الصورة" />
          نقرأ الصورة ونملأ الحقول…
        </>
      ) : (
        <>
          <Sparkles size={13} strokeWidth={1.5} aria-hidden className="mt-1 flex-none text-faint" />
          <span>
            {labels.length > 0 ? (
              <>
                عبّينا من الصورة: <span className="text-muted">{labels.join(' · ')}</span> —{' '}
                {say('راجعيها وعدّلي أي شي.', 'راجعها وعدّل أي شي.')}
              </>
            ) : (
              say(
                'ما قدرنا نقرأ تفاصيل من الصورة — عبّي الحقول بنفسك.',
                'ما قدرنا نقرأ تفاصيل من الصورة — عبّ الحقول بنفسك.',
              )
            )}
            {!visionAvailable && labels.length > 0 && (
              <span className="block text-faint">
                التعرّف على الفئة والاسم يحتاج تفعيل مزوّد الرؤية على الخادم.
              </span>
            )}
          </span>
        </>
      )}
    </p>
  )
}

/** مساعد اللون — يستخدمه مسار الاستيراد كمان. */
export const randomColor = () =>
  colorByName(ITEM_COLORS[Math.floor(Math.random() * ITEM_COLORS.length)].name)
