/**
 * مساحة الموديل — بطل الصفحة.
 *
 * تعرض ثلاث حالات: الموديل المختار، أو مراحل التوليد، أو الإطلالة المولّدة.
 * والانتقال بينها لا يغيّر التخطيط، فما تقفز الصفحة تحت يد المستخدمة.
 *
 * التحميل **بمراحل مسمّاة** لا دوّارة صامتة: التوليد يأخذ وقتًا، والدوّارة
 * وحدها تخلي الانتظار يبدو معلّقًا. وما فيه نسبة مئوية — المزوّد ما يعطي
 * تقدّمًا حقيقيًا، والنسبة المخترعة كذبة صغيرة (المبدأ ٤).
 *
 * وتعديل القطع بعد التوليد **ما يعيد التوليد تلقائيًا**: الصورة تُعلَّم
 * «قديمة» وتنتظر أمرًا صريحًا. التوليد يكلّف وقتًا ومالاً، فربطه بكل ضغطة
 * يحرق الاثنين على تجربة ما طلبتها المستخدمة.
 */
import { useState } from 'react'
import {
  Bookmark,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Sliders,
  Sparkles,
  Undo2,
  UserRound,
  Users,
} from 'lucide-react'
import { DRAG_MIME } from './ClothingCard'
import { StudioSet, type LightTone } from './StudioSet'
import { Button, Segmented } from '@/shared/components/ui'
import { AI_DISCLAIMER, STAGE_LABELS } from '@/domain/tryon'
import { cn } from '@/shared/lib'
import type { TryOnStage } from '@/domain/tryon'

/**
 * صورة اللوحة — تملأ مكانها بلا قصّ.
 *
 * `max-h-full` وحده **ما يكفي هنا**: النسبة تُحسب على صف الشبكة، والصف يكبر
 * مع الصورة نفسها، فيلغي الحدُّ نفسَه وتفيض الصورة ويقصّها `overflow-hidden`.
 * الموضع المطلق يقيس على الحاوية ذات الارتفاع المحدّد بدل الصف، و`object-contain`
 * يترك النسبة سليمة. والحشو يمنع القوام من لمس الحواف.
 */
const STAGE_IMAGE =
  'absolute inset-0 z-[1] h-full w-full object-contain p-4 ' +
  // صور الموديل والنتيجة خلفيتها بيضاء صمّاء، فعلى أرضية رمادية تُقرأ
  // مستطيلاً يغطّي المنصّة. `multiply` يذيب الأبيض في الأرضية ويُبقي القوام.
  'mix-blend-multiply'

