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
 * وتعديل القطع بعد التوليد **ما يعيد التوليد تلقائيًا**: التوليد يكلّف وقتًا
 * ومالاً، فربطه بكل ضغطة يحرق الاثنين على تجربة ما طلبتها المستخدمة.
 *
 * وإشارة «الصورة من اختيار سابق» تعيش في **شريط الأفعال وحده**: الفعل الأول
 * يصير «حدّثي الإطلالة» بدل «حفظ». لا وسم فوق الصورة ولا خفوت لها — الصورة
 * هي المعروض، وتغطيتها بلافتة تحجب ما جاءت المستخدمة تشوفه.
 */
import { useRef, useState } from 'react'
import {
  Bookmark,
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
import { useVoice } from '@/features/onboarding/voice'
import { Button, Segmented } from '@/shared/components/ui'
import { AIProcessingState } from '@/shared/components/render'
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
/**
 * تصحيح إطار صور الموديلات الجاهزة.
 *
 * الملفّان مقصوصان بشكل مختلف: جسم البنت يملأ ٨٢٪ من ارتفاع صورتها وتحته فراغ
 * ٨٫٤٪، وجسم الولد يملأ ٩٣٪ وتحته ٣٫٦٪ فقط. فمع `object-contain` واحد يطلع
 * الولد أكبر وأوطى منها.
 *
 * `scale` يصغّره لإحساس حجمها، و`y` يعيد رجوله على خطّ المنصّة بعد التصغير —
 * لأن التصغير حول المركز يرفع القدمين.
 *
 * التصحيح على الأصل لا على العرض: لو انصلحت الصور نفسها يُشال السطر.
 */
/**
 * حدود التكبير — مكان واحد يخدم الأزرار والقرص.
 *
 * الأدنى ١ لا أقل: المقاس الأصلي هو الصورة كاملة داخل اللوحة، والتصغير تحته
 * ما يكشف شيئًا جديدًا — يترك فراغًا حول المشهد ليس إلا.
 */
const ZOOM_MIN = 1
const ZOOM_MAX = 2.5

const FRAME_FIT: Record<string, { scale: number; y: number }> = {
  '/models/male-base.png': { scale: 0.88, y: 0.9 },
}

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
  /**
   * إزاحة المشهد داخل اللوحة.
   *
   * محدودة بما كشفه التقريب على كل محور: عند ١× ما فيه شيء مخفي فما فيه
   * تنقّل، وكل ما قرّبتِ اتّسع المدى بقدر ما فاض عن الإطار. فما تنسحب الصورة
   * خارج اللوحة ويبقى فراغ.
   */
  const [pan, setPan] = useState({ x: 0, y: 0 })
  /** أثناء اللمس نلغي الانتقال — التنعيم يخلّي الصورة تتأخّر خلف الإصبع. */
  const [interacting, setInteracting] = useState(false)

  /**
   * القرص بإصبعين.
   *
   * نتتبّع المؤشّرات النشطة: إصبعان يعطيان مسافة، ونسبة تغيّرها هي نسبة
   * التكبير. المراجع لا الحالة — الحركة تصل عشرات المرات في الثانية.
   */
  const stageRef = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ distance: number; zoom: number } | null>(null)

  /** السحب بإصبع واحد — يحرّك المشهد في كل الاتجاهات. */
  const grab = useRef<{ x: number; y: number; from: { x: number; y: number } } | null>(null)

  const clampZoom = (value: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value))

  /** أقصى إزاحة على محور: نصف ما فاض عن اللوحة بعد التقريب — وصفر عند ١×. */
  const clampPan = (value: { x: number; y: number }, scale: number) => {
    const box = stageRef.current
    const limitX = Math.max(0, ((box?.clientWidth ?? 0) * (scale - 1)) / 2)
    const limitY = Math.max(0, ((box?.clientHeight ?? 0) * (scale - 1)) / 2)
    return {
      x: Math.min(limitX, Math.max(-limitX, value.x)),
      y: Math.min(limitY, Math.max(-limitY, value.y)),
    }
  }

  /** تغيير التقريب يعيد ضبط الإزاحة معه، وإلا بقيت خارج الحدّ بعد الإبعاد. */
  const applyZoom = (next: number) => {
    const scale = clampZoom(next)
    setZoom(scale)
    setPan((current) => clampPan(current, scale))
  }

  const onStagePointerDown = (event: React.PointerEvent) => {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    setInteracting(true)

    if (pointers.current.size === 1) {
      grab.current = { x: event.clientX, y: event.clientY, from: pan }
      return
    }
    if (pointers.current.size === 2) {
      // الإصبع الثاني ينقل الحركة من سحب إلى قرص
      grab.current = null
      const [a, b] = [...pointers.current.values()]
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom }
    }
  }

  const onStagePointerMove = (event: React.PointerEvent) => {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    const held = grab.current
    if (pointers.current.size === 1 && held) {
      setPan(
        clampPan(
          {
            x: held.from.x + (event.clientX - held.x),
            y: held.from.y + (event.clientY - held.y),
          },
          zoom,
        ),
      )
      return
    }

    const start = pinch.current
    if (pointers.current.size !== 2 || !start || start.distance === 0) return
    const [a, b] = [...pointers.current.values()]
    applyZoom((start.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / start.distance)
  }

  const onStagePointerUp = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 0) {
      grab.current = null
      setInteracting(false)
    }
  }

  /**
   * تبدأ **بلا إضاءة**: المشهد النظيف هو الأصل، والأبجورة زينة تُطلب لا تُفرَض.
   * والضوء الملوّن يغيّر إحساس لون القطعة، فالبداية المحايدة أصدق لتقييمها.
   */
  const say = useVoice()
  const [tone, setTone] = useState<LightTone>('none')


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
        ref={stageRef}
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
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerUp}
        onPointerLeave={onStagePointerUp}
        className={cn(
          // touch-none يمنع المتصفّح من ابتلاع القرص لتكبير الصفحة نفسها
          'relative mx-5 grid min-h-0 flex-1 cursor-grab touch-none place-items-center overflow-hidden rounded-md active:cursor-grabbing',
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
        {/*
          طبقة المشهد — تتكبّر كصورة واحدة: المنصّة والإضاءة والموديل معًا، لا
          الموديل وحده. الأرضية تبقى برّاها فما تتمدّد حدودها مع التكبير.
        */}
        {(hasModel || generatedLook) && (
          <div
            className={cn(
              'absolute inset-0',
              // الطبقة تحمل لون الأرضية بنفسها: الـ transform يصنع سياق تراص
              // جديد، و mix-blend-multiply يمزج داخل سياقه فقط — فبلا هذي
              // الخلفية تطلع خلفية صورة الموديل البيضاء مستطيلاً ظاهرًا.
              tone === 'white' ? 'bg-studio-floor-dim' : 'bg-studio-floor',
              // بلا انتقال أثناء القرص — التنعيم يخلّي الإصبع يسبق الصورة
              !interacting && 'transition-transform duration-[250ms] ease-soft',
            )}
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            <StudioSet tone={tone} />

            {generatedLook ? (
              <img
                src={generatedLook}
                alt="إطلالتك المولّدة"
                className={STAGE_IMAGE}
              />
            ) : (
              <img
                src={modelImageUrl}
                alt={modelName ?? 'موديلك'}
                className={STAGE_IMAGE}
                style={{
                  transform: (() => {
                    const fit = FRAME_FIT[modelImageUrl ?? ''] ?? { scale: 1, y: 0 }
                    return `scale(${fit.scale}) translateY(${fit.y}%)`
                  })(),
                }}
              />
            )}
          </div>
        )}

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

        {busy && <AIProcessingState stage={stage} stages={STAGE_LABELS} />}

        {!busy && !hasModel && !generatedLook && (
          <div className="flex max-w-[320px] flex-col items-center gap-4 text-center">
            <UserRound size={28} strokeWidth={1.1} aria-hidden className="text-faint" />
            <p className="text-[14px]">{say('ما اخترتِ موديلاً بعد.', 'ما اخترت موديلاً بعد.')}</p>
            <p className="text-[12px] leading-7 text-muted">
              {say(
                'اختاري موديلاً جاهزًا أو ارفعي صورتك، ونبدأ التجربة.',
                'اختر موديلاً جاهزًا أو ارفع صورتك، ونبدأ التجربة.',
              )}
            </p>
            <Button size="sm" onClick={onChooseModel}>
              <Users size={13} strokeWidth={1.5} aria-hidden />
              {say('اختاري الموديل', 'اختر الموديل')}
            </Button>
          </div>
        )}

        {/* تحكم الحجم */}
        {!busy && (hasModel || generatedLook) && (
          <div className="absolute bottom-4 left-4 flex flex-col overflow-hidden rounded-md border border-line bg-canvas/90 backdrop-blur-sm">
            {(
              [
                [Plus, 'تكبير', () => applyZoom(zoom + 0.15)],
                [Minus, 'تصغير', () => applyZoom(zoom - 0.15)],
                [
                  RotateCcw,
                  'إعادة الضبط',
                  () => {
                    setZoom(1)
                    setPan({ x: 0, y: 0 })
                  },
                ],
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
                <Button
                  size="sm"
                  onClick={onGenerate}
                  disabled={itemCount === 0}
                  pending={busy}
                  pendingLabel="نجهّز إطلالتك…"
                >
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
                  ? say('ما بقيت قطعة مختارة — اختاري قطعة وحدّثي.', 'ما بقيت قطعة مختارة — اختر قطعة وحدّث.')
                  : `${itemCount} قطع مختارة · التحديث يولّد صورة جديدة.`
                : AI_DISCLAIMER}
            </p>
          </>
        ) : (
          <>
            <Button
              block
              onClick={onGenerate}
              disabled={!hasModel || itemCount === 0}
              pending={busy}
              pendingLabel="نجهّز إطلالتك…"
            >
              <Sparkles size={14} strokeWidth={1.5} aria-hidden />
              {say('جرّبي الإطلالة', 'جرّب الإطلالة')}
            </Button>
            <p className="text-center text-[11px] leading-5 text-faint">
              {!hasModel
                ? say('اختاري موديلاً أول', 'اختر موديلاً أول')
                : itemCount === 0
                  ? say('اختاري قطعة واحدة على الأقل من خزانتك', 'اختر قطعة واحدة على الأقل من خزانتك')
                  : `${itemCount} قطع مختارة · ${AI_DISCLAIMER}`}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

