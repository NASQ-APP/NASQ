/**
 * راسم الموديل ومركّب التجربة.
 *
 * من `ModelCharacteristics` محفوظة يطلع جسم **حتمي**: نفس المواصفات تعطي نفس
 * الجسم دائمًا، فيبقى موديل المستخدمة نفس الشخص عبر كل التوليدات (المبدأ ٣).
 * الملابس تُرسم فوق نفس الهندسة اللي بُني منها الجسم، فتتبع الجسم بدل ما
 * تُلصق فوقه.
 */
import { renderTheme } from '@/theme'
import type { GarmentShape } from '@/domain/wardrobe/types'
import type { BodyShape, ModelCharacteristics, SkinTone } from '@/domain/model/types'
import type { BodySlot } from '@/domain/shared/types'
import type { Framing } from '@/domain/outfit/types'

export const SKIN_TONES: SkinTone[] = [
  { id: 'porcelain', name: 'فاتح جدًا', hex: '#F5DFCB' },
  { id: 'light', name: 'فاتح', hex: '#EDCDB0' },
  { id: 'medium', name: 'متوسط', hex: '#D9AE86' },
  { id: 'tan', name: 'قمحي', hex: '#BE8A61' },
  { id: 'deep', name: 'أسمر', hex: '#96613F' },
  { id: 'rich', name: 'أسمر غامق', hex: '#6B412A' },
]

export const HAIR_COLORS = ['#1E1A18', '#3A2A22', '#5C3F2C', '#8A6238', '#B9905A', '#9A9A96']

export const skinHex = (id: string) =>
  SKIN_TONES.find((t) => t.id === id)?.hex ?? SKIN_TONES[2].hex

/* ---------------- هندسة الجسم ---------------- */

const SHAPE_FACTORS: Record<BodyShape, { chest: number; waist: number; hip: number; shoulder: number }> = {
  slim: { chest: 0.92, waist: 0.86, hip: 0.92, shoulder: 0.96 },
  straight: { chest: 1, waist: 0.99, hip: 1, shoulder: 1 },
  athletic: { chest: 1.04, waist: 0.9, hip: 0.99, shoulder: 1.07 },
  curvy: { chest: 1.06, waist: 0.88, hip: 1.16, shoulder: 0.98 },
  plus: { chest: 1.18, waist: 1.2, hip: 1.2, shoulder: 1.06 },
}

type Geometry = ReturnType<typeof buildGeometry>

/** نسبة المقاس المُدخل إلى المقاس المرجعي — ١ لو ما أدخلت المستخدمة القياس. */
const mScale = (value: number | undefined, reference: number) => (value ? value / reference : 1)

function buildGeometry(c: ModelCharacteristics) {
  const cx = 210
  const female = c.gender === 'female'
  const f = SHAPE_FACTORS[c.bodyShape]

  // الوزن يزحزح كل العروض قليلاً، والطول يمدّد الشكل كله رأسيًا
  const w = ((c.weightKg ?? (female ? 60 : 74)) - (female ? 58 : 74)) / 150
  const heightScale = 0.94 + (c.heightCm - 165) / 420

  const base = female
    ? { shoulder: 60, chest: 50, waist: 38, hip: 58, thigh: 27, calf: 17, arm: 12 }
    : { shoulder: 70, chest: 56, waist: 46, hip: 52, thigh: 29, calf: 18, arm: 14 }

  const m = c.measurements

  return {
    cx,
    female,
    heightScale,
    headCx: cx,
    headCy: 98,
    headRx: 33,
    headRy: 41,
    neckTop: 136,
    shoulderY: 182,
    chestY: 258,
    waistY: 348,
    hipY: 416,
    crotchY: 452,
    kneeY: 616,
    ankleY: 796,
    footY: 836,
    shoulderHalf: base.shoulder * f.shoulder * (1 + w) * mScale(m?.shoulders, 40),
    chestHalf: base.chest * f.chest * (1 + w) * mScale(m?.chest, 92),
    waistHalf: base.waist * f.waist * (1 + w) * mScale(m?.waist, female ? 70 : 84),
    hipHalf: base.hip * f.hip * (1 + w) * mScale(m?.hips, female ? 96 : 96),
    thighHalf: base.thigh * f.hip * (1 + w),
    calfHalf: base.calf * (1 + w * 0.6),
    armHalf: base.arm * (1 + w * 0.7),
  }
}

