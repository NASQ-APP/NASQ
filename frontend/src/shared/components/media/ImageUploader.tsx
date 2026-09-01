/**
 * حقل رفع صورة موحّد لكل التطبيق.
 *
 * المسار: اختيار صورة ← إزالة الخلفية ← معاينة قبل/بعد ← موافقة ← حفظ.
 * **ما يحفظ شيئًا بنفسه** — ينادي `onConfirm` بعد موافقة المستخدمة، والحفظ
 * مسؤولية المنادي حسب مكانه (خزانة، صورة شخصية، …).
 *
 * إزالة الخلفية مفعّلة افتراضيًا لصور القطع، وتُطفأ بـ`backgroundRemoval={false}`
 * للصور اللي ما تحتاج معالجة مثل الصورة الشخصية.
 */
import { useEffect, useId, useRef, useState, type DragEvent } from 'react'
import { Loader2, RotateCcw, Upload, X } from 'lucide-react'
import { Button } from '@/shared/components/ui'
import { useBackgroundRemoval } from '@/shared/hooks'
import { ACCEPT_ATTRIBUTE, MAX_IMAGE_MB, type ImageCandidate, type ImageError } from '@/domain/images'
import { cn } from '@/shared/lib'
import { useVoice } from '@/features/onboarding/voice'

export type ImageUploaderProps = {
  /** إزالة الخلفية — مفعّلة افتراضيًا */
  backgroundRemoval?: boolean
  acceptedTypes?: string
  maxSizeMb?: number
  disabled?: boolean
  /** يفتح كاميرا الجوال مباشرة بدل متصفّح الملفات */
  capture?: boolean
  /** نص زر التأكيد — يختلف بين «أضيفي» و«احفظي» */
  confirmLabel?: string
  /** نص منطقة الإفلات */
  hint?: string
  onOriginalSelected?: (file: File) => void
  onProcessed?: (blob: Blob) => void
  onError?: (error: ImageError) => void
  /** بعد موافقة المستخدمة على النسخة اللي تبيها */
  onConfirm: (candidate: ImageCandidate) => void | Promise<void>
  onCancel?: () => void
}

