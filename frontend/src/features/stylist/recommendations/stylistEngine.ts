/**
 * المحرّك — من نيّة وسياق إلى ثلاثة خيارات مشروحة.
 *
 * **القرار حسابي والشرح لغوي.** النموذج لا يختار القطع: يشرح ما اختاره
 * المحرّك. لو اختار هو، لاخترع قطعًا ليست في الخزانة، أو أعاد معرّفات لا
 * وجود لها — وكلاهما يُعرض على المستخدمة كأنه ملكها.
 *
 * والتحقّق هنا **بالبناء لا بعد الحدث**: المرشّحات تُبنى من عناصر الخزانة
 * نفسها، فالمعرّف الخارج موجود حتمًا. ويبقى `validateOutfit` حارسًا لأي مصدر
 * خارجي يأتي لاحقًا (نموذج، أو حالة محفوظة قديمة).
 */
import { signatureOf } from '../session/session'
import { slotOf } from '@/domain/outfit'
import { readColor } from '../colors/colorSpace'
import { scoreColorHarmony } from '../colors/colorHarmony'
import {
  diversify,
  findGaps,
  generateCandidates,
  type OutfitCandidate,
  type WardrobeGap,
} from './generateCandidates'
import type { StylistContext } from '../context/stylistContext'
import type { WardrobeItem } from '@/domain/wardrobe'

/** نبرة الخيار — ثلاثة مقاصد مختلفة لا ثلاث درجات من واحد. */
export type OutfitTone = 'safe' | 'taste' | 'bold'

export const TONE_TITLE: Record<OutfitTone, string> = {
  safe: 'الخيار الآمن',
  taste: 'الأقرب لذوقك',
  bold: 'خيار أجرأ',
}

export type StylistOutfit = OutfitCandidate & {
  tone: OutfitTone
  /** جملة واحدة تقول لماذا — لا تقرير */
  why: string
  gaps: WardrobeGap[]
}

/**
 * يشرح الاختيار من القطع نفسها.
 *
 * الشرح يذكر ما تراه المستخدمة أمامها: القطعة القائدة، ولوحة الألوان،
 * والعلاقة بينها. وشرحٌ عام («توليفة متوازنة») لا يعلّمها شيئًا ولا يُصدَّق.
 */
function explain(candidate: OutfitCandidate, context: StylistContext): string {
  const hero =
    context.anchor ??
    candidate.items.find((item) => slotOf(item) === 'full') ??
    candidate.items[0]

  const palette = candidate.palette
  if (!hero || !palette) return 'توليفة من قطعك المتاحة.'

  const heroColor = readColor(hero.colorHex).family
  const rest = palette.names.filter((name) => name !== heroColor)

  if (rest.length === 0) {
    /*
      «كلها درجات منه» ادّعاءٌ لا يصحّ إلا بأحادية لونية فعلية.

      كان يُقال كلما خلت اللوحة من اسمٍ ثانٍ — وقد تخلو لأن القطع محايدة أو
      لأن اللون لم يُتعرَّف عليه. فقوله عن أسود مع رمادي كذبٌ صغير يهدم الثقة
      في كل شرح بعده.
    */
    return palette.relation === 'monochromatic'
      ? `«${hero.name}» تقود الإطلالة، واللوحة كلها درجات منه.`
      : `«${hero.name}» تقود الإطلالة، وبقيّة القطع تسندها بلا منافسة.`
  }

  const relationPhrase: Record<string, string> = {
    monochromatic: 'يمدّه بدرجة أهدأ',
    analogous: 'يجاوره فيتمدّد اللون بلا قطع',
    complementary: 'يقابله فيعطي تباينًا واضحًا',
    'split-complementary': 'يقابله بهدوء',
    triadic: 'يوازنه من الطرف الثالث',
    neutral: 'يسنده بلا منافسة',
    balanced: 'يفصل عنه فيبقى لكلٍّ حضوره',
  }

  const verb = relationPhrase[palette.relation] ?? 'يكمّله'
  return `${heroColor} هو اللون الرئيسي، و${rest[0]} ${verb}.`
}

/**
 * نبرة كل خيار بحسب ما رجّحه.
 *
 * ليست تسمية تجميلية: الأول أعلى **توازنًا وحيادًا** فهو الآمن، والثاني أعلى
 * قربًا من ذوقها، والثالث أعلى تباينًا لونيًا. فالثلاثة تختلف في المقصد لا
 * في الترتيب وحده.
 */
