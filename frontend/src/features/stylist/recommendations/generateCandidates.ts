/**
 * توليد الإطلالات ثم ترتيبها ثم **تنويعها**.
 *
 * الترتيب وحده يعطي ثلاثة خيارات متطابقة إلا في الحذاء: أعلى ثلاث نتائج تكون
 * غالبًا نفس التوليفة بتبديل صغير، لأن ما رجّح الأولى يرجّح ما يشبهها. فبعد
 * الترتيب تمرّ الخيارات على تنويع يفرض اختلافًا حقيقيًا.
 *
 * **ولا تُخترع قطعة أبدًا.** كل مرشّح يُبنى من عناصر الخزانة نفسها، فالمعرّفات
 * الخارجة صحيحة بالبناء لا بالتحقق بعد الحدث.
 */
import { slotOf } from '@/domain/outfit'
import { applyConstraints } from '../scoring/constraints'
import { buildPalette, type OutfitPalette } from '../colors/colorPalette'
import { scoreColorHarmony } from '../colors/colorHarmony'
import { scoreOutfit, type ScoreBreakdown } from '../scoring/outfitScore'
import type { StylistContext } from '../context/stylistContext'
import type { BodySlot, WardrobeItem } from '@/domain/wardrobe'

export type OutfitCandidate = {
  items: WardrobeItem[]
  itemIds: string[]
  score: ScoreBreakdown
  palette?: OutfitPalette
}

/** فجوة في الخزانة — تُقال ولا تُسدّ باختراع. */
export type WardrobeGap = {
  slot: BodySlot
  /** أسماء ألوان تناسب الإطلالة — إرشاد لا عرض بيع */
  colors: string[]
}

const bySlot = (items: WardrobeItem[], slot: BodySlot) =>
  items.filter((item) => slotOf(item) === slot)

/** أفضل ما ينسجم مع القطعة المثبَّتة، مرتّبًا. */
function rankedFor(pool: WardrobeItem[], anchor: WardrobeItem | undefined): WardrobeItem[] {
  if (!anchor) return pool
  return pool.toSorted(
    (a, b) =>
      scoreColorHarmony(anchor.colorHex, b.colorHex).score -
      scoreColorHarmony(anchor.colorHex, a.colorHex).score,
  )
}

/**
 * يبني مرشّحات بتبديل القطعة في كل موضع.
 *
 * العدد محدود عمدًا (`depth`): خزانة بخمسين قطعة تعطي آلاف التوليفات، وحسابها
 * كلها يعلّق المتصفّح لأجل خيارات لن تُقرأ. ثلاثة بدائل لكل موضع تكفي لتنوّع
 * حقيقي وتبقى في حدود المللي ثانية.
 */
export function generateCandidates(
  context: StylistContext,
  depth = 3,
): OutfitCandidate[] {
  const pool = applyConstraints(
    context.wardrobe,
    context.declared.avoid,
    context.anchor?.id,
  )

  const anchor = context.anchor
  const anchorSlot = anchor ? slotOf(anchor) : undefined

  const options = (slot: BodySlot): (WardrobeItem | undefined)[] => {
    if (anchorSlot === slot) return [anchor]
    const ranked = rankedFor(bySlot(pool, slot), anchor).slice(0, depth)
    return ranked.length > 0 ? ranked : [undefined]
  }

  const candidates: OutfitCandidate[] = []
  const seen = new Set<string>()

  const add = (parts: (WardrobeItem | undefined)[]) => {
    const items = parts.filter((item): item is WardrobeItem => Boolean(item))
    if (items.length < 2) return

    const itemIds = items.map((item) => item.id)
    const key = itemIds.toSorted().join(',')
    if (seen.has(key)) return
    seen.add(key)

    candidates.push({
      items,
      itemIds,
      score: scoreOutfit(items, context),
      palette: buildPalette(items),
    })
  }

  /*
    شكلان للإطلالة: قطعة كاملة، أو علوي وسفلي. والمثبَّتة تفرض شكلها — من
    ثبّتت فستانًا لا تُبنى لها إطلالة بعلوي وسفلي.
  */
  const wantsOnePiece = anchorSlot === 'full'
  const wantsTwoPiece = anchorSlot === 'top' || anchorSlot === 'bottom'

  const shoes = options('shoes')
  const bags = options('bag')
  const outers = options('outer')

  if (!wantsTwoPiece) {
    for (const full of options('full')) {
      if (!full) break
      for (const shoe of shoes) {
        for (const bag of bags) add([full, shoe, bag])
        add([full, shoe, outers[0]])
      }
    }
  }

  if (!wantsOnePiece) {
    for (const top of options('top')) {
      for (const bottom of options('bottom')) {
        if (!top || !bottom) continue
        for (const shoe of shoes) {
          add([top, bottom, shoe])
          add([top, bottom, shoe, bags[0]])
          add([top, bottom, shoe, outers[0]])
        }
      }
    }
  }

  return candidates.toSorted((a, b) => b.score.total - a.score.total)
}

/**
 * يمرّر أعلى المرشّحات على شرط الاختلاف.
 *
 * الخيار الذي يشترك بأكثر من نصف قطعه مع خيار مقبول قبله ليس خيارًا ثانيًا —
 * هو الأول بحذاء مختلف. والمستخدمة تقرأ ثلاثة وتظنّها ثلاثة.
 */
export function diversify(
  candidates: OutfitCandidate[],
  count = 3,
  maxOverlap = 0.5,
): OutfitCandidate[] {
  const chosen: OutfitCandidate[] = []

  for (const candidate of candidates) {
    if (chosen.length >= count) break

    const tooSimilar = chosen.some((kept) => {
      const shared = candidate.itemIds.filter((id) => kept.itemIds.includes(id)).length
      const smaller = Math.min(candidate.itemIds.length, kept.itemIds.length)
      return smaller > 0 && shared / smaller > maxOverlap
    })

    if (!tooSimilar) chosen.push(candidate)
  }

  /*
    لو ما كفى المختلف، نكمل من الباقي بدل أن نرجع خيارًا واحدًا: خزانة صغيرة
    ما تعطي ثلاثة متباينة، وإخفاء ما عندها ليس أمانة بل حرمان.
  */
  if (chosen.length < count) {
    for (const candidate of candidates) {
      if (chosen.length >= count) break
      if (!chosen.includes(candidate)) chosen.push(candidate)
    }
  }

  return chosen
}

/** ما ينقص الإطلالة من مواضع أساسية — يُقال ولا يُخترع. */
export function findGaps(candidate: OutfitCandidate): WardrobeGap[] {
  const slots = new Set(candidate.items.map(slotOf))
  const gaps: WardrobeGap[] = []

  if (!slots.has('shoes')) {
    const palette = candidate.palette
    gaps.push({
      slot: 'shoes',
      colors: palette ? palette.names.slice(0, 2) : [],
    })
  }

  if (!slots.has('full') && !(slots.has('top') && slots.has('bottom'))) {
    gaps.push({ slot: slots.has('top') ? 'bottom' : 'top', colors: [] })
  }

  return gaps
}
