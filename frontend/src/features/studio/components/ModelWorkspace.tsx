/**
 * مساحة الموديل — بطل الصفحة.
 *
 * أكبر عنصر بصري، وليست بطاقة صغيرة. تستقبل القطع المسحوبة من الخزانة،
 * وتعرض إمّا الموديل أو معاينة الإطلالة المولّدة.
 *
 * المعاينة القديمة **تُعلَّم** لما تتغيّر الإطلالة بدل ما تُعرض كأنها حالية —
 * عرض نتيجة لا تطابق الاختيار خداع بصري (المبدأ ٤).
 */
import { useState } from 'react'
import { Loader2, Maximize2, Minus, Plus, RotateCcw, Sliders, UserRound } from 'lucide-react'
import { DRAG_MIME } from './ClothingCard'
import { Button } from '@/shared/components/ui'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { STAGE_LABELS } from '../useTryOn'
import { cn } from '@/shared/lib'
import type { TryOnStageId, VirtualTryOnResult } from '@/domain/outfit'
import type { WardrobeItem } from '@/domain/wardrobe'

export type PreviewMode = 'model' | 'preview'

export function ModelWorkspace({
  mode,
  onModeChange,
  modelImageUrl,
  modelName,
  hasModel,
  items,
  result,
  stale,
  busy,
  stage,
  notice,
  dragging,
  onDropItem,
  onEditModel,
  onCreateModel,
  onRefreshPreview,
}: {
  mode: PreviewMode
  onModeChange: (mode: PreviewMode) => void
  modelImageUrl?: string
  modelName?: string
  hasModel: boolean
  items: WardrobeItem[]
  result?: VirtualTryOnResult
  /** المعاينة لا تطابق الاختيار الحالي */
  stale: boolean
  busy: boolean
  stage?: TryOnStageId
  notice?: string
  dragging: boolean
  onDropItem: (itemId: string) => void
  onEditModel: () => void
  onCreateModel: () => void
  onRefreshPreview: () => void
}) {
  const [over, setOver] = useState(false)
  const [zoom, setZoom] = useState(1)

  const showPreview = mode === 'preview'

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ---------------- شريط الأدوات ---------------- */}
      <div className="flex flex-none items-center justify-between gap-3 px-5 py-3">
        <div
          role="group"
          aria-label="طريقة العرض"
          className="flex overflow-hidden rounded-md border border-line"
        >
          {(
            [
              ['model', 'الموديل'],
              ['preview', 'معاينة الإطلالة'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => onModeChange(value)}
              aria-pressed={mode === value}
              className={cn(
                'h-8 px-3.5 text-[11.5px] transition-colors duration-[250ms]',
                mode === value ? 'bg-ink text-white' : 'text-muted hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Button variant="secondary" size="sm" onClick={onEditModel}>
          <Sliders size={13} strokeWidth={1.5} aria-hidden />
          تعديل الموديل
        </Button>
      </div>

      {/* ---------------- اللوحة ---------------- */}
      <div
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes(DRAG_MIME)) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setOver(false)
          const id = event.dataTransfer.getData(DRAG_MIME)
          if (id) onDropItem(id)
        }}
        className={cn(
          'relative mx-5 mb-4 grid min-h-0 flex-1 place-items-center overflow-hidden rounded-md',
          'bg-stage transition-[box-shadow,background-color] duration-[250ms] ease-soft',
          over && 'ring-1 ring-ink',
          dragging && !over && 'ring-1 ring-line-strong',
        )}
      >
        {/* نداء الإفلات — يظهر أثناء السحب فقط */}
        {dragging && (
          <p
            className={cn(
              'absolute top-5 z-10 rounded-full border border-line bg-canvas/95 px-4 py-1.5 text-[11.5px] backdrop-blur-sm',
              over ? 'text-ink' : 'text-muted',
            )}
          >
            أفلتي القطعة لتجربتها
          </p>
        )}

        {busy ? (
          <PreviewLoading stage={stage} />
        ) : showPreview && result ? (
          <div className="relative flex h-full w-full flex-col items-center justify-center gap-4 p-6">
            <img
              src={result.resultImageUrl}
              alt="معاينة الإطلالة"
              className={cn(
                'max-h-full max-w-full object-contain mix-blend-multiply transition-opacity',
                stale && 'opacity-45',
              )}
              style={{ transform: `scale(${zoom})` }}
            />
            {stale && (
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-canvas/92 px-5 py-4 backdrop-blur-sm">
                <p className="text-[12px]">غيّرتِ الإطلالة — المعاينة قديمة.</p>
                <Button size="sm" onClick={onRefreshPreview}>
                  تحديث المعاينة
                </Button>
              </div>
            )}
          </div>
        ) : showPreview ? (
          <EmptyPreview items={items} onRefreshPreview={onRefreshPreview} />
        ) : hasModel ? (
          <img
            src={modelImageUrl}
            alt={modelName ?? 'موديلك'}
            className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-[250ms] ease-soft"
            style={{ transform: `scale(${zoom})` }}
          />
        ) : (
          <div className="flex max-w-[320px] flex-col items-center gap-4 text-center">
            <UserRound size={28} strokeWidth={1.1} aria-hidden className="text-faint" />
            <p className="text-[14px]">ما عندك موديل بعد.</p>
            <p className="text-[12px] leading-7 text-muted">
              أنشئيه مرة وحدة بمقاساتك، ونستخدمه في كل تجربة.
            </p>
            <Button size="sm" onClick={onCreateModel}>
              أنشئي موديلك
            </Button>
          </div>
        )}

        {/* تحكم الحجم */}
        <div className="absolute bottom-4 left-4 flex flex-col overflow-hidden rounded-md border border-line bg-canvas/90 backdrop-blur-sm">
          {(
            [
              [Plus, 'تكبير', () => setZoom((z) => Math.min(1.6, z + 0.15))],
              [Minus, 'تصغير', () => setZoom((z) => Math.max(0.7, z - 0.15))],
              [RotateCcw, 'إعادة الضبط', () => setZoom(1)],
            ] as const
          ).map(([Icon, label, action]) => (
            <button
              key={label}
              onClick={action}
              aria-label={label}
              title={label}
              className="grid h-8 w-8 place-items-center text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <Icon size={13} strokeWidth={1.5} aria-hidden />
            </button>
          ))}
        </div>

        {notice && !busy && (
          <p className="absolute inset-x-0 bottom-0 border-t border-line bg-canvas/95 px-5 py-2.5 text-center text-[11px] leading-6 text-muted backdrop-blur-sm">
            {notice}
          </p>
        )}
      </div>
    </div>
  )
}

