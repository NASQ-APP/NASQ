import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { useReducedMotion } from '@/shared/hooks/useReducedMotion'
import { ROUTES } from '@/shared/config'
import type { WardrobeItem } from '@/domain/wardrobe'

/**
 * جوف الخزانة — القطع معلّقة بعلاقات على قضبان تمشي ببطء.
 *
 * القضيب يمشي وحده بعد ثانية من فتح الصفحة، **وأول لمسة أو سحبة توقفه
 * نهائيًا** — ما يرجع يمشي إلا لو خرجت المستخدمة من الصفحة ورجعت أو حدّثتها.
 * والسحب اليدوي يمينًا ويسارًا يبقى شغّالاً بعد الوقوف.
 *
 * وكل ما كثرت القطع نزل قضيب جديد تحته بدل ما يطول قضيب واحد بلا نهاية،
 * والقضبان تتبادل الاتجاه — واحد يمين واللي تحته يسار.
 *
 * التكرار مرّتين ضروري للدوران السلس: نلفّ الموضع لمنتصف المسار فتبان الحركة
 * متّصلة بلا قفزة. ومع «تقليل الحركة» ما فيه مشي أصلاً — سحب يدوي فقط.
 */

/** أقصى عدد قطع على القضيب الواحد قبل ما ينزل قضيب جديد. */
const PER_RAIL = 8

/**
 * بكسل في **الثانية** لا في الإطار — بطيء عمدًا، الحركة إيحاء لا عرض.
 *
 * الربط بالزمن لا بعدد الإطارات: الشاشة ١٢٠ هرتز تمشي بضعف سرعة الستّين لو
 * ربطناها بالإطار، والتبويب المخنوق يزحف. بالزمن تبقى السرعة واحدة عند الجميع.
 */
const SPEED = 22

/** مهلة قبل أول حركة — ثانية تسكن فيها الصفحة قبل ما يبدأ المشي. */
const START_DELAY = 1000

/** مسافة السحب اللي بعدها نعتبرها سحبًا لا نقرة. */
const DRAG_SLOP = 5

/**
 * أقل مسافة يتحرّكها المؤشّر فوق القضيب لتُحسب لمسة مقصودة.
 *
 * مجرّد وجود المؤشّر مكان القضيب وقت فتح الصفحة ما يكفي: `pointerenter` ينطلق
 * لحظة ما يُرسم العنصر تحته، فيقف القضيب قبل ما يمشي ولا مرّة. نشترط حركة.
 */
const TOUCH_SLOP = 3

