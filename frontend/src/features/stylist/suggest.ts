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
      gap: 'أضيفي كم قطعة وأقدر أنسّق لك منها.',
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
      const baseSlot = slotOf(base)
      const wanted: BodySlot[] =
        baseSlot === 'top' ? ['bottom', 'shoes', 'outer'] :
        baseSlot === 'bottom' ? ['top', 'shoes', 'bag'] :
        baseSlot === 'full' ? ['outer', 'shoes', 'bag'] :
        ['top', 'bottom']

      const pieces = wanted
        .flatMap((slot) => bySlot(items, slot).filter((i) => !selectedIds.includes(i.id)).slice(0, 2))
        .slice(0, 4)

      return {
        message: pieces.length
          ? `لقيت لك ${pieces.length} قطع من خزانتك تناسب «${base.name}».`
          : `ما لقيت شي في خزانتك ينسّق مع «${base.name}».`,
        looks: [],
        pieces: pieces.map((p) => p.id),
        gap: pieces.length ? undefined : 'ينقصك قطعة أساسية بلون محايد.',
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
    .map((variant) => ({
      title: ['LOOK 01', 'LOOK 02', 'LOOK 03'][variant],
      reason: style.colors.length
        ? `قريبة من إلهامك: ${style.colors.slice(0, 2).map((c) => c.name).join(' و')}.`
        : neutral
        ? 'ألوان محايدة وقصّات مرتبة — تتحمّل يوم طويل بدون ما تفقد شكلها.'
        : relaxed
          ? 'قطع مريحة بدون ما تفقد الترتيب.'
          : evening
            ? 'قطعة أساسية أنيقة، والباقي هادئ عشان يبقى التركيز عليها.'
            : 'مزيج متوازن من خزانتك — ألوان تمشي مع بعض.',
      itemIds: assemble(scope, variant, neutral, style),
    }))
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
  'نسّقي لي إطلالة للجامعة',
  'وش يناسب القطعة المختارة؟',
  'إطلالة كاجوال لليوم',
  'إطلالة لمناسبة مسائية',
  'عطيني خيار ثاني',
]
