/**
 * طقم الاستوديو خلف الموديل: منصّة دائرية بيضاء تحته وإضاءة فوقه.
 *
 * الأرضية رمادية (على حاوية اللوحة) والمنصّة بيضاء — التباين بينهما هو اللي
 * يرسم المكان. والأرضية **واحدة في الوضعين**، فتبديل لون الضوء ما يقفز بالمشهد.
 *
 * زخرفة خلفية بحتة — تقعد تحت الصورة (`-z-0`) فما تحجب الموديل ولا تلتقط
 * الفأرة، وما تدخل في شجرة الوصول (`aria-hidden`).
 *
 * **بلا لف**: الموديل والإطلالة المولّدة صورتان مسطّحتان بزاوية أمامية واحدة،
 * فتدوير المنصّة ما يكشف جانبًا آخر — يقلب الصورة لا غير. اللف يحتاج توليدًا
 * متعدّد الزوايا من المزوّد، وما هو موجود.
 */

/** لون الإضاءة اللي تختاره المستخدمة. */
export type LightTone = 'warm' | 'white'

/**
 * لكل لون شدّته وضبابيته.
 *
 * الأصفر يبان بشدّة منخفضة لأنه يختلف عن الأرضية في **درجة اللون**. أما الأبيض
 * فما يميّزه إلا الفتحة، فيحتاج شدّة ثلاثة أضعاف تقريبًا — وعندها تقسو حوافه،
 * فيحتاج ضبابية أوسع تردّه ضوءًا منتشرًا لا بقعة لها حافة.
 */
const TONES: Record<
  LightTone,
  {
    color: string
    beam: [number, number, number, number]
    glow: [number, number]
    pool: number
    blur: number
  }
> = {
  warm: {
    color: 'var(--color-lamp)',
    beam: [0.26, 0.15, 0.075, 0.02],
    glow: [0.95, 0.42],
    pool: 0.1,
    blur: 1.8,
  },
  white: {
    color: '#ffffff',
    beam: [1, 0.88, 0.66, 0.36],
    glow: [1, 0.92],
    pool: 0.8,
    blur: 3.6,
  },
}

/** نسب الطقم داخل اللوحة، بالمئة من عرضها وارتفاعها. */
const PLATFORM = { cx: 50, cy: 88, rx: 31, ry: 5.4 }
const LAMP = { cx: 50, y: 0, halfWidth: 5.2, height: 4 }

export function StudioSet({ tone = 'warm' }: { tone?: LightTone }) {
  const { cx, cy, rx, ry } = PLATFORM
  const lampBottom = LAMP.y + LAMP.height
  /** قاعدة المخروط تتجاوز المنصّة، فالضوء ينسكب حواليها لا عليها وحدها. */
  const beamHalf = rx * 1.45
  const light = TONES[tone]

  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 -z-0 h-full w-full"
    >
      <defs>
        {/* خفوت رأسي غير خطّي — يهبط بسرعة قرب المصدر ثم يتلاشى ببطء */}
        <linearGradient
          id="studio-beam"
          x1="0"
          y1={lampBottom}
          x2="0"
          y2={cy + 8}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor={light.color} stopOpacity={light.beam[0]} />
          <stop offset="0.25" stopColor={light.color} stopOpacity={light.beam[1]} />
          <stop offset="0.55" stopColor={light.color} stopOpacity={light.beam[2]} />
          <stop offset="0.82" stopColor={light.color} stopOpacity={light.beam[3]} />
          <stop offset="1" stopColor={light.color} stopOpacity="0" />
        </linearGradient>

        {/* ضبابية — بدونها تبقى حواف المضلّع مستقيمة فيُقرأ شكلاً هندسيًا */}
        <filter id="studio-soft" x="-30%" y="-20%" width="160%" height="150%">
          <feGaussianBlur stdDeviation={light.blur} />
        </filter>

        {/* قناع أفقي — يذيب حافتَي المخروط فما تُقرأ خطًّا مرسومًا */}
        <linearGradient
          id="studio-beam-sides"
          x1={cx - beamHalf}
          y1="0"
          x2={cx + beamHalf}
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.18" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.36" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.64" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="0.82" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="studio-beam-mask">
          <rect x="0" y="0" width="100" height="100" fill="url(#studio-beam-sides)" />
        </mask>

        <radialGradient id="studio-glow">
          <stop offset="0" stopColor={light.color} stopOpacity={light.glow[0]} />
          <stop offset="0.45" stopColor={light.color} stopOpacity={light.glow[1]} />
          <stop offset="1" stopColor={light.color} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="studio-pool">
          <stop offset="0" stopColor={light.color} stopOpacity={light.pool} />
          <stop offset="1" stopColor={light.color} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* مخروط الضوء — يتجاوز المنصّة نزولاً فما تنقطع قاعدته */}
      <polygon
        points={`${LAMP.cx - LAMP.halfWidth},${lampBottom}
                 ${LAMP.cx + LAMP.halfWidth},${lampBottom}
                 ${cx + beamHalf},${cy + 8} ${cx - beamHalf},${cy + 8}`}
        fill="url(#studio-beam)"
        mask="url(#studio-beam-mask)"
        filter="url(#studio-soft)"
      />

      {/* سماكة المنصّة — القرص اللي تحت، أغمق فيبان للقرص سُمك */}
      <ellipse
        cx={cx}
        cy={cy + 1.2}
        rx={rx}
        ry={ry}
        fill="var(--color-muted)"
        fillOpacity="0.42"
        stroke="var(--color-muted)"
        strokeOpacity="0.5"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      {/* سطح المنصّة — أبيض ناصع على الأرضية الرمادية */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill="var(--color-canvas)"
        stroke="var(--color-line-strong)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />

      {/* بركة الضوء على المنصّة */}
      <ellipse cx={cx} cy={cy} rx={rx * 0.9} ry={ry * 0.9} fill="url(#studio-pool)" />

      {/* عاكس المصباح — شبه منحرف مقلوب */}
      <polygon
        points={`${LAMP.cx - 2},${LAMP.y}
                 ${LAMP.cx + 2},${LAMP.y}
                 ${LAMP.cx + LAMP.halfWidth},${lampBottom}
                 ${LAMP.cx - LAMP.halfWidth},${lampBottom}`}
        fill="var(--color-surface-warm)"
        stroke="var(--color-muted)"
        strokeWidth="1"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* فوهة المصباح — هالة متوهّجة وحدها، بلا قرص صلب يُقرأ دائرة */}
      <ellipse
        cx={LAMP.cx}
        cy={lampBottom}
        rx={LAMP.halfWidth * 1.8}
        ry={LAMP.height * 0.9}
        fill="url(#studio-glow)"
        filter="url(#studio-soft)"
      />
    </svg>
  )
}
