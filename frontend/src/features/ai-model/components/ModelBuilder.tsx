/**
 * إنشاء الموديل بخطوتين (M-01): لمن ننسّق، ثم القياسات.
 *
 * الخطوة الثانية **قياسات لا أوصاف**. كانت تسأل عن شكل الجسم ولون البشرة
 * والشعر والفئة العمرية — تصنيفات تُجبر المستخدمة على اختيار خانة قد لا
 * تشبهها، ولا يعرف النموذج كيف يترجمها إلى جسم. القياس رقم تعرفه عن نفسها،
 * ويقدر النموذج يقرّب التناسب منه.
 *
 * وهي نفس حقول «تعديل الموديل» في الاستوديو: نفس الأسئلة بشكلين مختلفين تعني
 * بيانات تتفرّق مع الوقت.
 */
import { ImagePlus } from 'lucide-react'
import { readyModelFor } from '@/domain/model'
import { Field, TextArea, TextInput } from '@/shared/components/ui'
import type { ModelCharacteristics } from '@/domain/model'
import type { Gender } from '@/domain/wardrobe'
import { cn } from '@/shared/lib'

type FieldSpec = {
  key: keyof Omit<ModelCharacteristics, 'gender' | 'refinement'>
  label: string
  unit: string
  min: number
  max: number
}

/** نفس ترتيب `AdjustModelDrawer` ونفس حدوده — مصدر واحد للسؤال. */
const FIELDS: FieldSpec[] = [
  { key: 'heightCm', label: 'الطول', unit: 'سم', min: 120, max: 220 },
  { key: 'weightKg', label: 'الوزن', unit: 'كجم', min: 30, max: 250 },
  { key: 'chestCm', label: 'الصدر', unit: 'سم', min: 60, max: 160 },
  { key: 'waistCm', label: 'الخصر', unit: 'سم', min: 40, max: 160 },
  { key: 'hipsCm', label: 'الأرداف', unit: 'سم', min: 60, max: 180 },
  { key: 'shoulderWidthCm', label: 'عرض الكتف', unit: 'سم', min: 30, max: 70 },
  { key: 'inseamCm', label: 'طول الساق الداخلي', unit: 'سم', min: 50, max: 100 },
]

export const defaultCharacteristics = (gender: Gender): ModelCharacteristics => ({ gender })

export function GenderStep({
  value,
  onPick,
  onUsePhoto,
}: {
  value?: Gender
  onPick: (gender: Gender) => void
  /** مسار ثالث: صورتك بدل موديل بمقاسات — يتخطّى خطوة القياسات */
  onUsePhoto?: () => void
}) {
  const options: { id: Gender; label: string; latin: string }[] = [
    { id: 'female', label: 'نساء', latin: 'Female' },
    { id: 'male', label: 'رجال', latin: 'Male' },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {options.map((option) => {
        const ready = readyModelFor(option.id)
        return (
          <button
            key={option.id}
            onClick={() => onPick(option.id)}
            aria-pressed={value === option.id}
            className={cn(
              'group flex flex-col overflow-hidden rounded-md border bg-canvas transition-colors',
              value === option.id ? 'border-ink' : 'border-line hover:border-line-strong',
            )}
          >
            {/*
              صورة فوتوغرافية حقيقية لا رسمًا متّجهًا: الاختيار بصري، ورسمة
              تخطيطية ما تقول للمستخدمة كيف بتطلع النتيجة فعلاً.
            */}
            <span className="grid aspect-[4/5] w-full place-items-center overflow-hidden bg-stage">
              <img
                src={ready.imageUrl}
                alt={option.label}
                className="h-full w-full object-contain transition-transform duration-[320ms] ease-soft group-hover:scale-[1.02]"
              />
            </span>
            <span className="p-4 text-center">
              <span className="block text-[15px]">{option.label}</span>
              <span className="lat block text-[9px] text-faint">{option.latin}</span>
            </span>
          </button>
        )
      })}

      {onUsePhoto && (
        <button
          onClick={onUsePhoto}
          className="flex items-center gap-3 rounded-md border border-dashed border-line-strong p-4 text-right transition-colors hover:border-ink sm:col-span-2"
        >
          <ImagePlus size={18} strokeWidth={1.4} aria-hidden className="flex-none text-muted" />
          <span className="flex-1">
            <span className="block text-[14px]">أو استخدمي صورتك</span>
            <span className="block text-[11.5px] leading-6 text-faint">
              صورة كاملة للجسم بإضاءة واضحة — نجرّب القطع عليها مباشرة بلا مقاسات.
            </span>
          </span>
        </button>
      )}
    </div>
  )
}

