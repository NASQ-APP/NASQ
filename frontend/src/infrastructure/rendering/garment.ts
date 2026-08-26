/**
 * رسم القطع كـflat-lay متجهي.
 *
 * الخط الحقيقي يمرّر صور المستخدمة على إزالة خلفية ويخزّن PNG نظيفًا. هذي
 * النسخة بلا خادم، فالقطع تُرسم حتميًا: نظيفة، متمركزة، خلفية فاضية، ولون
 * القطعة الحقيقي — نفس العقد اللي لازم تحققه الصورة المنقّاة.
 * استبدال `garmentImageUrl` برابط الأصل المنقّى ما يغيّر شيئًا آخر في التطبيق.
 */
import { renderTheme } from '@/theme'
import type { GarmentShape } from '@/domain/wardrobe/types'

export type { GarmentShape }

type Ctx = { c: string; line: string; shade: string }

const seam = renderTheme.outline
const soft = renderTheme.softOutline

/* ---------- مكتبة الصور الظلية (viewBox 0 0 400 480) ---------- */

const torso = (hem: number, neck: 'crew' | 'v' | 'collar' | 'open') => {
  const neckPath =
    neck === 'v'
      ? 'L232,86 L200,124 L168,86'
      : neck === 'collar'
        ? 'L234,84 L200,116 L166,84'
        : 'Q200,116 168,84'
  return `M168,84 ${neckPath} L140,80 L64,126 L92,172 L128,142 L128,${hem} H272 V142 L308,172 L336,126 L260,80 Z`
}

