/**
 * إنشاء الموديل بخطوتين (M-01): لمن ننسّق، ثم المواصفات.
 * المطلوب فقط: الجنس والطول وشكل الجسم ولون البشرة.
 */
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { HAIR_COLORS, SKIN_TONES, modelImageUrl } from '@/infrastructure/rendering'
import { Button, Chip, Field, RangeField, TextInput } from '@/shared/components/ui'
import type { AgeRange, BodyShape, HairStyle, ModelCharacteristics } from '@/domain/model'
import type { Gender } from '@/domain/wardrobe'
import { cn } from '@/shared/lib'

const BODY_SHAPES: { id: BodyShape; label: string }[] = [
  { id: 'slim', label: 'نحيف' },
  { id: 'straight', label: 'مستقيم' },
  { id: 'athletic', label: 'رياضي' },
  { id: 'curvy', label: 'ممتلئ متناسق' },
  { id: 'plus', label: 'مقاسات أكبر' },
]

const HAIR_STYLES: { id: HairStyle; label: string; gender?: Gender }[] = [
  { id: 'long', label: 'طويل' },
  { id: 'medium', label: 'متوسط' },
  { id: 'short', label: 'قصير' },
  { id: 'tied', label: 'مرفوع' },
  { id: 'covered', label: 'مغطّى' },
  { id: 'bald', label: 'بدون' },
]

const AGES: AgeRange[] = ['18-24', '25-34', '35-44', '45+']

export const defaultCharacteristics = (gender: Gender): ModelCharacteristics => ({
  gender,
  heightCm: gender === 'female' ? 165 : 175,
  bodyShape: 'straight',
  skinToneId: 'medium',
  weightKg: gender === 'female' ? 60 : 76,
  hairStyle: gender === 'female' ? 'long' : 'short',
  hairColorHex: HAIR_COLORS[0],
  ageRange: '25-34',
})

export function GenderStep({
  value,
  onPick,
}: {
  value?: Gender
  onPick: (gender: Gender) => void
}) {
  const options: { id: Gender; label: string; latin: string }[] = [
    { id: 'female', label: 'نساء', latin: 'Female' },
    { id: 'male', label: 'رجال', latin: 'Male' },
  ]
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {options.map((o) => {
        const characteristics = defaultCharacteristics(o.id)
        return (
          <button
            key={o.id}
            onClick={() => onPick(o.id)}
            className={cn(
              'group flex flex-col items-center gap-4 rounded-md border bg-canvas p-6 transition-all',
              value === o.id ? 'border-ink' : 'border-line hover:border-line-strong',
            )}
          >
            <div className="h-[260px] w-full overflow-hidden rounded-md bg-stage">
              <img
                src={modelImageUrl({ characteristics, background: '#F7F7F5' })}
                alt={o.label}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="text-center">
              <p className="text-[15px]">{o.label}</p>
              <p className="lat text-[9px] text-faint">{o.latin}</p>
            </div>
          </button>
        )
      })}
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
  onNameChange: (name: string) => void
}) {
  const set = <K extends keyof ModelCharacteristics>(key: K, v: ModelCharacteristics[K]) =>
    onChange({ ...value, [key]: v })

  const hairOptions = useMemo(
    () => HAIR_STYLES.filter((h) => !h.gender || h.gender === value.gender),
    [value.gender],
  )

  return (
    <div className="flex flex-col gap-6">
      <Field label="اسم الموديل" hint="عشان تعرفينه لو عندك أكثر من واحد">
        <TextInput value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="موديلي" />
      </Field>

      <div>
        <p className="eyebrow mb-1">Body · مطلوب</p>
        <RangeField
          label="الطول"
          unit="سم"
          min={140}
          max={200}
          value={value.heightCm}
          onChange={(v) => set('heightCm', v)}
        />
        <div className="flex flex-col gap-3 border-b border-line py-4">
          <span className="text-[13px]">شكل الجسم</span>
          <div className="flex flex-wrap gap-2">
            {BODY_SHAPES.map((s) => (
              <Chip
                key={s.id}
                active={value.bodyShape === s.id}
                onClick={() => set('bodyShape', s.id)}
              >
                {s.label}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 border-b border-line py-4">
          <span className="text-[13px]">لون البشرة</span>
          <div className="flex flex-wrap gap-2.5">
            {SKIN_TONES.map((t) => (
              <button
                key={t.id}
                onClick={() => set('skinToneId', t.id)}
                aria-label={t.name}
                title={t.name}
                className={cn(
                  'h-9 w-9 rounded-full border border-[rgba(0,0,0,0.1)] transition-all',
                  value.skinToneId === t.id && 'ring-1 ring-ink ring-offset-2 ring-offset-canvas',
                )}
                style={{ background: t.hex }}
              />
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className="eyebrow mb-1">تفاصيل اختيارية</p>
        <RangeField
          label="الوزن التقريبي"
          unit="كجم"
          min={40}
          max={140}
          value={value.weightKg ?? 62}
          onChange={(v) => set('weightKg', v)}
        />
        <div className="flex flex-col gap-3 border-b border-line py-4">
          <span className="text-[13px]">الشعر</span>
          <div className="flex flex-wrap gap-2">
            {hairOptions.map((h) => (
              <Chip key={h.id} active={value.hairStyle === h.id} onClick={() => set('hairStyle', h.id)}>
                {h.label}
              </Chip>
            ))}
          </div>
          <div className="mt-1 flex gap-2.5">
            {HAIR_COLORS.map((hex) => (
              <button
                key={hex}
                onClick={() => set('hairColorHex', hex)}
                aria-label="لون الشعر"
                className={cn(
                  'h-7 w-7 rounded-full border border-[rgba(0,0,0,0.1)] transition-all',
                  value.hairColorHex === hex && 'ring-1 ring-ink ring-offset-2 ring-offset-canvas',
                )}
                style={{ background: hex }}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 border-b border-line py-4">
          <span className="text-[13px]">الفئة العمرية</span>
          <div className="flex flex-wrap gap-2">
            {AGES.map((a) => (
              <Chip key={a} active={value.ageRange === a} onClick={() => set('ageRange', a)}>
                <span className="font-latin">{a}</span>
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ModelPreview({
  characteristics,
  onRegenerate,
  busy,
}: {
  characteristics: ModelCharacteristics
  onRegenerate?: () => void
  busy?: boolean
}) {
  const src = modelImageUrl({ characteristics, background: '#F7F7F5' })
  return (
    <div className="sticky top-24">
      <div className="relative overflow-hidden rounded-md border border-line bg-stage">
        <motion.img
          key={src}
          initial={{ opacity: 0.4 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
          src={src}
          alt="معاينة الموديل"
          className="h-[540px] w-full object-contain"
        />
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-canvas/70 text-[13px] text-muted">
            نجهّز موديلك…
          </div>
        )}
      </div>
      {onRegenerate && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRegenerate}>
          <RefreshCw size={13} strokeWidth={1.5} />
          إعادة توليد
        </Button>
      )}
    </div>
  )
}
