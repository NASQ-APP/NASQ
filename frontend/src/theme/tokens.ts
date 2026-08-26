/**
 * توكنز التصميم — المصدر الوحيد لقيم الهوية البصرية.
 *
 * الاتجاه: editorial fashion-tech · مينمال أحادي اللون · فاخر وواسع.
 * بدون تدرّجات لونية، وبدون ظلال كثيفة، وبدون إيموجي.
 *
 * ملاحظة مهمة: هذي القيم مرآة لما هو معرّف في `theme.css` داخل كتلة `@theme`.
 * الـCSS هو اللي يولّد كلاسات Tailwind (bg-ink، text-muted…)، وهذا الملف هو
 * اللي تقرأ منه الشيفرة التي ترسم بالـSVG وتحتاج القيمة الخام.
 * أي تغيير لون → غيّريه في الملفين معًا.
 */

/** لوحة محايدة بالكامل — الملابس هي مصدر اللون في الواجهة، مو الواجهة نفسها. */
export const palette = {
  /** الأسود النقي: النص الأساسي والحالات النشطة */
  ink: '#0A0A0A',
  /** الأسود الناعم: الأزرار الأساسية والعناصر البارزة */
  inkSoft: '#171717',
  /** الشروح والنص الثانوي */
  muted: '#777777',
  /** التسميات الخافتة والـplaceholder */
  faint: '#A3A3A3',
  /** الحدود والفواصل */
  line: '#E7E7E4',
  lineStrong: '#DCDCD9',
  /** خلفية الصفحة */
  canvas: '#FFFFFF',
  /** خلفية البطاقات والعناصر الثانوية */
  surface: '#F8F8F6',
  /** السطح الدافئ */
  surfaceWarm: '#F4F3F0',
  /** لوحة عرض الموديل */
  stage: '#F7F7F5',
  /** الحذف والأخطاء — اللون الوحيد في النظام */
  danger: '#8A1F1F',
} as const

export const typography = {
  /** النصوص والواجهة */
  sans: "'IBM Plex Sans Arabic', 'Alexandria', ui-sans-serif, system-ui, sans-serif",
  /** العناوين — وزن ٣٠٠، تتبع -0.01em، ارتفاع سطر 1.35 */
  heading: "'Alexandria', 'IBM Plex Sans Arabic', ui-sans-serif, system-ui, sans-serif",
  /** أي نص لاتيني داخل الواجهة */
  latin: "'Inter', ui-sans-serif, system-ui, sans-serif",
} as const

export const radii = {
  sm: '4px',
  /** الاستدارة القياسية: 0.5rem */
  md: '8px',
  lg: '12px',
  pill: '999px',
} as const

export const motion = {
  /** المنحنى الوحيد المعتمد في التطبيق */
  ease: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
  easeArray: [0.22, 0.61, 0.36, 1] as const,
  /** الانتقال القياسي: ٣٢٠ مللي ثانية */
  base: 0.32,
  fast: 0.18,
  slow: 0.4,
} as const

/** طبقات العمق — مكان واحد يمنع تصادم الـz-index بين المكوّنات. */
export const layers = {
  header: 30,
  scrim: 40,
  overlay: 50,
  toast: 80,
} as const

/** أبعاد القشرة. */
export const shell = {
  sidebarWidth: 240,
  sidebarCollapsedWidth: 68,
  topBarHeight: 64,
} as const

/**
 * خلفية المشاهد المولّدة. البرومبت والرسم يتبعان نظام التصميم نفسه
 * عشان الصورة تندمج مع الواجهة بدل ما تصادمها.
 */
export const renderTheme = {
  background: palette.stage,
  outline: 'rgba(0,0,0,0.13)',
  softOutline: 'rgba(0,0,0,0.06)',
  shadow: 'rgba(0,0,0,0.045)',
} as const

export const theme = { palette, typography, radii, motion, layers, shell, renderTheme } as const
export type Theme = typeof theme
