/**
 * استقبال الصورة الشخصية (M-07 · A-06). الإرشادات ومثال مشروح جنب صندوق الرفع،
 * والفحص يشتغل قبل أي توليد، وزر الحذف متاح في كل لحظة (المبدأ ٥).
 */
import { useRef, useState } from 'react'
import { AlertTriangle, Check, Trash2, Upload } from 'lucide-react'
import { PHOTO_GUIDELINES, validatePhoto } from '@/infrastructure/tryon'
import { modelImageUrl } from '@/infrastructure/rendering'
import { Button, toast } from '@/shared/components/ui'
import { useAiModels } from '@/features/ai-model/store'
import { uid } from '@/shared/lib'
import type { PhotoValidationResult } from '@/domain/model'

const exampleImage = modelImageUrl({
  characteristics: {
    gender: 'female',
    heightCm: 168,
    bodyShape: 'straight',
    skinToneId: 'medium',
    hairStyle: 'tied',
  },
  garments: [
    { slot: 'top', colorHex: '#EDEAE3', shape: 'tee' },
    { slot: 'bottom', colorHex: '#7C90A8', shape: 'jeans' },
    { slot: 'shoes', colorHex: '#F1F0ED', shape: 'sneakers' },
  ],
  background: '#F1F1EE',
})

export function PhotoUploader() {
  const { photo, setPhoto, clearPhoto } = useAiModels()
  const [checking, setChecking] = useState(false)
  const [validation, setValidation] = useState<PhotoValidationResult>()
  const inputRef = useRef<HTMLInputElement>(null)

  const onFile = async (file?: File) => {
    if (!file) return
    setChecking(true)
    setValidation(undefined)
    try {
      const result = await validatePhoto(file)
      setValidation(result)
      if (!result.ok) {
        toast.error('نحتاج صورة أوضح')
        return
      }
      const url = URL.createObjectURL(file)
      setPhoto({
        id: uid('photo'),
        url,
        fileName: file.name,
        width: result.meta.width,
        height: result.meta.height,
        createdAt: new Date().toISOString(),
      })
      toast.ok('جاهزة — نقدر نبدأ')
    } finally {
      setChecking(false)
    }
  }

  if (photo) {
    return (
      <div className="flex flex-col gap-4">
        <div className="relative overflow-hidden rounded-md border border-line bg-surface">
          <img src={photo.url} alt="صورتك" className="max-h-[280px] w-full object-contain" />
        </div>
        <div className="flex items-center justify-between text-[11.5px] text-faint">
          <span className="truncate">{photo.fileName}</span>
          <span className="font-latin">
            {photo.width}×{photo.height}
          </span>
        </div>
        {validation?.issues.filter((i) => i.severity === 'advisory').map((i) => (
          <p key={i.code} className="flex items-start gap-2 text-[11.5px] text-muted">
            <AlertTriangle size={13} strokeWidth={1.5} className="mt-0.5 flex-none" />
            {i.message}
          </p>
        ))}
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            clearPhoto()
            setValidation(undefined)
            toast.ok('حذفنا صورتك من المتصفح')
          }}
        >
          <Trash2 size={13} strokeWidth={1.5} />
          حذف صورتي
        </Button>
        <p className="text-[11px] leading-6 text-faint">
          صورتك محفوظة داخل متصفحك فقط في هذي النسخة — ما تنرفع لأي خادم، وتنمسح لما تسكّرين الصفحة.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-line-strong bg-canvas px-5 py-10 transition-colors hover:border-line-strong"
        >
          <Upload size={20} strokeWidth={1.3} className="text-muted" />
          <span className="text-[13px]">{checking ? 'نفحص الصورة…' : 'ارفعي صورتك'}</span>
          <span className="text-[11px] text-faint">JPG أو PNG · حتى ١٢ ميجا</span>
        </button>
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <img src={exampleImage} alt="مثال لصورة مناسبة" className="h-[200px] w-full object-contain" />
          <p className="border-t border-line bg-canvas px-3 py-2 text-center text-[10.5px] text-faint">
            مثال لصورة مناسبة
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      <div>
        <p className="eyebrow mb-3">عشان تطلع النتيجة أفضل</p>
        <ul className="flex flex-col gap-2">
          {PHOTO_GUIDELINES.map((g) => (
            <li key={g} className="flex items-center gap-2.5 text-[12.5px] text-muted">
              <Check size={13} strokeWidth={1.6} className="flex-none text-faint" />
              {g}
            </li>
          ))}
        </ul>
      </div>

      {validation && !validation.ok && (
        <div className="rounded-md border border-danger/30 bg-danger/[0.04] p-4">
          <p className="mb-2 text-[13px]">نحتاج صورة أوضح.</p>
          <ul className="flex flex-col gap-1.5">
            {validation.issues.map((i) => (
              <li key={i.code} className="text-[12px] text-muted">
                · {i.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