function assignTones(candidates: OutfitCandidate[]): StylistOutfit[] {
  const tones: OutfitTone[] = ['safe', 'taste', 'bold']
  return candidates.map((candidate, index) => ({
    ...candidate,
    tone: tones[index] ?? 'taste',
    why: '',
    gaps: [],
  }))
}

/**
 * يبني إطلالات من الخزانة — **ويستبعد ما عُرض إن أمكن**.
 *
 * `exclude` بصماتُ ما رأته المستخدمة. والاستبعاد **مشروط بوجود بديل**: خزانةٌ
 * فيها فستان واحد لا تُنتج ثانيًا مهما استبعدنا، والإصرار يعطي فراغًا بدل
 * أقرب ما عندها. فنستبعد ما دام يبقى شيء، ونتراجع حين لا يبقى — والصدق في
 * الرسالة لا في إخفاء النتيجة.
 */
export function buildOutfits(
  context: StylistContext,
  count = 3,
  exclude: readonly string[] = [],
): StylistOutfit[] {
  const all = generateCandidates(context)
  if (all.length === 0) return []

  const blocked = new Set(exclude)
  const fresh = all.filter(
    (candidate) => !blocked.has(signatureOf(candidate.items.map((item) => item.id))),
  )
  const candidates = fresh.length > 0 ? fresh : all

  /*
    الترشيح ثم التنويع ثم النبرة. وترتيب النبرة يتبع خصائص المرشّح لا موضعه:
    الأهدأ لونيًا أولاً، والأعلى تباينًا أخيرًا.
  */
  const varied = diversify(candidates, count)
  const ordered = varied.toSorted((a, b) => b.score.color - a.score.color)

  return assignTones(ordered).map((outfit) => ({
    ...outfit,
    why: explain(outfit, context),
    gaps: findGaps(outfit),
  }))
}

/* --------------------------- حارس الاختراع --------------------------- */

/**
 * لا معرّف من خارج خزانتها.
 *
 * يُنادى على أي إطلالة تأتي من مصدر لا نبنيه بأنفسنا. والفشل يعني **رفض
 * الإطلالة كاملة** لا تنظيفها: إطلالة نُزعت منها قطعة ليست ما وُزنت عليه،
 * وعرضها بعد البتر يقدّم شيئًا لم يُختَر.
 */
export function validateOutfit(itemIds: string[], wardrobe: WardrobeItem[]): boolean {
  if (itemIds.length === 0) return false
  const owned = new Set(wardrobe.map((item) => item.id))
  return itemIds.every((id) => owned.has(id))
}

/* ------------------------------ المقارنة ------------------------------ */

export type ComparisonVerdict = {
  winnerId: string
  confidence: number
  reasons: string[]
}

/**
 * «الأبيض ولا البيج؟» — يقارن قطعتين في سياق واحد.
 *
 * المقارنة تكون **مع القطعة المثبَّتة** لا في المطلق: لا يوجد أفضل من الآخر
 * بذاته، بل أنسب لهذي الإطلالة ولهذا الذوق.
 */
export function compareItems(
  first: WardrobeItem,
  second: WardrobeItem,
  context: StylistContext,
): ComparisonVerdict | undefined {
  const anchor = context.anchor
  if (!anchor) return undefined

  const score = (item: WardrobeItem) => {
    const harmony = scoreColorHarmony(anchor.colorHex, item.colorHex).score
    const liked = context.declared.colors.some(
      (color) => color.name === readColor(item.colorHex).family,
    )
    const neutral = readColor(item.colorHex).neutral
    return harmony + (liked ? 0.2 : 0) + (neutral ? 0.05 : 0)
  }

  const firstScore = score(first)
  const secondScore = score(second)
  const winner = firstScore >= secondScore ? first : second
  const loser = winner === first ? second : first

  const reasons: string[] = []
  const winnerColor = readColor(winner.colorHex)

  reasons.push(`أقرب انسجامًا مع ${readColor(anchor.colorHex).family}`)
  if (context.declared.colors.some((color) => color.name === winnerColor.family)) {
    reasons.push('من ألوانك المفضّلة')
  }
  if (winnerColor.neutral) reasons.push('محايد فيبقي الإطلالة هادئة')

  return {
    winnerId: winner.id,
    // الفارق الصغير يُقال صغيرًا — ثقة مصطنعة تخفي أن الخيارين متكافئان
    confidence: Math.min(1, Math.abs(firstScore - secondScore) * 3),
    reasons: reasons.length > 0 ? reasons : [`${winnerColor.family} أنسب هنا من ${readColor(loser.colorHex).family}`],
  }
}