/* ---------- مسارات مشتقة من الهندسة ---------- */

const torsoOutline = (g: Geometry, hemY: number, hemHalf: number) =>
  `M${g.cx - g.shoulderHalf},${g.shoulderY}
   Q${g.cx - g.chestHalf - 4},${g.chestY} ${g.cx - g.waistHalf},${g.waistY}
   Q${g.cx - g.hipHalf},${g.hipY} ${g.cx - hemHalf},${hemY}
   H${g.cx + hemHalf}
   Q${g.cx + g.hipHalf},${g.hipY} ${g.cx + g.waistHalf},${g.waistY}
   Q${g.cx + g.chestHalf + 4},${g.chestY} ${g.cx + g.shoulderHalf},${g.shoulderY}
   Q${g.cx},${g.shoulderY - 16} ${g.cx - g.shoulderHalf},${g.shoulderY} Z`

const legPath = (g: Geometry, side: -1 | 1) => {
  const hipX = g.cx + side * (g.hipHalf - 6)
  const kneeX = g.cx + side * (g.thighHalf + 8)
  const ankleX = g.cx + side * (g.calfHalf + 12)
  return `M${g.cx + side * 3},${g.crotchY - 40}
    Q${hipX},${g.hipY + 30} ${kneeX + side * 6},${g.kneeY}
    Q${ankleX + side * 2},${g.ankleY - 40} ${ankleX},${g.ankleY}
    L${ankleX - side * g.calfHalf * 1.7},${g.ankleY}
    Q${kneeX - side * g.thighHalf * 0.9},${g.kneeY} ${g.cx + side * 2},${g.crotchY - 44} Z`
}

const armPath = (g: Geometry, side: -1 | 1) => {
  const sx = g.cx + side * (g.shoulderHalf - 4)
  const ex = g.cx + side * (g.hipHalf + 14)
  return `M${sx},${g.shoulderY - 2}
    Q${sx + side * 16},${g.chestY + 40} ${ex},${g.hipY + 34}
    L${ex - side * g.armHalf * 1.5},${g.hipY + 34}
    Q${sx + side * 2},${g.chestY + 30} ${sx - side * g.armHalf * 1.4},${g.shoulderY + 4} Z`
}

const hairPath = (g: Geometry, style: string, hex: string) => {
  const { headCx: x, headCy: y, headRx: rx, headRy: ry } = g
  switch (style) {
    case 'bald':
      return ''
    case 'short':
      return `<path d="M${x - rx - 3},${y + 4} q2,-${ry + 16} ${rx + 3},-${ry + 16} q${rx + 3},0 ${rx + 3},${ry + 16} q-8,-18 -${rx + 3},-18 q-${rx - 5},0 -${rx + 3},18 Z" fill="${hex}"/>`
    case 'tied':
      return `<circle cx="${x}" cy="${y - ry - 16}" r="15" fill="${hex}"/>
        <path d="M${x - rx - 3},${y + 6} q2,-${ry + 20} ${rx + 3},-${ry + 20} q${rx + 3},0 ${rx + 3},${ry + 20} q-10,-22 -${rx + 3},-22 q-${rx - 4},0 -${rx + 3},22 Z" fill="${hex}"/>`
    case 'covered':
      return `<path d="M${x - rx - 12},${y + 6} q0,-${ry + 22} ${rx + 12},-${ry + 22} q${rx + 12},0 ${rx + 12},${ry + 22}
        q4,54 -6,84 q-${rx + 6},18 -${(rx + 6) * 2},0 q-10,-30 -6,-84 Z" fill="${hex}"/>
        <path d="M${x - rx + 4},${y - 6} q${rx - 4},-22 ${(rx - 4) * 2},0 q-${rx - 4},14 -${(rx - 4) * 2},0 Z" fill="rgba(0,0,0,.05)"/>`
    case 'medium':
      return `<path d="M${x - rx - 4},${y + 2} q0,-${ry + 18} ${rx + 4},-${ry + 18} q${rx + 4},0 ${rx + 4},${ry + 18}
        l4,52 q-12,10 -16,-4 l-4,-38 q-6,-22 -${rx - 4},-22 q-${rx - 10},0 -${rx - 4},22 l-4,38 q-4,14 -16,4 Z" fill="${hex}"/>`
    default: // long
      return `<path d="M${x - rx - 4},${y + 4} q0,-${ry + 20} ${rx + 4},-${ry + 20} q${rx + 4},0 ${rx + 4},${ry + 20}
        l6,132 q-14,10 -18,-4 l-6,-92 q-8,-24 -${rx - 2},-24 q-${rx - 8},0 -${rx - 2},24 l-6,92 q-4,14 -18,4 Z" fill="${hex}"/>`
  }
}

