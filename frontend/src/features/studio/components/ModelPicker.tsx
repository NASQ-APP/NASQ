/**
 * «على مين تبين نجرب الإطلالة؟»
 *
 * ثلاثة مصادر: الموديل النسائي · الرجالي · صورتك. الموديلان صور فوتوغرافية
 * حقيقية تُعرض بحجم كبير لأن الاختيار بصري لا نصّي — ومن يختار جسمًا يحتاج
 * يشوفه.
 *
 * «تعديل الموديل» **خيار ثانوي لا خطوة إجبارية**: يظهر بعد الاختيار، ومن ما
 * يبيه يمشي مباشرة للتجربة.
 *
 * صورتك ما تُرفع لأي خادم في هذي النسخة — تعيش في ذاكرة الجلسة، والنص يقولها.
 */
import { ImagePlus, Sliders, UserRound, Users } from 'lucide-react'
import { READY_MODELS } from '@/domain/model'
import { describeCharacteristics } from '@/features/ai-model/components/ModelBuilder'
import type { AiModel } from '@/domain/model'
import { Button } from '@/shared/components/ui'
import { PhotoUploader } from './PhotoUploader'
import { cn } from '@/shared/lib'

export type ModelChoice = 'ready' | 'photo'

export function ModelPicker({
  choice,
  readyModelId,
  savedModels,
  activeModelId,
  hasPhoto,
  onChooseSaved,
  onChooseReady,
  onChoosePhoto,
  onAdjust,
}: {
  choice: ModelChoice
  readyModelId?: string
  /** الموديلات المحفوظة — كل واحد يحمل قياساته بمعرّفه */
  savedModels: AiModel[]
  activeModelId?: string
  hasPhoto: boolean
  onChooseSaved: (id: string) => void
  onChooseReady: (id: string) => void
  onChoosePhoto: () => void
  onAdjust: () => void
}) {
  // العنوان تكفّلت به النافذة الحاوية — تكراره هنا يطبع رأسين على شاشة وحدة
  return (
    <div className="flex flex-col gap-6">
      {/*
        ---------------- موديلاتي ----------------
        تُعرض أولاً لأنها تحمل قياسات المستخدمة، والجاهزة أساس بلا قياس.
        اختيار موديل هنا يحمّل قياساته للتوليد — القياسات تتبع المعرّف.
      */}
      {savedModels.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="eyebrow">My models</p>
          <ul className="grid gap-2">
            {savedModels.map((model) => {
              const active = choice === 'ready' && activeModelId === model.id
              return (
                <li key={model.id}>
                  <button
                    onClick={() => onChooseSaved(model.id)}
                    aria-pressed={active}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-right transition-colors',
                      active ? 'border-ink' : 'border-line hover:border-line-strong',
                    )}
                  >
                    <span className="grid h-12 w-10 flex-none place-items-center overflow-hidden rounded-sm bg-stage">
                      <img
                        src={model.previewImageUrl}
                        alt=""
                        aria-hidden
                        className="h-full w-full object-contain"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px]">{model.name}</span>
                      <span className="block truncate text-[10.5px] leading-5 text-faint">
                        {describeCharacteristics(model.characteristics)}
                      </span>
                    </span>
                    {active && <span className="lat flex-none text-[9.5px] text-muted">المختار</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* ---------------- الموديلات الجاهزة ---------------- */}
      <ul className="grid gap-4 sm:grid-cols-2">
        {READY_MODELS.map((model) => {
          // الموديل الجاهز يُعدّ مختارًا فقط لو ما فيه موديل محفوظ مثبّت
          const active = choice === 'ready' && !activeModelId && readyModelId === model.id

          return (
            <li key={model.id}>
              <button
                onClick={() => onChooseReady(model.id)}
                aria-pressed={active}
                className={cn(
                  'group flex w-full flex-col overflow-hidden rounded-md border text-right transition-colors duration-[250ms]',
                  active ? 'border-ink' : 'border-line hover:border-line-strong',
                )}
              >
                <span className="grid aspect-[4/5] w-full place-items-center overflow-hidden bg-stage">
                  <img
                    src={model.imageUrl}
                    alt={model.name}
                    className="h-full w-full object-contain transition-transform duration-[320ms] ease-soft group-hover:scale-[1.02]"
                  />
                </span>
                <span className="flex items-center justify-between gap-2 px-4 py-3">
                  <span className="text-[13px]">{model.name}</span>
                  {active && (
                    <span className="lat text-[9.5px] text-muted">المختار</span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {/* «تعديل الموديل» ثانوي — يظهر بعد اختيار موديل جاهز فقط */}
      {choice === 'ready' && readyModelId && (
        <Button variant="secondary" size="sm" onClick={onAdjust} className="self-start">
          <Sliders size={13} strokeWidth={1.5} aria-hidden />
          تعديل الموديل
        </Button>
      )}

      {/* ---------------- أو صورتي ---------------- */}
      <div className="flex items-center gap-4">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[11px] text-faint">أو</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={onChoosePhoto}
          aria-pressed={choice === 'photo'}
          className={cn(
            'flex items-center gap-3 rounded-md border px-4 py-3 text-right transition-colors duration-[250ms]',
            choice === 'photo' ? 'border-ink' : 'border-dashed border-line-strong hover:border-ink',
          )}
        >
          <ImagePlus size={16} strokeWidth={1.4} aria-hidden className="text-muted" />
          <span className="flex-1">
            <span className="block text-[13px]">استخدمي صورتي</span>
            <span className="block text-[11px] leading-6 text-faint">
              صورة كاملة للجسم، مواجهة للكاميرا، بإضاءة واضحة
            </span>
          </span>
          {hasPhoto && <UserRound size={14} strokeWidth={1.5} aria-hidden className="text-ink" />}
        </button>

        {choice === 'photo' && (
          <div className="flex flex-col gap-3">
            <PhotoUploader />
            <p className="text-[11px] leading-6 text-faint">
              صورتك ما تُرفع لأي خادم — تعيش في متصفحك لهذي الجلسة فقط.
            </p>
          </div>
        )}
      </div>

      {choice === 'ready' && !readyModelId && (
        <p className="flex items-center gap-2 text-[11.5px] text-faint">
          <Users size={13} strokeWidth={1.5} aria-hidden />
          اختاري موديلاً للبدء.
        </p>
      )}
    </div>
  )
}