export function ModelWorkspace({
  modelImageUrl,
  modelName,
  hasModel,
  generatedLook,
  stale,
  busy,
  stage,
  itemCount,
  dragging,
  onDropItem,
  onChooseModel,
  onGenerate,
  onRegenerate,
  onSaveLook,
  onStartOver,
}: {
  modelImageUrl?: string
  modelName?: string
  hasModel: boolean
  /** الإطلالة المولّدة — تحلّ محل الموديل في اللوحة */
  generatedLook?: string
  /** تغيّرت القطع بعد التوليد، فالصورة ما تعود تطابق الاختيار */
  stale?: boolean
  busy: boolean
  stage?: TryOnStage
  itemCount: number
  dragging: boolean
  onDropItem: (itemId: string) => void
  onChooseModel: () => void
  onGenerate: () => void
  onRegenerate: () => void
  onSaveLook: () => void
  onStartOver: () => void
}) {
  const [over, setOver] = useState(false)
  const [zoom, setZoom] = useState(1)

  const [tone, setTone] = useState<LightTone>('warm')

  const canGenerate = hasModel && itemCount > 0 && !busy

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ---------------- شريط الأدوات ---------------- */}
      <div className="flex flex-none items-center justify-between gap-3 px-5 py-3">
        <p className="min-w-0 truncate text-[11.5px] text-muted">
          {generatedLook ? 'إطلالتك المولّدة' : hasModel ? modelName : 'ما فيه موديل'}
        </p>
        <div className="flex flex-none items-center gap-2">
          {/* لون إضاءة الاستوديو — اختيار المستخدمة */}
          <Segmented<LightTone>
            value={tone}
            onChange={setTone}
            options={[
              { value: 'warm', label: 'دافئ' },
              { value: 'white', label: 'أبيض' },
              { value: 'none', label: 'بدون' },
            ]}
          />
          <Button variant="secondary" size="sm" onClick={onChooseModel}>
            <Sliders size={13} strokeWidth={1.5} aria-hidden />
            {hasModel ? 'تغيير الموديل' : 'اختيار الموديل'}
          </Button>
        </div>
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
          'relative mx-5 grid min-h-0 flex-1 place-items-center overflow-hidden rounded-md',
          // أرضية الاستوديو. الدائرة البيضاء تحت الموديل هي المنصّة، فالتباين
          // بينهما هو اللي يرسم المكان. والوضع الأبيض يحتاج أرضية أغمق لأن
          // سطوع الضوء نسبي — ما يميّز الأبيض إلا فرقه عمّا تحته.
          'transition-[box-shadow,background-color] duration-[250ms] ease-soft',
          // الأبيض وحده يحتاج أرضية أغمق ليبان؛ «بدون» ما فيها ضوء تُقاس عليه
          tone === 'white' ? 'bg-studio-floor-dim' : 'bg-studio-floor',
          over && 'ring-1 ring-ink',
          dragging && !over && 'ring-1 ring-line-strong',
        )}
      >
        {/* طقم الاستوديو خلف كل شيء — منصّة وإضاءة، بلا لف */}
        {(hasModel || generatedLook) && !busy && <StudioSet tone={tone} />}

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

        {busy ? (
          <GenerationStages stage={stage} />
        ) : generatedLook ? (
          <>
            <img
              src={generatedLook}
              alt="إطلالتك المولّدة"
              className={cn(
                STAGE_IMAGE,
                'transition-[transform,opacity] duration-[250ms] ease-soft',
                // الخفوت يقول «هذي مو النتيجة الحالية» قبل ما تُقرأ أي كلمة
                stale && 'opacity-55',
              )}
              style={{ transform: `scale(${zoom})` }}
            />
            {/* تلميح السحب يسكن نفس الموضع، فما نعرض الاثنين معًا */}
            {stale && !dragging && (
              <p className="absolute top-5 rounded-full border border-line bg-canvas/95 px-4 py-1.5 text-[11.5px] text-muted backdrop-blur-sm">
                غيّرتِ القطع — الصورة من الاختيار السابق
              </p>
            )}
          </>
        ) : hasModel ? (
          <img
            src={modelImageUrl}
            alt={modelName ?? 'موديلك'}
            className={cn(STAGE_IMAGE, 'transition-transform duration-[250ms] ease-soft')}
            style={{ transform: `scale(${zoom})` }}
          />
        ) : (
          <div className="flex max-w-[320px] flex-col items-center gap-4 text-center">
            <UserRound size={28} strokeWidth={1.1} aria-hidden className="text-faint" />
            <p className="text-[14px]">ما اخترتِ موديلاً بعد.</p>
            <p className="text-[12px] leading-7 text-muted">
              اختاري موديلاً جاهزًا أو ارفعي صورتك، ونبدأ التجربة.
            </p>
            <Button size="sm" onClick={onChooseModel}>
              <Users size={13} strokeWidth={1.5} aria-hidden />
              اختاري الموديل
            </Button>
          </div>
        )}

        {/* تحكم الحجم */}
        {!busy && (hasModel || generatedLook) && (
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
                className="grid h-9 w-9 place-items-center text-muted transition-colors hover:bg-surface hover:text-ink"
              >
                <Icon size={14} strokeWidth={1.5} aria-hidden />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---------------- الفعل ---------------- */}
      <div className="flex flex-none flex-col gap-2 px-5 py-4">
        {generatedLook && !busy ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {/*
                الصورة القديمة: الفعل الأول هو تحديثها لا حفظها. والحفظ يبقى
                متاحًا — قرارها، بس ما يكون هو المقترح.
              */}
              {stale ? (
                <Button size="sm" onClick={onGenerate} disabled={itemCount === 0}>
                  <Sparkles size={13} strokeWidth={1.5} aria-hidden />
                  حدّثي الإطلالة
                </Button>
              ) : (
                <Button size="sm" onClick={onSaveLook}>
                  <Bookmark size={13} strokeWidth={1.5} aria-hidden />
                  حفظ الإطلالة
                </Button>
              )}

              <Button
                size="sm"
                variant="secondary"
                onClick={stale ? onSaveLook : onRegenerate}
              >
                {stale ? (
                  <Bookmark size={13} strokeWidth={1.5} aria-hidden />
                ) : (
                  <RefreshCw size={13} strokeWidth={1.5} aria-hidden />
                )}
                {stale ? 'حفظ الحالية' : 'إعادة التوليد'}
              </Button>

              <Button size="sm" variant="ghost" onClick={onStartOver}>
                <Undo2 size={13} strokeWidth={1.5} aria-hidden />
                البدء من جديد
              </Button>
            </div>
            <p className="text-[10.5px] leading-5 text-faint">
              {stale
                ? itemCount === 0
                  ? 'ما بقيت قطعة مختارة — اختاري قطعة وحدّثي.'
                  : `${itemCount} قطع مختارة · التحديث يولّد صورة جديدة.`
                : AI_DISCLAIMER}
            </p>
          </>
        ) : (
          <>
            <Button block onClick={onGenerate} disabled={!canGenerate}>
              <Sparkles size={14} strokeWidth={1.5} aria-hidden />
              جرّبي الإطلالة
            </Button>
            <p className="text-center text-[11px] leading-5 text-faint">
              {!hasModel
                ? 'اختاري موديلاً أول'
                : itemCount === 0
                  ? 'اختاري قطعة واحدة على الأقل من خزانتك'
                  : `${itemCount} قطع مختارة · ${AI_DISCLAIMER}`}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

/** مراحل معلنة — بلا نسبة مئوية مخترعة. */
function GenerationStages({ stage }: { stage?: TryOnStage }) {
  const index = STAGE_LABELS.findIndex((entry) => entry.id === stage)
  const reached = index < 0 ? 0 : index

  return (
    <div className="flex w-full max-w-[280px] flex-col items-center gap-5">
      <span className="grid h-11 w-11 place-items-center rounded-full border border-line bg-canvas">
        <Loader2 size={17} strokeWidth={1.5} aria-hidden className="animate-spin text-muted" />
      </span>

      <ul className="w-full">
        {STAGE_LABELS.map((entry, position) => (
          <li
            key={entry.id}
            className={cn(
              'py-1 text-center text-[12px] transition-colors',
              position <= reached ? 'text-ink' : 'text-faint',
            )}
          >
            {entry.label}
          </li>
        ))}
      </ul>

      <span className="h-px w-full overflow-hidden bg-line">
        <span
          className="block h-full bg-ink transition-all duration-500"
          style={{ width: `${((reached + 1) / STAGE_LABELS.length) * 100}%` }}
        />
      </span>
    </div>
  )
}