/* ---------------- طبقات الملابس فوق نفس هندسة الجسم ---------------- */

export type RenderGarment = {
  slot: BodySlot
  colorHex: string
  shape?: GarmentShape
  /**
   * صورة القطعة الحقيقية، **كرابط بيانات**.
   *
   * الـSVG يُعرض داخل `<img>`، وهناك ما يُسمح له بجلب مورد خارجي — فالصورة
   * لازم تكون مضمّنة. تُجهَّز في `cutout.ts` قبل ما تصل هنا.
   */
  imageUrl?: string
  /** حشو الإكمال المحايد — يُرسم سادة عشان ما يُقرأ كقطعة من الخزانة */
  neutral?: boolean
}

/**
 * قطعة ملابس كمسارات، مب كـSVG جاهز.
 *
 * نفس المسارات تُستعمل مرتين: تُعبّأ باللون لما ما فيه صورة، أو تصير قناعًا
 * تُقصّ داخله صورة القطعة. فما فيه هندستان تتفرّقان.
 */
type Parts = {
  /** حدود القطعة على الجسم */
  shapes: string[]
  /** حدود المساحة اللي تُرسم فيها الصورة */
  box: { x: number; y: number; width: number; height: number }
  /** خطوط تفاصيل تُرسم فوق القطعة (خط الرقبة مثلًا) */
  detail?: string
}

const LONG_SLEEVE: GarmentShape[] = ['shirt', 'sweater', 'hoodie', 'jacket', 'coat', 'blazer', 'abaya', 'thobe', 'blouse']

function sleevePath(g: Geometry, side: -1 | 1, long: boolean): string {
  const sx = g.cx + side * (g.shoulderHalf + 2)
  const endY = long ? g.hipY + 26 : g.chestY + 26
  const endX = g.cx + side * (g.hipHalf + (long ? 18 : 26))
  const width = long ? g.armHalf + 6 : g.armHalf + 12
  return `M${sx},${g.shoulderY - 6}
    Q${sx + side * 18},${(g.chestY + endY) / 2} ${endX},${endY}
    L${endX - side * width * 1.6},${endY}
    Q${sx + side * 2},${(g.chestY + endY) / 2 - 6} ${sx - side * width * 1.3},${g.shoulderY - 2} Z`
}

/**
 * يحوّل المسارات إلى SVG: باللون، أو بصورة القطعة مقصوصة داخلها.
 *
 * الصورة تُرسم داخل القناع فقط، فتبقى الأذرع والبشرة والشعر ظاهرة تحتها ولا
 * تصير مستطيلًا ملصوقًا. و`slice` تخلي الصورة تملأ المساحة بدل ما تترك فراغًا.
 */
function paint(item: RenderGarment, parts: Parts, id: string): string {
  const stroke = item.neutral ? 'rgba(0,0,0,.08)' : 'rgba(0,0,0,.12)'
  const outline = parts.shapes.map((d) => `<path d="${d}"/>`).join('')

  if (!item.imageUrl) {
    const filled = parts.shapes
      .map((d) => `<path d="${d}" fill="${item.colorHex}" stroke="${stroke}"/>`)
      .join('')
    return filled + (parts.detail ?? '')
  }

  const { x, y, width, height } = parts.box
  return `<defs><clipPath id="${id}">${outline}</clipPath></defs>
    <g clip-path="url(#${id})">
      <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${item.colorHex}"/>
      <image href="${item.imageUrl}" x="${x}" y="${y}" width="${width}" height="${height}"
        preserveAspectRatio="xMidYMid slice"/>
    </g>
    <g fill="none" stroke="${stroke}">${outline}</g>
    ${parts.detail ?? ''}`
}

