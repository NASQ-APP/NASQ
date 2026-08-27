/**
 * مساحة الموديل — بطل الصفحة.
 *
 * أكبر عنصر بصري، وليست بطاقة صغيرة. تعرض الموديل المختار، وتستقبل القطع
 * المسحوبة من الخزانة لتضيفها للإطلالة.
 *
 * ما فيها أي توليد: العرض والاختيار فقط. أي نظام تجربة قادم يركّب فوقها بلا
 * ما يعيد بناء التخطيط ولا السحب والإفلات.
 */
import { useState } from 'react'
import { Minus, Plus, RotateCcw, Sliders, UserRound } from 'lucide-react'
import { DRAG_MIME } from './ClothingCard'
import { Button } from '@/shared/components/ui'
import { cn } from '@/shared/lib'

export function ModelWorkspace({
  modelImageUrl,
  modelName,
  hasModel,
  notice,
  dragging,
  onDropItem,
  onEditModel,
  onCreateModel,
}: {
  modelImageUrl?: string
  modelName?: string
  hasModel: boolean
  notice?: string
  dragging: boolean
  onDropItem: (itemId: string) => void
  onEditModel: () => void
  onCreateModel: () => void
}) {
  const [over, setOver] = useState(false)
  const [zoom, setZoom] = useState(1)

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ---------------- شريط الأدوات ---------------- */}
      <div className="flex flex-none items-center justify-end gap-3 px-5 py-3">
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
            أفلتي القطعة لتضيفينها للإطلالة
          </p>
        )}

        {hasModel ? (
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
              أنشئيه مرة وحدة بمقاساتك، ونستخدمه في كل مرة.
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

        {notice && (
          <p className="absolute inset-x-0 bottom-0 border-t border-line bg-canvas/95 px-5 py-2.5 text-center text-[11px] leading-6 text-muted backdrop-blur-sm">
            {notice}
          </p>
        )}
      </div>
    </div>
  )
}
