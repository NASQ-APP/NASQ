/**
 * استقبال الصورة الشخصية (M-07 · A-06). الإرشادات ومثال مشروح جنب صندوق الرفع،
 * والفحص يشتغل قبل أي توليد، وزر الحذف متاح في كل لحظة (المبدأ ٥).
 *
 * إزالة الخلفية **مطفأة** هنا: هذي صورة شخص مو قطعة، وقصّها يشوّه النتيجة.
 * نستعمل نفس مكوّن الرفع المشترك عشان تجربة الاختيار والمعاينة واحدة في
 * التطبيق كله، ونضيف فوقها فحص جودة الصورة الخاص بهذي الشاشة.
 */
import { useState } from 'react'
import { AlertTriangle, Check, Trash2 } from 'lucide-react'
import { ImageUploader } from '@/shared/components/media/ImageUploader'
import { PHOTO_GUIDELINES, validatePhoto } from '@/infrastructure/model'
import { readyModelFor } from '@/domain/model'
import { Button, toast } from '@/shared/components/ui'
import { useAiModels } from '@/features/ai-model/store'
import { uid } from '@/shared/lib'
import type { PhotoValidationResult } from '@/domain/model'
import type { ImageCandidate } from '@/domain/images'
import { useVoice } from '@/features/onboarding/voice'

/**
 * مثال «الصورة الصحيحة»: صورة الموديل الجاهز نفسها.
 * كانت رسمة متّجهة، والرسمة ما تُري المستخدمة ما المطلوب فعلاً — لقطة كاملة
 * للجسم، مواجهة، بإضاءة واضحة وخلفية بسيطة. المثال يجب أن يكون من جنس المطلوب.
 */
const exampleImage = readyModelFor('female').imageUrl

export function PhotoUploader() {
  const say = useVoice()
  const { photo, setPhoto, clearPhoto } = useAiModels()
  const [validation, setValidation] = useState<PhotoValidationResult>()
  /** السبب المانع الأول — عنوانُ الرفض، وما عداه تفاصيل تحته. */
  const blockingIssue = validation?.issues.find((issue) => issue.severity === 'blocking')

  /** فحص جودة الصورة يجي بعد موافقة المستخدمة، وقبل أي حفظ. */
  const accept = async (candidate: ImageCandidate) => {
    const file = new File([candidate.blob], candidate.fileName, { type: candidate.blob.type })
    const result = await validatePhoto(file)
    setValidation(result)
    if (!result.ok) {
      /*
        السبب يُقال، لا يُخفى خلف «نحتاج صورة أوضح».

        كانت كل الأسباب — صيغة غير مدعومة، حجم كبير، دقة منخفضة، إعتام —
        تخرج برسالة واحدة. فمن رفعت صورة بدقة ٣٠٠ بكسل تحاول إضاءة الغرفة،
        ومن أرسل HEIC يعيد التصوير: كلاهما يصلح ما ليس معطوبًا.
      */
      const blocking = result.issues.find((issue) => issue.severity === 'blocking')
      toast.error(blocking?.message ?? 'ما قدرنا نقرأ هذي الصورة.')
      return
    }
    setPhoto({
      id: uid('photo'),
      url: URL.createObjectURL(candidate.blob),
      fileName: candidate.fileName,
      width: result.meta.width,
      height: result.meta.height,
      createdAt: new Date().toISOString(),
    })
    toast.ok('جاهزة — نقدر نبدأ')
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
        <ImageUploader
          backgroundRemoval={false}
          hint={say('اسحبي صورتك هنا، أو اختاري من جهازك', 'اسحب صورتك هنا، أو اختر من جهازك')}
          confirmLabel="استخدمي هذي الصورة"
          onConfirm={accept}
          onError={(error) => toast.error(error.message)}
        />
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <img src={exampleImage} alt="مثال لصورة مناسبة" className="h-[200px] w-full object-contain" />
          <p className="border-t border-line bg-canvas px-3 py-2 text-center text-[10.5px] text-faint">
            مثال لصورة مناسبة
          </p>
        </div>
      </div>

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
          <p className="mb-2 text-[13px]">{blockingIssue?.message ?? 'ما قدرنا نستخدم هذي الصورة.'}</p>
          <ul className="flex flex-col gap-1.5">
            {validation.issues
              .filter((i) => i !== blockingIssue)
              .map((i) => (
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