export function ImageUploader({
  backgroundRemoval = true,
  acceptedTypes = ACCEPT_ATTRIBUTE,
  maxSizeMb = MAX_IMAGE_MB,
  disabled,
  capture,
  confirmLabel = 'استخدمي هذي الصورة',
  hint,
  onOriginalSelected,
  onProcessed,
  onError,
  onConfirm,
  onCancel,
}: ImageUploaderProps) {
  const say = useVoice()
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [saving, setSaving] = useState(false)
  const statusId = useId()

  const uploader = useBackgroundRemoval({
    enabled: backgroundRemoval,
    acceptedTypes: acceptedTypes.split(','),
    maxBytes: maxSizeMb * 1024 * 1024,
    onError,
  })
  const { state, originalUrl, processedUrl, selected } = uploader

  const take = (file?: File) => {
    if (!file || disabled) return
    onOriginalSelected?.(file)
    uploader.select(file)
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    take(event.dataTransfer.files?.[0])
  }

  const confirm = async () => {
    if (!selected || saving) return
    setSaving(true)
    try {
      await onConfirm(selected)
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    uploader.reset()
    onCancel?.()
  }

  // نبلّغ المنادي أول ما تجهز النسخة المنقّاة — من effect، مو أثناء الرسم
  const processedBlob = state.processed?.blob
  const notify = useRef(onProcessed)
  useEffect(() => {
    notify.current = onProcessed
  })
  useEffect(() => {
    if (processedBlob) notify.current?.(processedBlob)
  }, [processedBlob])

  const busy = state.status === 'processing'

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={input}
        type="file"
        accept={acceptedTypes}
        capture={capture ? 'environment' : undefined}
        disabled={disabled}
        onChange={(event) => {
          take(event.target.files?.[0])
          event.target.value = ''
        }}
        className="hidden"
      />

      {state.status === 'idle' ? (
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <button
            type="button"
            disabled={disabled}
            onClick={() => input.current?.click()}
            className={cn(
              'flex w-full flex-col items-center gap-2 rounded-md border border-dashed px-6 py-12',
              'text-center transition-colors duration-[320ms] ease-soft disabled:opacity-40',
              dragging ? 'border-ink bg-surface' : 'border-line-strong hover:border-ink',
            )}
          >
            <Upload size={20} strokeWidth={1.3} aria-hidden className="text-faint" />
            <span className="text-[13px]">
              {hint ?? say('اسحبي صورة القطعة هنا، أو اختاري من جهازك', 'اسحب صورة القطعة هنا، أو اختر من جهازك')}
            </span>
            <span className="text-[11px] text-faint">
              PNG أو JPG أو WEBP · حتى {maxSizeMb} ميجا
            </span>
          </button>
        </div>
      ) : (
        <>
          <div className={cn('grid gap-3', state.status === 'ready' && backgroundRemoval && 'sm:grid-cols-2')}>
            <Preview
              label="الأصلية"
              url={originalUrl}
              active={state.chosen === 'original'}
              selectable={state.status !== 'processing'}
              onSelect={() => uploader.choose('original')}
            />

            {backgroundRemoval && state.status !== 'failed' && (
              <Preview
                label="بعد إزالة الخلفية"
                url={processedUrl}
                whiteBackdrop
                busy={busy}
                active={state.chosen === 'processed'}
                selectable={Boolean(state.processed)}
                onSelect={() => uploader.choose('processed')}
              />
            )}
          </div>

          <p id={statusId} role="status" aria-live="polite" className="text-[12px] text-muted">
            {busy && (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={13} strokeWidth={1.6} aria-hidden className="animate-spin" />
                جاري إزالة الخلفية…
              </span>
            )}
            {state.status === 'failed' && <span className="text-danger">{state.error?.message}</span>}
            {state.status === 'ready' &&
              backgroundRemoval &&
              state.processed &&
              say('اختاري النسخة اللي تبينها.', 'اختر النسخة اللي تبيها.')}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button onClick={confirm} disabled={busy || saving || !selected} aria-describedby={statusId}>
              {saving ? 'نحفظ…' : confirmLabel}
            </Button>

            {(state.status === 'failed' || (state.status === 'ready' && backgroundRemoval)) && (
              <Button variant="secondary" onClick={uploader.retry} disabled={busy || saving}>
                <RotateCcw size={13} strokeWidth={1.5} aria-hidden />
                إعادة المحاولة
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={() => input.current?.click()}
              disabled={saving || disabled}
            >
              صورة أخرى
            </Button>

            <Button variant="ghost" onClick={cancel} disabled={saving}>
              <X size={13} strokeWidth={1.5} aria-hidden />
              إلغاء
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function Preview({
  label,
  url,
  whiteBackdrop,
  busy,
  active,
  selectable,
  onSelect,
}: {
  label: string
  url?: string
  whiteBackdrop?: boolean
  busy?: boolean
  active?: boolean
  selectable?: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!selectable}
      aria-pressed={selectable ? active : undefined}
      aria-label={label}
      className={cn(
        'flex flex-col gap-2 rounded-md border p-2 text-right transition-colors duration-[320ms] ease-soft',
        active && selectable ? 'border-ink' : 'border-line',
        selectable && !active && 'hover:border-line-strong',
      )}
    >
      <span
        className={cn(
          'grid aspect-square place-items-center overflow-hidden rounded-sm',
          // الخلفية المُزالة تُعرض بيضاء — نفس ما تُحفظ عليه بالضبط
          whiteBackdrop ? 'bg-canvas' : 'bg-surface',
        )}
      >
        {busy ? (
          <span className="skeleton h-full w-full" />
        ) : url ? (
          <img src={url} alt="" className="h-full w-full object-contain" />
        ) : null}
      </span>
      <span className="eyebrow px-1">{label}</span>
    </button>
  )
}
