/**
 * الستايليست يفكّر داخل خزانة المستخدمة وحدها — ما يخترع قطعة ولا يقترح شراء.
 * ولو الخزانة ما تقدر تجاوب الطلب، يقولها بدل ما يركّب شيئًا من عنده (المبدأ ٢).
 */
import { categoryById } from '@/domain/wardrobe'
import { slotOf } from '@/domain/outfit'
import { EMPTY_STYLE_PROFILE } from '@/domain/style/types'
import type { BodySlot, WardrobeItem } from '@/domain/wardrobe'
import type { UserStyleProfile } from '@/domain/style/types'

export type StylistLook = {
  title: string
  reason: string
  itemIds: string[]
}

export type StylistAnswer = {
  message: string
  looks: StylistLook[]
  /** قطع مفردة تُقترح لتنسّق مع شيء مختار أصلاً */
  pieces: string[]
  /** يظهر لما تكون الخزانة فعلاً ما تغطي الطلب */
  gap?: string
}

const NEUTRALS = ['أسود', 'أبيض', 'أبيض مكسور', 'كريمي', 'بيج', 'رمادي', 'فحمي', 'رملي', 'كحلي']

const COLOR_PARTNERS: Record<string, string[]> = {
  أسود: ['أبيض', 'أبيض مكسور', 'كريمي', 'بيج', 'جملي', 'رمادي', 'عنّابي', 'زيتي', 'وردي هادئ'],
  أبيض: ['أسود', 'كحلي', 'بيج', 'جملي', 'بني', 'زيتي', 'عنّابي', 'أزرق دينم'],
  'أبيض مكسور': ['كحلي', 'بني', 'جملي', 'زيتي', 'عنّابي', 'رمادي'],
  كريمي: ['بني', 'جملي', 'كحلي', 'زيتي', 'عنّابي', 'وردي هادئ'],
  بيج: ['أبيض', 'أسود', 'كحلي', 'بني', 'زيتي', 'عنّابي'],
  جملي: ['أبيض', 'كريمي', 'أسود', 'كحلي', 'بني', 'زيتي'],
  بني: ['أبيض', 'كريمي', 'بيج', 'أزرق دينم', 'زيتي', 'وردي هادئ'],
  رمادي: ['أبيض', 'أسود', 'كحلي', 'عنّابي', 'وردي هادئ', 'أخضر باهت'],
  فحمي: ['أبيض', 'كريمي', 'بيج', 'وردي هادئ', 'عنّابي'],
  كحلي: ['أبيض', 'كريمي', 'بيج', 'جملي', 'رمادي', 'عنّابي', 'وردي هادئ'],
  زيتي: ['أبيض مكسور', 'كريمي', 'بيج', 'جملي', 'بني', 'أسود'],
  'أزرق دينم': ['أبيض', 'كريمي', 'بيج', 'بني', 'أسود', 'عنّابي'],
  رملي: ['أبيض', 'بني', 'كحلي', 'زيتي', 'عنّابي'],
  عنّابي: ['كريمي', 'بيج', 'أسود', 'رمادي', 'كحلي', 'وردي هادئ'],
  'أخضر باهت': ['كريمي', 'بيج', 'بني', 'فحمي', 'وردي هادئ'],
  'وردي هادئ': ['أبيض مكسور', 'كريمي', 'رمادي', 'فحمي', 'بني', 'عنّابي'],
}

export type ColorPairingAdvice = {
  colors: string[]
  message: string
}

/** لوحة ألوان عملية تُبنى حول لون القطعة الأساسية. */
export function colorPairingFor(item: WardrobeItem): ColorPairingAdvice {
  const colors = COLOR_PARTNERS[item.colorName] ?? ['أبيض', 'أسود', 'بيج', 'كحلي']
  return {
    colors,
    message: `ألوان تتناسق مع ${item.colorName}: ${colors.slice(0, 5).join('، ')}.`,
  }
}