const SHAPES: Record<GarmentShape, (x: Ctx) => string> = {
  tee: ({ c }) => `<path d="${torso(368, 'crew')}" fill="${c}" stroke="${seam}"/>`,

  shirt: ({ c }) => `
    <path d="${torso(392, 'collar')}" fill="${c}" stroke="${seam}"/>
    <path d="M200,116 V392" stroke="${seam}" fill="none"/>
    <path d="M166,84 L200,116 L234,84 L214,76 L200,96 L186,76 Z" fill="${soft}" stroke="${seam}"/>
    <circle cx="200" cy="200" r="3.5" fill="${seam}"/><circle cx="200" cy="268" r="3.5" fill="${seam}"/>
    <circle cx="200" cy="336" r="3.5" fill="${seam}"/>`,

  blouse: ({ c }) => `
    <path d="M168,84 Q200,118 232,84 L262,78 L340,124 L310,174 L274,144 Q286,300 296,398 H104 Q114,300 126,144 L90,174 L60,124 L138,78 Z"
      fill="${c}" stroke="${seam}"/>`,

  polo: ({ c }) => `
    <path d="${torso(372, 'collar')}" fill="${c}" stroke="${seam}"/>
    <path d="M200,116 V186" stroke="${seam}" fill="none"/>
    <path d="M170,84 L200,114 L230,84" fill="${soft}" stroke="${seam}"/>`,

  sweater: ({ c }) => `
    <path d="M164,86 Q200,120 236,86 L266,80 L344,130 L312,180 L282,154 L282,376 H118 V154 L88,180 L56,130 L134,80 Z"
      fill="${c}" stroke="${seam}"/>
    <path d="M118,354 H282" stroke="${seam}" fill="none"/>
    <path d="M92,166 L114,186 M308,166 L286,186" stroke="${seam}" fill="none"/>`,

  hoodie: ({ c }) => `
    <path d="M164,86 Q200,120 236,86 L266,80 L344,130 L312,180 L282,154 L282,382 H118 V154 L88,180 L56,130 L134,80 Z"
      fill="${c}" stroke="${seam}"/>
    <path d="M150,78 Q200,44 250,78 Q226,118 200,118 Q174,118 150,78 Z" fill="${c}" stroke="${seam}"/>
    <path d="M150,262 h100 v52 h-100 z" fill="${soft}" stroke="${seam}"/>
    <path d="M186,110 v26 M214,110 v26" stroke="${seam}" fill="none"/>`,

  jacket: ({ c }) => `
    <path d="M180,80 L140,74 L60,124 L92,176 L126,146 L120,392 H196 L206,150 Z" fill="${c}" stroke="${seam}"/>
    <path d="M220,80 L260,74 L340,124 L308,176 L274,146 L280,392 H204 L194,150 Z" fill="${c}" stroke="${seam}"/>
    <path d="M180,80 L200,146 L220,80 L204,72 L200,96 L196,72 Z" fill="${soft}" stroke="${seam}"/>`,

  blazer: ({ c }) => `
    <path d="M182,78 L138,72 L58,124 L90,178 L124,148 L118,398 H198 L208,152 Z" fill="${c}" stroke="${seam}"/>
    <path d="M218,78 L262,72 L342,124 L310,178 L276,148 L282,398 H202 L192,152 Z" fill="${c}" stroke="${seam}"/>
    <path d="M182,78 L200,152 L166,140 Z" fill="${soft}" stroke="${seam}"/>
    <path d="M218,78 L200,152 L234,140 Z" fill="${soft}" stroke="${seam}"/>
    <circle cx="200" cy="252" r="4" fill="${seam}"/>`,

  coat: ({ c }) => `
    <path d="M180,78 L138,72 L58,126 L90,180 L124,150 L116,442 H196 L206,154 Z" fill="${c}" stroke="${seam}"/>
    <path d="M220,78 L262,72 L342,126 L310,180 L276,150 L284,442 H204 L194,154 Z" fill="${c}" stroke="${seam}"/>
    <path d="M180,78 L200,154 L164,138 Z" fill="${soft}" stroke="${seam}"/>
    <path d="M220,78 L200,154 L236,138 Z" fill="${soft}" stroke="${seam}"/>
    <path d="M132,286 h44 M268,286 h-44" stroke="${seam}" fill="none"/>`,

  abaya: ({ c }) => `
    <path d="M178,74 L140,68 L70,118 L96,300 L128,292 L120,458 H196 L204,150 Z" fill="${c}" stroke="${seam}"/>
    <path d="M222,74 L260,68 L330,118 L304,300 L272,292 L280,458 H204 L196,150 Z" fill="${c}" stroke="${seam}"/>
    <path d="M178,74 Q200,96 222,74" fill="none" stroke="${seam}"/>`,

  thobe: ({ c }) => `
    <path d="M166,78 Q200,104 234,78 L262,72 L332,120 L306,176 L280,150 L288,458 H112 L120,150 L94,176 L68,120 L138,72 Z"
      fill="${c}" stroke="${seam}"/>
    <path d="M200,104 V196" stroke="${seam}" fill="none"/>
    <path d="M170,78 L200,104 L230,78" fill="${soft}" stroke="${seam}"/>`,

  dress: ({ c }) => `
    <path d="M168,84 Q200,116 232,84 L260,78 L336,126 L306,176 L274,146 Q272,214 268,246 L318,452 H82 L132,246 Q128,214 126,146 L94,176 L64,126 L140,78 Z"
      fill="${c}" stroke="${seam}"/>
    <path d="M132,246 Q200,266 268,246" fill="none" stroke="${soft}"/>`,

  skirt: ({ c }) => `
    <path d="M132,110 H268 L316,404 H84 Z" fill="${c}" stroke="${seam}"/>
    <path d="M132,142 H268" stroke="${seam}" fill="none"/>`,

  pants: ({ c }) => `
    <path d="M128,104 H272 L286,446 H214 L200,240 L186,446 H114 Z" fill="${c}" stroke="${seam}"/>
    <path d="M128,136 H272" stroke="${seam}" fill="none"/>
    <path d="M200,136 V240" stroke="${soft}" fill="none"/>`,

  jeans: ({ c }) => `
    <path d="M126,104 H274 L288,452 H212 L200,244 L188,452 H112 Z" fill="${c}" stroke="${seam}"/>
    <path d="M126,142 H274" stroke="${seam}" fill="none"/>
    <path d="M148,150 q22,20 26,44 M252,150 q-22,20 -26,44" fill="none" stroke="${soft}"/>
    <path d="M200,142 V244" stroke="${soft}" fill="none"/>`,

  shorts: ({ c }) => `
    <path d="M128,104 H272 L282,290 H214 L200,204 L186,290 H118 Z" fill="${c}" stroke="${seam}"/>
    <path d="M128,136 H272" stroke="${seam}" fill="none"/>`,

  sneakers: ({ c }) => `
    <path d="M64,236 h72 q16,0 24,16 l30,44 q10,18 -12,18 H64 q-10,0 -10,-12 Z" fill="${c}" stroke="${seam}"/>
    <path d="M54,290 h124" stroke="${seam}" fill="none"/>
    <path d="M236,236 h72 q10,0 10,12 v54 q0,12 -12,12 h-84 q-22,0 -12,-18 l30,-44 q6,-16 -4,-16 Z" fill="${c}" stroke="${seam}"/>
    <path d="M222,290 h124" stroke="${seam}" fill="none"/>`,

  flats: ({ c }) => `
    <path d="M62,250 q60,-14 96,26 q14,16 -8,20 H74 q-16,0 -16,-18 Z" fill="${c}" stroke="${seam}"/>
    <path d="M242,250 q60,-14 96,26 q14,16 -8,20 h-84 q-16,0 -16,-18 Z" fill="${c}" stroke="${seam}"/>`,

  heels: ({ c }) => `
    <path d="M74,206 q54,44 84,72 q14,14 -6,18 H92 q-18,0 -18,-20 Z" fill="${c}" stroke="${seam}"/>
    <path d="M78,296 h16 v40 h-10 z" fill="${c}" stroke="${seam}"/>
    <path d="M254,206 q54,44 84,72 q14,14 -6,18 h-60 q-18,0 -18,-20 Z" fill="${c}" stroke="${seam}"/>
    <path d="M258,296 h16 v40 h-10 z" fill="${c}" stroke="${seam}"/>`,

  boots: ({ c }) => `
    <path d="M92,150 h56 v130 l40,20 q16,10 -4,18 H92 q-10,0 -10,-14 Z" fill="${c}" stroke="${seam}"/>
    <path d="M252,150 h56 v134 q0,14 -10,14 h-96 q-20,-8 -4,-18 l40,-20 z" fill="${c}" stroke="${seam}"/>`,

  tote: ({ c }) => `
    <path d="M138,164 v-28 a62,62 0 0 1 124,0 v28" fill="none" stroke="${c}" stroke-width="12"/>
    <path d="M104,168 h192 l18,206 H86 Z" fill="${c}" stroke="${seam}"/>`,

  shoulderBag: ({ c }) => `
    <path d="M126,206 q74,-92 148,0" fill="none" stroke="${c}" stroke-width="10"/>
    <rect x="112" y="204" width="176" height="128" rx="12" fill="${c}" stroke="${seam}"/>
    <path d="M112,246 h176" stroke="${soft}" fill="none"/>`,

  clutch: ({ c }) => `
    <rect x="86" y="208" width="228" height="112" rx="14" fill="${c}" stroke="${seam}"/>
    <path d="M86,252 q114,44 228,0" fill="none" stroke="${soft}"/>`,

  scarf: ({ c }) => `
    <path d="M96,168 q104,86 208,0 v46 q-104,86 -208,0 Z" fill="${c}" stroke="${seam}"/>
    <path d="M96,214 v82 M304,214 v82" stroke="${c}" stroke-width="14" fill="none" stroke-linecap="round"/>`,

  sunglasses: ({ c }) => `
    <rect x="76" y="196" width="106" height="66" rx="18" fill="${c}" stroke="${seam}"/>
    <rect x="218" y="196" width="106" height="66" rx="18" fill="${c}" stroke="${seam}"/>
    <path d="M182,216 q18,-10 36,0" fill="none" stroke="${c}" stroke-width="8"/>`,

  belt: ({ c }) => `
    <path d="M70,214 h260 v44 H70 Z" fill="${c}" stroke="${seam}"/>
    <rect x="176" y="200" width="52" height="72" rx="8" fill="none" stroke="${seam}" stroke-width="6"/>`,

  cap: ({ c }) => `
    <path d="M112,238 q4,-96 88,-96 q84,0 88,96 Z" fill="${c}" stroke="${seam}"/>
    <path d="M112,238 q-42,4 -46,30 h140 z" fill="${c}" stroke="${seam}"/>`,
}

export type GarmentRenderOptions = {
  shape: GarmentShape
  colorHex: string
  /** ظل خفيف تحت القطعة */
  shadow?: boolean
}

export function renderGarmentSvg({
  shape,
  colorHex,
  shadow = true,
}: GarmentRenderOptions): string {
  const body = SHAPES[shape]({ c: colorHex, line: seam, shade: soft })
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480" width="400" height="480">',
    shadow ? `<ellipse cx="200" cy="462" rx="118" ry="12" fill="${renderTheme.shadow}"/>` : '',
    `<g fill="none" stroke-linejoin="round" stroke-linecap="round" stroke-width="1.6">${body}</g>`,
    '</svg>',
  ].join('')
}

/** رابط بيانات يصلح في أي `<img src>` أو `imageUrl` عند المزوّد. */
export function garmentImageUrl(options: GarmentRenderOptions): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderGarmentSvg(options))}`
}