/** تحميل بمراحل معلنة — لا دوّارة صامتة (S-03). */
function PreviewLoading({ stage }: { stage?: TryOnStageId }) {
  const index = STAGE_LABELS.findIndex((item) => item.id === stage)
  const done = index < 0 ? 0 : index

  return (
    <div className="flex w-full max-w-[280px] flex-col items-center gap-5">
      <span className="grid h-11 w-11 place-items-center rounded-full border border-line bg-canvas">
        <Loader2 size={17} strokeWidth={1.5} aria-hidden className="animate-spin text-muted" />
      </span>
      <p className="text-[14px]">نجهّز إطلالتك…</p>

      <ul className="w-full">
        {STAGE_LABELS.map((item, position) => (
          <li
            key={item.id}
            className={cn(
              'py-1 text-center text-[11.5px] transition-colors',
              position <= done ? 'text-ink' : 'text-faint',
            )}
          >
            {item.label}
          </li>
        ))}
      </ul>

      <span className="h-px w-full overflow-hidden bg-line">
        <span
          className="block h-full bg-ink transition-all duration-500"
          style={{ width: `${((done + 1) / STAGE_LABELS.length) * 100}%` }}
        />
      </span>
    </div>
  )
}

function EmptyPreview({
  items,
  onRefreshPreview,
}: {
  items: WardrobeItem[]
  onRefreshPreview: () => void
}) {
  return (
    <div className="flex max-w-[340px] flex-col items-center gap-5 text-center">
      <Maximize2 size={24} strokeWidth={1.1} aria-hidden className="text-faint" />
      <p className="text-[14px]">
        {items.length === 0 ? 'اختاري قطعًا عشان نجهّز المعاينة.' : 'جاهزين نجهّز إطلالتك'}
      </p>

      {items.length > 0 && (
        <>
          <div className="flex items-center justify-center gap-2">
            {items.slice(0, 5).map((item) => (
              <span
                key={item.id}
                className="grid h-11 w-11 place-items-center overflow-hidden rounded-sm border border-line bg-canvas"
              >
                <ItemImage item={item} className="h-[80%] w-[80%]" />
              </span>
            ))}
          </div>
          <Button size="sm" onClick={onRefreshPreview}>
            اعرضيها على الموديل
          </Button>
        </>
      )}
    </div>
  )
}