const bySlot = (items: WardrobeItem[], slot: BodySlot) => items.filter((i) => slotOf(i) === slot)

const pick = <T,>(list: T[], index: number): T | undefined =>
  list.length ? list[index % list.length] : undefined

/**
 * ترتيب القطع قبل التركيب.
 *
 * لو عند المستخدمة إلهامات محفوظة، ألوانها تتقدّم — فالإطلالة تطلع بذوقها هي
 * مب بقاعدة عامة. وبلا إلهام يبقى السلوك القديم كما هو تمامًا.
 */
function assemble(
  items: WardrobeItem[],
  variant: number,
  preferNeutral: boolean,
  style: UserStyleProfile = EMPTY_STYLE_PROFILE,
): string[] {
  const liked = new Set(style.colors.map((c) => c.name))
  const byTaste = (a: WardrobeItem, b: WardrobeItem) =>
    Number(liked.has(b.colorName)) - Number(liked.has(a.colorName))

  const pool = liked.size
    ? items.toSorted(byTaste)
    : preferNeutral
    ? items.toSorted(
        (a, b) => Number(NEUTRALS.includes(b.colorName)) - Number(NEUTRALS.includes(a.colorName)),
      )
    : items

  const onePiece = bySlot(pool, 'full')
  const tops = bySlot(pool, 'top')
  const bottoms = bySlot(pool, 'bottom')
  const shoes = bySlot(pool, 'shoes')
  const bags = bySlot(pool, 'bag')
  const outer = bySlot(pool, 'outer')

  const chosen: (WardrobeItem | undefined)[] = []

  // كل اقتراح ثالث يميل لقطعة كاملة لو كان في الخزانة وحدة
  const wearsOnePiece = variant % 3 === 2 && onePiece.length > 0
  if (wearsOnePiece) {
    chosen.push(pick(onePiece, variant))
  } else {
    chosen.push(pick(tops, variant), pick(bottoms, variant))
  }
  chosen.push(pick(shoes, variant))

  // الفستان وحده مع الحذاء يبان ناقصًا — الحقيبة تكمّل الإطلالة
  if (wearsOnePiece || variant % 2 === 1) chosen.push(pick(bags, variant))
  if (variant % 3 === 1) chosen.push(pick(outer, variant))

  return chosen.filter(Boolean).map((i) => i!.id)
}

const has = (text: string, ...keys: string[]) => keys.some((k) => text.includes(k))

/** قطعة تصلح للمناسبات: فستان أو حذاء أو حقيبة. */
const isDressy = (item: WardrobeItem): boolean => {
  const slot = categoryById(item.categoryId)?.slot
  return slot === 'full' || slot === 'shoes' || slot === 'bag'
}

/** بصمة الإطلالة — تمنع تكرار نفس التشكيلة بين اقتراحات اليوم. */
const lookKey = (look: StylistLook): string => look.itemIds.toSorted().join(',')

/**
 * يشرح قرار التنسيق من القطع نفسها، لا من قالب عام.
 *
 * الشرح يذكر القطعة القائدة والألوان الموجودة فعلًا، عشان تعرف المستخدمة
 * ليش التشكيلة متماسكة وتقدر تتعلم منها بدل ما تطبقها بلا سياق.
 */
