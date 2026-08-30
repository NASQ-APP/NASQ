/**
 * تعديل الموديل — قياسات تقريبية.
 *
 * الحقول **كلها اختيارية**: من تعرف طولها فقط تكتبه وتمشي. إجبار سبعة حقول
 * قبل التجربة يقتل التدفّق، والقياسات أصلاً إرشاد لا شرط.
 *
 * ونقولها صراحة تحت النموذج: هذي **توجيه بصري** لا مقاس مضمون — الادّعاء
 * بدقة غير موجودة أسوأ من عدم الادّعاء (المبدأ ٤).
 */
import { useState } from 'react'
import { Drawer, Button, Field, TextInput, TextArea } from '@/shared/components/ui'
import type { BodyParameters } from '@/domain/tryon'

type FieldSpec = {
  key: keyof BodyParameters
  label: string
  unit: string
  min: number
  max: number
}

const FIELDS: FieldSpec[] = [
  { key: 'heightCm', label: 'الطول', unit: 'سم', min: 120, max: 220 },
  { key: 'weightKg', label: 'الوزن', unit: 'كجم', min: 30, max: 250 },
  { key: 'chestCm', label: 'الصدر', unit: 'سم', min: 60, max: 160 },
  { key: 'waistCm', label: 'الخصر', unit: 'سم', min: 40, max: 160 },
  { key: 'hipsCm', label: 'الأرداف', unit: 'سم', min: 60, max: 180 },
  { key: 'shoulderWidthCm', label: 'عرض الكتف', unit: 'سم', min: 30, max: 70 },
  { key: 'inseamCm', label: 'طول الساق الداخلي', unit: 'سم', min: 50, max: 100 },
]

export function AdjustModelDrawer({
  open,
  value,
  busy,
  onClose,
  onApply,
}: {
  open: boolean
  value: BodyParameters
  busy: boolean
  onClose: () => void
  onApply: (parameters: BodyParameters, refinement?: string) => void
}) {
  const [draft, setDraft] = useState<BodyParameters>(value)
  const [refinement, setRefinement] = useState('')

  const set = (key: keyof BodyParameters, raw: string) => {
    const parsed = Number(raw)
    setDraft((current) => ({
      ...current,
      [key]: raw.trim() === '' || Number.isNaN(parsed) ? undefined : parsed,
    }))
  }

  const filled = Object.values(draft).some((entry) => entry != null)

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow="Adjust model"
      title="تعديل الموديل"
      footer={
        <div className="flex gap-3">
          <Button
            onClick={() => onApply(draft, refinement.trim() || undefined)}
            disabled={busy || (!filled && !refinement.trim())}
          >
            {busy ? 'نعدّل الموديل…' : 'طبّقي التعديل'}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            إلغاء
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <p className="text-[12.5px] leading-7 text-muted">
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
                value={draft[field.key] ?? ''}
                onChange={(event) => set(field.key, event.target.value)}
                placeholder="—"
              />
            </Field>
          ))}
        </div>

        <Field label="تعديل بكلماتك (اختياري)" hint="مثلًا: خصر أضيق شوي · أكتاف أعرض">
          <TextArea
            value={refinement}
            onChange={(event) => setRefinement(event.target.value)}
            placeholder="خلي القوام أنحف شوي"
          />
        </Field>

        <p className="rounded-md border border-line bg-surface px-4 py-3 text-[11.5px] leading-6 text-muted">
          القياسات تُستخدم **توجيهًا بصريًا** لتقريب التناسب، ما تتحوّل لقياس
          هندسي. النتيجة تمثيل تقريبي بالذكاء الاصطناعي ولا تضمن المقاس الحقيقي.
        </p>
      </div>
    </Drawer>
  )
}