function topParts(g: Geometry, item: RenderGarment, hemY: number): Parts {
  const stroke = item.neutral ? 'rgba(0,0,0,.08)' : 'rgba(0,0,0,.12)'
  const long = item.shape ? LONG_SLEEVE.includes(item.shape) : false
  const hemHalf = g.hipHalf * 0.94
  const reach = g.hipHalf + (long ? 18 : 26) + g.armHalf + 12
  return {
    shapes: [sleevePath(g, -1, long), sleevePath(g, 1, long), torsoOutline(g, hemY, hemHalf)],
    box: {
      x: g.cx - reach,
      y: g.shoulderY - 10,
      width: reach * 2,
      height: hemY - g.shoulderY + 12,
    },
    detail: `<path d="M${g.cx - 22},${g.shoulderY - 8} q22,26 44,0" fill="none" stroke="${stroke}"/>`,
  }
}

function bottomParts(g: Geometry, item: RenderGarment): Parts {
  const shape = item.shape ?? 'pants'
  const waistY = g.hipY - 22

  if (shape === 'skirt') {
    const hemY = g.kneeY + 20
    const half = g.hipHalf + 34
    return {
      shapes: [
        `M${g.cx - g.hipHalf},${waistY} H${g.cx + g.hipHalf}
         L${g.cx + half},${hemY} H${g.cx - half} Z`,
      ],
      box: { x: g.cx - half, y: waistY, width: half * 2, height: hemY - waistY },
    }
  }

  const hemY = shape === 'shorts' ? g.kneeY - 40 : g.ankleY - 6
  const legHalf = shape === 'shorts' ? g.thighHalf + 8 : g.calfHalf + 14
  const half = Math.max(g.hipHalf, legHalf + 12)
  return {
    shapes: [
      `M${g.cx - g.hipHalf},${waistY} H${g.cx + g.hipHalf}
       L${g.cx + legHalf + 12},${hemY} H${g.cx + 6}
       L${g.cx},${g.crotchY + 40} L${g.cx - 6},${hemY} H${g.cx - legHalf - 12} Z`,
    ],
    box: { x: g.cx - half, y: waistY, width: half * 2, height: hemY - waistY },
  }
}

function fullParts(g: Geometry, item: RenderGarment): Parts {
  const shape = item.shape ?? 'dress'
  const hemY = shape === 'abaya' || shape === 'thobe' ? g.ankleY : g.kneeY + 90
  const flare = shape === 'abaya' || shape === 'thobe' ? 52 : 40
  const long = LONG_SLEEVE.includes(shape)
  const half = Math.max(g.hipHalf + flare, g.hipHalf + (long ? 18 : 26) + g.armHalf + 12)
  return {
    shapes: [
      sleevePath(g, -1, long),
      sleevePath(g, 1, long),
      `M${g.cx - g.shoulderHalf},${g.shoulderY}
       Q${g.cx - g.chestHalf - 4},${g.chestY} ${g.cx - g.waistHalf},${g.waistY}
       L${g.cx - g.hipHalf - flare},${hemY} H${g.cx + g.hipHalf + flare}
       L${g.cx + g.waistHalf},${g.waistY}
       Q${g.cx + g.chestHalf + 4},${g.chestY} ${g.cx + g.shoulderHalf},${g.shoulderY}
       Q${g.cx},${g.shoulderY - 16} ${g.cx - g.shoulderHalf},${g.shoulderY} Z`,
    ],
    box: {
      x: g.cx - half,
      y: g.shoulderY - 18,
      width: half * 2,
      height: hemY - g.shoulderY + 20,
    },
  }
}

function outerParts(g: Geometry, item: RenderGarment): Parts {
  const shape = item.shape ?? 'jacket'
  const hemY = shape === 'coat' || shape === 'abaya' ? g.kneeY + 60 : g.hipY + 40
  const half = g.hipHalf + 18 + g.armHalf + 12
  const panel = (side: -1 | 1) =>
    `M${g.cx + side * g.shoulderHalf},${g.shoulderY}
     Q${g.cx + side * (g.chestHalf + 8)},${g.chestY} ${g.cx + side * (g.waistHalf + 10)},${g.waistY}
     L${g.cx + side * (g.hipHalf + 8)},${hemY} L${g.cx + side * 6},${hemY}
     L${g.cx + side * 10},${g.shoulderY + 26} Z`
  return {
    shapes: [sleevePath(g, -1, true), sleevePath(g, 1, true), panel(-1), panel(1)],
    box: {
      x: g.cx - half,
      y: g.shoulderY - 10,
      width: half * 2,
      height: hemY - g.shoulderY + 12,
    },
  }
}