function explainLook(
  itemIds: string[],
  items: WardrobeItem[],
  intent: { neutral: boolean; relaxed: boolean; evening: boolean },
  style: UserStyleProfile,
): string {
  const chosen = itemIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is WardrobeItem => Boolean(item))
  const colors = [...new Set(chosen.map((item) => item.colorName))]
  const palette = colors.slice(0, 3).join(' و')
  const hero =
    chosen.find((item) => slotOf(item) === 'full') ??
    chosen.find((item) => slotOf(item) === 'outer') ??
    chosen[0]

  if (!hero) return 'توليفة مبنية من القطع المتاحة في خزانتك.'

  if (style.colors.length > 0) {
    const liked = colors.filter((color) => style.colors.some((item) => item.name === color))
    if (liked.length > 0) {
      return `ألوان ${liked.slice(0, 2).join(' و')} قريبة من إلهامك، و«${hero.name}» تقود التشكيلة بدون زحمة.`
    }
  }

  if (intent.evening) {
    return `«${hero.name}» هي القطعة البارزة، ولوحة ${palette} تبقي الإطلالة المسائية متوازنة.`
  }
  if (intent.neutral) {
    return `لوحة ${palette} هادئة وعملية، و«${hero.name}» تعطي الإطلالة ترتيبًا يناسب يومًا طويلًا.`
  }
  if (intent.relaxed) {
    return `توليفة مريحة بألوان ${palette}، و«${hero.name}» تحافظ على شكل مرتب بدون تكلّف.`
  }
  return `«${hero.name}» نقطة البداية، وألوان ${palette} تربط القطع في إطلالة متوازنة.`
}

function pairingScore(
  base: WardrobeItem,
  candidate: WardrobeItem,
  style: UserStyleProfile,
): number {
  const partners = colorPairingFor(base).colors
  const liked = style.colors.some((color) => color.name === candidate.colorName)
  return (
    Number(partners.includes(candidate.colorName)) * 8 +
    Number(NEUTRALS.includes(candidate.colorName)) * 3 +
    Number(candidate.colorName === base.colorName) * 2 +
    Number(liked) * 2
  )
}

/**
 * يثبّت قطعة واحدة ويكمل حولها حتى ثلاث إطلالات، بدون تكرار فتحة اللبس نفسها.
 * الاختيار يفضّل الألوان المتناغمة، ثم ألوان الإلهام، ثم القطع المحايدة.
 */
function pairingLooks(
  base: WardrobeItem,
  items: WardrobeItem[],
  style: UserStyleProfile,
): StylistLook[] {
  const baseSlot = slotOf(base)
  const ranked = (slot: BodySlot) =>
    bySlot(items, slot)
      .filter((item) => item.id !== base.id)
      .toSorted((a, b) => pairingScore(base, b, style) - pairingScore(base, a, style))

  const pools = {
    top: ranked('top'),
    bottom: ranked('bottom'),
    full: ranked('full'),
    outer: ranked('outer'),
    shoes: ranked('shoes'),
    bag: ranked('bag'),
    accessory: ranked('accessory'),
  }

  const choose = (slot: BodySlot, variant: number, offset = 0) =>
    pick(pools[slot], variant + offset)

  const build = (variant: number): WardrobeItem[] => {
    const chosen: (WardrobeItem | undefined)[] = [base]

    if (baseSlot === 'top') {
      chosen.push(choose('bottom', variant), choose('shoes', variant))
      chosen.push(variant % 2 ? choose('outer', variant) : choose('bag', variant))
    } else if (baseSlot === 'bottom') {
      chosen.push(choose('top', variant), choose('shoes', variant))
      chosen.push(variant % 2 ? choose('outer', variant) : choose('bag', variant))
    } else if (baseSlot === 'full') {
      chosen.push(choose('shoes', variant), choose('bag', variant), choose('outer', variant))
    } else if (baseSlot === 'outer') {
      chosen.push(choose('top', variant), choose('bottom', variant), choose('shoes', variant))
      chosen.push(choose('bag', variant))
    } else if (baseSlot === 'shoes') {
      const onePiece = variant % 3 === 2 && pools.full.length > 0
      chosen.push(onePiece ? choose('full', variant) : choose('top', variant))
      if (!onePiece) chosen.push(choose('bottom', variant))
      chosen.push(choose('bag', variant), choose('outer', variant))
    } else {
      const onePiece = variant % 3 === 2 && pools.full.length > 0
      chosen.push(onePiece ? choose('full', variant) : choose('top', variant))
      if (!onePiece) chosen.push(choose('bottom', variant))
      chosen.push(choose('shoes', variant), choose(baseSlot === 'bag' ? 'outer' : 'bag', variant))
    }

    if (baseSlot !== 'accessory' && variant === 2) chosen.push(choose('accessory', variant))

    return [...new Map(chosen.filter(Boolean).map((item) => [item!.id, item!])).values()]
  }

  const looks = [0, 1, 2]
    .map((variant): StylistLook => {
      const chosen = build(variant)
      const palette = [...new Set(chosen.map((item) => item.colorName))].slice(0, 4).join(' و')
      return {
        title: `حول ${base.name}`,
        reason: `ثبتنا «${base.name}» كقطعة أساسية، ونسّقنا معها ألوان ${palette}.`,
        itemIds: chosen.map((item) => item.id),
      }
    })
    .filter((look) => look.itemIds.length >= 2)

  return [...new Map(looks.map((look) => [lookKey(look), look])).values()]
}

