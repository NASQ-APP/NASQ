/**
 * دولاب تنفتح أبوابه فيبان النموذج جوّاه.
 *
 * البنية ثلاث طبقات: هيكل خارجي (الإطار) ← جوف أبيض ← رفوف. والبابان معلّقان
 * على حافتَي الهيكل، يبدآن مقفولين يغطّيان الفتحة ثم يدوران حول مفصلتيهما
 * (`rotateY` مع `perspective`) لين يستقرّان مفتوحين — الزاوية أكبر من ٩٠ فيقف
 * الباب خارج الفتحة لا فوقها، مثل الدولاب الحقيقي.
 *
 * لو المستخدمة مفعّلة «تقليل الحركة» يظهران مفتوحين من البداية بلا دوران.
 *
 * الألوان كلها من متغيّرات النظام — الدولاب يمشي مع الثيم لو تغيّر.
 */
import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/** زاوية استقرار الباب مفتوحًا — أكبر من ٩٠ فيستقرّ خارج الفتحة لا فوقها. */
const OPEN = 112

/** وجه الباب: لوح بحشوة، سماكة على الحافة الحرّة، ومقبض. */
function DoorFace({ hinge }: { hinge: 'right' | 'left' }) {
  /** الحافة الحرّة عكس المفصلة — عندها السماكة والمقبض. */
  const free = hinge === 'right' ? 'left' : 'right'

  return (
    <span
      className="relative block h-full w-full border border-muted bg-surface-warm"
      style={{
        borderRadius: hinge === 'right' ? '2px 0 0 2px' : '0 2px 2px 0',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* حشوة اللوح */}
      <span className="absolute inset-2 block border border-line-strong" />

      {/* سماكة الباب على حافته الحرّة */}
      <span className="absolute inset-y-0 w-[2px] bg-line-strong" style={{ [free]: 0 }} />

      {/*
        المقبض على وجهَي الباب: الأمامي يبان وهو مقفول، والخلفي يبان بعد ما
        ينفتح — لأن الزاوية تتجاوز التسعين فنشوف ظهر اللوح. مقبض واحد يختفي
        في إحدى الحالتين.
      */}
      {[9, -9].map((z) => (
        <span
          key={z}
          className="absolute top-1/2 h-12 w-[4px] rounded-full bg-ink-soft"
          style={{ [free]: 9, transform: `translateY(-50%) translateZ(${z}px)` }}
        />
      ))}
    </span>
  )
}

/** رفّ بسماكة. */
function Shelf() {
  return (
    <span aria-hidden className="mt-3 block">
      <span className="block h-px bg-muted" />
      <span className="block h-[3px] bg-surface-warm" />
    </span>
  )
}

/** رفّ واحد: اسم الحقل يمين واسم الرفّ يسار، والخانة بينهما. */
export function Compartment({
  label,
  shelfLabel,
  error,
  children,
  last = false,
}: {
  label: string
  shelfLabel: string
  error?: string
  children: ReactNode
  last?: boolean
}) {
  return (
    <label className="block pt-6">
      <span className="flex items-baseline justify-between">
        <span className="text-[11px] text-faint">{shelfLabel}</span>
        <span className="text-[12px] text-ink">{label}</span>
      </span>
      <span className="mt-1.5 block">{children}</span>
      {error ? <span className="mt-1 block text-[11.5px] text-danger">{error}</span> : null}
      {last ? null : <Shelf />}
    </label>
  )
}

/** أنماط الحقل جوّا الدولاب: بلا حدّ ولا أرضية — الرفّ هو اللي يحمله. */
export const shelfField = 'h-9! rounded-none! border-0! bg-transparent! px-0!'

/** الدولاب — هيكل وجوف وبابان ينفتحان. */
export function WardrobeFrame({ children }: { children: ReactNode }) {
  const still = useReducedMotion()

  /** الباب: مفصلته على حافته الخارجية، فينفتح للبرّا. */
  const door = (hinge: 'right' | 'left', delay: number) => (
    <motion.span
      aria-hidden
      className="absolute inset-y-0 w-1/2"
      style={{ [hinge]: 0, transformOrigin: hinge, transformStyle: 'preserve-3d' }}
      initial={still ? false : { rotateY: 0 }}
      animate={{ rotateY: hinge === 'right' ? -OPEN : OPEN }}
      transition={{ duration: 1.25, ease: [0.16, 0.84, 0.3, 1], delay }}
    >
      <DoorFace hinge={hinge} />
    </motion.span>
  )

  return (
    <div className="relative px-14" style={{ perspective: 1400, perspectiveOrigin: '50% 42%' }}>
      {/* الهيكل — الإطار اللي تتعلّق عليه الأبواب */}
      <div className="rounded-[3px] border border-muted bg-surface p-2">
        {/* الجوف */}
        <motion.div
          className="border border-line-strong bg-canvas px-5 pb-6"
          initial={still ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut', delay: 0.72 }}
        >
          {children}
        </motion.div>
      </div>

      {/* البابان فوق الهيكل — يغطّيان الفتحة مقفولين ثم ينفتحان */}
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-14 right-14">
        {door('right', 0.3)}
        {door('left', 0.42)}
      </span>
    </div>
  )
}