export function CharacteristicsForm({
  value,
  onChange,
  name,
  onNameChange,
}: {
  value: ModelCharacteristics
  onChange: (next: ModelCharacteristics) => void
  name: string
  onNameChange: (next: string) => void
}) {
  /** الحقل الفاضي يعني «ما أعرف» لا صفرًا — فيُحذف المفتاح بدل ما يُخزَّن 0. */
  const setNumber = (key: FieldSpec['key'], raw: string) => {
    const parsed = Number(raw)
    onChange({
      ...value,
      [key]: raw.trim() === '' || Number.isNaN(parsed) ? undefined : parsed,
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <Field label="اسم الموديل" hint="عشان تعرفينه لو عندك أكثر من واحد">
        <TextInput
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="موديلي"
        />
      </Field>

      <div>
        <p className="eyebrow mb-1">Body · اختياري</p>
        <p className="mb-5 text-[12.5px] leading-7 text-muted">
          كل الحقول اختيارية — عبّي اللي تعرفينه واتركي الباقي.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <Field key={field.key} label={`${field.label} (${field.unit})`}>
              <TextInput
                type="number"
                inputMode="numeric"
                min={field.min}
                max={field.max}
                value={value[field.key] ?? ''}
                onChange={(event) => setNumber(field.key, event.target.value)}
                placeholder="—"
              />
            </Field>
          ))}
        </div>
      </div>

      <Field label="تعديل بكلماتك (اختياري)" hint="مثلًا: خصر أضيق شوي · أكتاف أعرض">
        <TextArea
          value={value.refinement ?? ''}
          onChange={(event) => onChange({ ...value, refinement: event.target.value })}
          placeholder="خلي القوام أنحف شوي"
        />
      </Field>

      <p className="rounded-md border border-line bg-surface px-4 py-3 text-[11.5px] leading-6 text-muted">
        القياسات تُستخدم توجيهًا بصريًا لتقريب التناسب، ما تتحوّل لقياس هندسي.
        النتيجة تمثيل تقريبي بالذكاء الاصطناعي ولا تضمن المقاس الحقيقي.
      </p>
    </div>
  )
}

/** ملخّص القياسات المعبّأة — يُقرأ في المعاينة وفي بطاقة الموديل. */
export function describeCharacteristics(characteristics: ModelCharacteristics): string {
  const parts = FIELDS.map((field) => {
    const entry = characteristics[field.key]
    return entry == null ? undefined : `${field.label} ${entry} ${field.unit}`
  }).filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : 'بلا قياسات'
}

/**
 * معاينة الموديل — صورة الأساس التي ستُبنى عليها التجربة.
 *
 * الصورة **ثابتة لا تتغيّر مع القياسات**، ونقولها صراحة. كانت رسمة متّجهة
 * تتمدّد وتنكمش مع كل رقم، وهذا ادّعاء بدقة غير موجودة: القياسات تُستخدم
 * توجيهًا للذكاء الاصطناعي لا قياسًا هندسيًا (المبدأ ٤). فبدل معاينة تكذب،
 * نعرض الأساس الحقيقي وملخّص ما أدخلتِه.
 */
export function ModelPreview({ characteristics }: { characteristics: ModelCharacteristics }) {
  const ready = readyModelFor(characteristics.gender)

  return (
    <div className="sticky top-24">
      <div className="overflow-hidden rounded-md border border-line bg-stage">
        <img src={ready.imageUrl} alt={ready.name} className="h-[540px] w-full object-contain" />
      </div>

      <p className="mt-3 text-[12px] leading-7 text-muted">
        {describeCharacteristics(characteristics)}
      </p>
      <p className="mt-1 text-[11px] leading-6 text-faint">
        هذي صورة الأساس، وما تتغيّر مع القياسات. قياساتك تُستخدم توجيهًا بصريًا عند
        توليد الإطلالة، والنتيجة تقريبية.
      </p>
    </div>
  )
}