export function suggest(
  question: string,
  wardrobe: WardrobeItem[],
  selectedIds: string[] = [],
  /** ذوق المستخدمة من صفحة «إلهامي» — يرجّح الألوان، وما يخترع قطعًا */
  style: UserStyleProfile = EMPTY_STYLE_PROFILE,
): StylistAnswer {
  const q = question.trim()
  const items = wardrobe.filter((i) => i.source === 'wardrobe')

  if (!items.length) {
    return {
      message: 'خزانتك فاضية لين الحين.',
      looks: [],
      pieces: [],
      gap: 'كم قطعة زيادة وأقدر أنسّق لك منها.',
    }
  }

  const asksPairing = has(q, 'يناسب', 'مع هذي', 'مع هذا', 'وش ألبس مع', 'ينفع مع', 'كمّلي', 'أكملي')
  const asksLook = has(
    q,
    'نسّقي', 'نسقي', 'إطلالة', 'اطلاله', 'جهّزي', 'جهزي', 'خيار ثاني',
    'جامعة', 'عمل', 'دوام', 'رسمي', 'مناسبة', 'عشاء', 'كاجوال', 'مريح', 'سفر',
  )

  /* ---- pairing question: what goes with this piece? ---- */
  // طلب المناسبة الصريح يغلب الاختيار الحالي، وإلا فالسؤال الغامض مع وجود
  // قطعة مختارة يُقرأ كـ«وش يناسب هذي؟»
  if (asksPairing || (!asksLook && selectedIds.length)) {
    const base = items.find((i) => selectedIds.includes(i.id))
    if (base) {
      const looks = pairingLooks(base, items, style)

      return {
        message: looks.length
          ? `هذي أفضل التنسيقات من خزانتك حول «${base.name}».`
          : `ما لقيت شي في خزانتك ينسّق مع «${base.name}».`,
        looks,
        pieces: [],
        gap: looks.length ? undefined : 'ينقصك قطعة أساسية أو حذاء بلون متناسق.',
      }
    }
  }

  /* ---- occasion-shaped requests ---- */
  const neutral = has(q, 'جامعة', 'عمل', 'دوام', 'رسمي', 'اجتماع')
  const relaxed = has(q, 'كاجوال', 'مريح', 'بيت', 'مشوار')
  const evening = has(q, 'مناسبة', 'عشاء', 'عرس', 'حفلة')

  // قطع المناسبات تتقدّم في الترتيب، وما تُستبعد الباقي — الاستبعاد يخلي
  // الإطلالة ناقصة لو الخزانة ما فيها إلا فستان أو فستانين
  const scope = evening
    ? items.toSorted((a, b) => Number(isDressy(b)) - Number(isDressy(a)))
    : items

  const looks: StylistLook[] = [0, 1, 2]
    .map((variant) => {
      const itemIds = assemble(scope, variant, neutral, style)
      return {
        title: ['LOOK 01', 'LOOK 02', 'LOOK 03'][variant],
        reason: explainLook(itemIds, items, { neutral, relaxed, evening }, style),
        itemIds,
      }
    })
    .filter((l) => l.itemIds.length >= 2)

  const message = neutral
    ? 'اخترت لك ثلاث إطلالات هادئة من خزانتك:'
    : evening
      ? 'من قطع المناسبات عندك:'
      : relaxed
        ? 'إطلالات مريحة من خزانتك:'
        : 'من خزانتك الحالية، هذي ثلاث إطلالات جاهزة:'

  return {
    message: looks.length ? message : 'ما قدرت أركّب إطلالة كاملة من خزانتك.',
    looks,
    pieces: [],
    gap: looks.length ? undefined : 'ينقصك قطع أساسية — علوي وسفلي وحذاء على الأقل.',
  }
}