/** علاقة: خطّاف وكتف مثلّث تتدلّى منه القطعة. */
function Hanger() {
  return (
    <svg viewBox="0 0 26 13" fill="none" aria-hidden className="h-[16px] w-[32px] flex-none">
      <path
        d="M13 1v3M13 4 4 12.4h18L13 4Z"
        stroke="var(--color-muted)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function Rail({ items, reverse = false }: { items: WardrobeItem[]; reverse?: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const stillMotion = useReducedMotion()

  /**
   * أول لمسة أو سحبة توقف المشي **نهائيًا**.
   *
   * علم يُرفع مرة ولا ينزل: الحلقة تنتهي عنده ولا تُطلب إطارًا جديدًا. ولأن
   * المرجع يُبنى مع المكوّن، الخروج من الصفحة والرجوع (أو التحديث) يعيده
   * صفرًا فيمشي من جديد — وهذا هو الشرط الوحيد لرجوعه.
   *
   * السحب اليدوي يبقى شغّالاً بعد الوقوف؛ اللي يقف هو المشي التلقائي وحده.
   */
  const stopped = useRef(false)
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: 0 })

  /** آخر موضع للمؤشّر — لقياس حركة فعلية لا مجرّد وجود. */
  const last = useRef<{ x: number; y: number } | null>(null)

  /**
   * الموضع كعدد عشري: `scrollLeft` يقرّب لعدد صحيح، فسرعة أقل من بكسل للإطار
   * تنبلع كل مرة ولا يتحرك القضيب أبدًا. نراكم هنا ونطبّق.
   */
  const pos = useRef(0)

  // نبدأ من منتصف المسار، فيبقى للمشي يمينًا مكان من أول لحظة
  useEffect(() => {
    const track = trackRef.current
    if (!track || items.length === 0) return
    pos.current = track.scrollWidth / 2
    track.scrollLeft = pos.current
  }, [items])

  // حلقة دائمة: تبدأ بعد المهلة وما تتوقّف — الأعلام وحدها تقرّر المشي
  useEffect(() => {
    if (stillMotion) return
    const track = trackRef.current
    if (!track) return

    let frame = 0
    let previous = 0
    const step = (now: number) => {
      // ما نطلب إطارًا جديدًا بعد الوقوف — الحلقة تنتهي ولا تستهلك شيئًا
      if (stopped.current) return
      // أول إطار ما له سابق نقيس عليه، ونحدّ الفجوة فما تقفز بعد خمول التبويب
      const elapsed = previous ? Math.min((now - previous) / 1000, 0.05) : 0
      previous = now

      const half = track.scrollWidth / 2
      if (half > 0) {
        // إنقاص الموضع يزحف بالقطع يمينًا وزيادته يسارًا، واللفّ عند الطرفين
        // يخفي الحدّ لأن القائمة مكرّرة مرّتين
        pos.current += (reverse ? 1 : -1) * SPEED * elapsed
        if (pos.current <= 0) pos.current += half
        else if (pos.current >= half) pos.current -= half
        track.scrollLeft = pos.current
      }
      frame = requestAnimationFrame(step)
    }

    const timer = window.setTimeout(() => {
      frame = requestAnimationFrame(step)
    }, START_DELAY)

    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(frame)
    }
  }, [reverse, stillMotion])

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    if (!track) return
    stopped.current = true
    drag.current = { active: true, startX: event.clientX, startLeft: track.scrollLeft, moved: 0 }
    track.setPointerCapture(event.pointerId)
  }, [])

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    if (!track) return

    // حركة مقصودة فوق القضيب توقف المشي؛ الوجود وحده لا
    const previous = last.current
    last.current = { x: event.clientX, y: event.clientY }
    if (previous) {
      const moved = Math.hypot(event.clientX - previous.x, event.clientY - previous.y)
      if (moved > TOUCH_SLOP) stopped.current = true
    }

    if (!drag.current.active) return
    const dx = event.clientX - drag.current.startX
    drag.current.moved = Math.max(drag.current.moved, Math.abs(dx))
    track.scrollLeft = drag.current.startLeft - dx
    pos.current = track.scrollLeft
  }, [])

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    if (track?.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId)
    if (track) pos.current = track.scrollLeft
    drag.current.active = false
  }, [])

  // النقرة بعد سحب ما تفتح القطعة — وإلا كل سحبة صارت تنقّلًا
  const onClickCapture = useCallback((event: React.MouseEvent) => {
    if (drag.current.moved > DRAG_SLOP) {
      event.preventDefault()
      event.stopPropagation()
    }
  }, [])

  return (
    <div className="relative">
      {/* القضيب — ثابت فوق المسار، ما يمشي معه */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[7px] z-10 block h-px bg-muted"
      />

      <div
        ref={trackRef}
        // ltr يخلي scrollLeft يتصرّف باتّجاه واحد، فالحساب ما يختلف بين المتصفّحات
        dir="ltr"
        className="flex touch-pan-y select-none gap-6 overflow-x-auto overflow-y-hidden pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        // صور القطع وروابطها قابلة للسحب أصلاً في المتصفّح، وسحبها الأصلي يبتلع
        // أحداث المؤشّر فيتجمّد سحب القضيب. نمنعه فيبقى السحب لنا.
        onDragStart={(event) => event.preventDefault()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
      >
        {/* مرّتان: تكرار القائمة هو اللي يخلي اللفّ غير مرئي */}
        {[0, 1].map((pass) =>
          items.map((item) => (
            <Link
              key={`${pass}-${item.id}`}
              to={ROUTES.item(item.id)}
              draggable={false}
              aria-hidden={pass === 1}
              tabIndex={pass === 1 ? -1 : undefined}
              className="group/item flex w-[136px] flex-none flex-col items-center sm:w-[168px]"
            >
              <Hanger />
              <span className="-mt-1 flex h-[188px] w-full items-start justify-center sm:h-[232px]">
                <ItemImage
                  item={item}
                  className="max-h-full max-w-full transition-transform duration-[320ms] ease-soft group-hover/item:-translate-y-0.5"
                />
              </span>
              <span className="w-full truncate text-center text-[11px] text-muted">{item.name}</span>
            </Link>
          )),
        )}
      </div>
    </div>
  )
}

export function WardrobeRails({ items }: { items: WardrobeItem[] }) {
  // قضيب لكل ستّ قطع — يزيد قضيب تحت كل ما كثرت
  const rails = useMemo(() => {
    const chunks: WardrobeItem[][] = []
    for (let index = 0; index < items.length; index += PER_RAIL) {
      chunks.push(items.slice(index, index + PER_RAIL))
    }
    return chunks
  }, [items])

  return (
    <div>
      {rails.map((rail, index) => (
        <div key={index} className={index > 0 ? 'pt-7' : ''}>
          {/* القضبان تتبادل الاتجاه — واحد يمين واللي تحته يسار */}
          <Rail items={rail} reverse={index % 2 === 1} />
        </div>
      ))}
    </div>
  )
}