function shoesOverlay(g: Geometry, item: RenderGarment) {
  const stroke = 'rgba(0,0,0,.14)'
  const shape = item.shape ?? 'sneakers'
  const heel = shape === 'heels'
  const bootTop = shape === 'boots' ? g.ankleY - 78 : g.ankleY - 10
  const foot = (side: -1 | 1) => {
    const x = g.cx + side * (g.calfHalf + 18)
    const toe = x + side * 30
    return `<path d="M${x - side * (g.calfHalf + 6)},${bootTop}
      H${x + side * 4} L${toe},${g.footY - (heel ? 14 : 0)}
      Q${toe + side * 8},${g.footY} ${toe - side * 4},${g.footY}
      H${x - side * (g.calfHalf + 8)} Z" fill="${item.colorHex}" stroke="${stroke}"/>
      ${heel ? `<path d="M${x - side * (g.calfHalf + 2)},${g.footY - 16} h${side * 12} v18 h-${side * 8} Z" fill="${item.colorHex}" stroke="${stroke}"/>` : ''}`
  }
  return foot(-1) + foot(1)
}

function bagOverlay(g: Geometry, item: RenderGarment) {
  const x = g.cx + g.hipHalf + 26
  return `<path d="M${x - 26},${g.chestY + 6} q26,-58 52,0" fill="none" stroke="${item.colorHex}" stroke-width="5"/>
    <rect x="${x - 30}" y="${g.chestY + 4}" width="60" height="74" rx="7"
      fill="${item.colorHex}" stroke="rgba(0,0,0,.13)"/>`
}

function accessoryOverlay(g: Geometry, item: RenderGarment) {
  const shape = item.shape ?? 'scarf'
  if (shape === 'sunglasses') {
    return `<rect x="${g.headCx - 30}" y="${g.headCy - 8}" width="26" height="17" rx="6" fill="${item.colorHex}"/>
      <rect x="${g.headCx + 4}" y="${g.headCy - 8}" width="26" height="17" rx="6" fill="${item.colorHex}"/>
      <path d="M${g.headCx - 4},${g.headCy - 2} h8" stroke="${item.colorHex}" stroke-width="3"/>`
  }
  if (shape === 'cap') {
    return `<path d="M${g.headCx - 36},${g.headCy - 14} q4,-44 36,-44 q32,0 36,44 Z" fill="${item.colorHex}"/>
      <path d="M${g.headCx - 36},${g.headCy - 14} q-24,2 -26,14 h62 z" fill="${item.colorHex}"/>`
  }
  if (shape === 'belt') {
    return `<rect x="${g.cx - g.waistHalf - 4}" y="${g.waistY - 8}" width="${g.waistHalf * 2 + 8}" height="16"
      rx="3" fill="${item.colorHex}" stroke="rgba(0,0,0,.13)"/>`
  }
  return `<path d="M${g.cx - 34},${g.shoulderY - 10} q34,34 68,0 l6,26 q-40,34 -80,0 Z"
    fill="${item.colorHex}" stroke="rgba(0,0,0,.12)"/>`
}

/* ---------------- قصّة الكاميرا ---------------- */

const VIEWBOX: Record<Framing, string> = {
  full: '0 0 420 900',
  upper: '30 34 360 400',
  lower: '30 380 360 500',
  detail: '60 620 300 270',
}

export function viewBoxFor(framing: Framing, focus?: BodySlot): string {
  if (framing === 'detail') {
    if (focus === 'bag') return '150 210 260 260'
    if (focus === 'accessory') return '110 30 200 220'
    return VIEWBOX.detail
  }
  return VIEWBOX[framing]
}

/* ---------------- الراسم العام ---------------- */