/* ---------------- اقتراحات اليوم في الرئيسية ---------------- */

export type DailyLook = StylistLook & {
  /** معرّف المناسبة من `OCCASIONS` — يُحفظ مع الإطلالة لو جرّبتها */
  occasionId: string
  occasionLabel: string
}

/**
 * ثلاث نوايا ثابتة عشان الاقتراحات تبان مقصودة، مو عشوائية.
 * `wantsOnePiece` تحدّد شكل الإطلالة: المناسبة تميل لفستان، والجامعة لقطعتين.
 */
const DAILY_INTENTS: {
  occasionId: string
  occasionLabel: string
  prompt: string
  wantsOnePiece: boolean
}[] = [
  {
    occasionId: 'university',
    occasionLabel: 'للجامعة',
    prompt: 'نسّقي لي إطلالة للجامعة',
    wantsOnePiece: false,
  },
  {
    occasionId: 'daily',
    occasionLabel: 'ليوم عادي',
    prompt: 'إطلالة كاجوال لليوم',
    wantsOnePiece: false,
  },
  {
    occasionId: 'event',
    occasionLabel: 'لمناسبة',
    prompt: 'إطلالة لمناسبة مسائية',
    wantsOnePiece: true,
  },
]

/**
 * اقتراحات «وش ألبس اليوم؟» — إطلالة جاهزة لكل نيّة، كلها من خزانة المستخدمة.
 * حتمية: نفس الخزانة تعطي نفس الاقتراحات، فما تتقلّب مع كل رسم.
 */
export function dailyLooks(wardrobe: WardrobeItem[]): DailyLook[] {
  const owned = wardrobe.filter((item) => item.source === 'wardrobe')
  const onePieceIds = new Set(
    owned.filter((item) => categoryById(item.categoryId)?.slot === 'full').map((item) => item.id),
  )
  const hasOnePiece = (look: StylistLook) => look.itemIds.some((id) => onePieceIds.has(id))
  const used = new Set<string>()

  return DAILY_INTENTS.flatMap((intent, index) => {
    const { looks } = suggest(intent.prompt, wardrobe)
    if (!looks.length) return []

    const fresh = looks.filter((look) => !used.has(lookKey(look)))
    const pool = fresh.length ? fresh : looks

    // نطابق شكل الإطلالة مع النيّة أول، ثم نرجع للترتيب، ثم لأغنى إطلالة —
    // بطاقة بقطعتين تبان ناقصة في الرئيسية.
    const shaped = pool.filter((look) => hasOnePiece(look) === intent.wantsOnePiece)
    const candidates = shaped.length ? shaped : pool
    const preferred = candidates[index % candidates.length]
    const look =
      preferred.itemIds.length >= 3
        ? preferred
        : candidates.reduce((best, current) =>
            current.itemIds.length > best.itemIds.length ? current : best,
          )

    used.add(lookKey(look))
    return [{ ...look, occasionId: intent.occasionId, occasionLabel: intent.occasionLabel }]
  })
}

export const QUICK_PROMPTS = [
  'إطلالة للجامعة',
  'وش يناسب القطعة المختارة؟',
  'إطلالة كاجوال لليوم',
  'إطلالة لمناسبة مسائية',
  'عطيني خيار ثاني',
]