export type RenderModelOptions = {
  characteristics: ModelCharacteristics
  garments?: RenderGarment[]
  framing?: Framing
  focusSlot?: BodySlot
  /** خلفية الاستوديو؛ بطاقات القطع تستخدم شفافة */
  background?: string
}

/** ترتيب الرسم مهم: الجسم ← الطبقات الأساسية ← الخارجي ← الحذاء ← المحمول. */
const SLOT_ORDER: BodySlot[] = ['bottom', 'full', 'top', 'outer', 'shoes', 'bag', 'accessory']

export function renderModelSvg({
  characteristics,
  garments = [],
  framing = 'full',
  focusSlot,
  background = 'transparent',
}: RenderModelOptions): string {
  const g = buildGeometry(characteristics)
  const skin = skinHex(characteristics.skinToneId)
  const hair = characteristics.hairColorHex ?? HAIR_COLORS[0]
  const style = characteristics.hairStyle ?? (characteristics.gender === 'female' ? 'long' : 'short')

  const body = `
    <g fill="${skin}">
      <path d="${legPath(g, -1)}"/>
      <path d="${legPath(g, 1)}"/>
      <path d="${torsoOutline(g, g.crotchY, g.hipHalf * 0.9)}"/>
      <path d="${armPath(g, -1)}"/>
      <path d="${armPath(g, 1)}"/>
      <path d="M${g.cx - 15},${g.neckTop} h30 v42 q-15,12 -30,0 Z"/>
      <ellipse cx="${g.headCx}" cy="${g.headCy}" rx="${g.headRx}" ry="${g.headRy}"/>
      <path d="M${g.cx - g.calfHalf - 20},${g.ankleY} h${g.calfHalf * 2 + 4} v34 h-${g.calfHalf * 2 + 4} Z" opacity="0"/>
    </g>
    ${hairPath(g, style, hair)}`

  const ordered = SLOT_ORDER.flatMap((slot) => garments.filter((x) => x.slot === slot))
  const clothes = ordered
    .map((item, index) => {
      /* الصورة الحقيقية تُقصّ داخل هذي الطبقات فقط. الحذاء والحقيبة
         والإكسسوار مساحاتهم صغيرة، وقصّ صورة منتج فيها يطلع مشوّهًا. */
      switch (item.slot) {
        case 'top':
          return paint(item, topParts(g, item, g.hipY + (item.shape === 'sweater' ? 18 : 6)), `c${index}`)
        case 'bottom':
          return paint(item, bottomParts(g, item), `c${index}`)
        case 'full':
          return paint(item, fullParts(g, item), `c${index}`)
        case 'outer':
          return paint(item, outerParts(g, item), `c${index}`)
        case 'shoes':
          return shoesOverlay(g, item)
        case 'bag':
          return bagOverlay(g, item)
        case 'accessory':
          return accessoryOverlay(g, item)
        default:
          return ''
      }
    })
    .join('')

  const vb = viewBoxFor(framing, focusSlot)
  /**
   * `width` و`height` صريحان.
   *
   * بدونهما ما يكون للـSVG مقاس جوهري، فيفترض المتصفح ٣٠٠×١٥٠ (نسبة ٢:١)
   * بينما المحتوى ٤٢٠:٩٠٠ — فيطلع الموديل مشوّهًا أو مقصوصًا داخل `<img>`.
   * الرقمان يُشتقّان من `viewBox` نفسه فما ينفصلان عنه.
   */
  const [, , vbWidth, vbHeight] = vb.split(' ')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${vbWidth}" height="${vbHeight}" preserveAspectRatio="xMidYMid meet">
    <rect x="-200" y="-200" width="1200" height="1600" fill="${background}"/>
    <ellipse cx="${g.cx}" cy="${g.footY + 14}" rx="${g.hipHalf + 60}" ry="11" fill="${renderTheme.shadow}"/>
    <g transform="translate(${g.cx},${g.footY + 10}) scale(1,${g.heightScale.toFixed(3)}) translate(${-g.cx},${-(g.footY + 10)})"
       stroke-linejoin="round" stroke-linecap="round" stroke-width="1.4">
      ${body}
      ${clothes}
    </g>
  </svg>`
}

export function modelImageUrl(options: RenderModelOptions): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderModelSvg(options))}`
}
