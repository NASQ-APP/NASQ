/**
 * الانسجام اللوني — **إرشاد مرتَّب، لا قانون**.
 *
 * عجلة الألوان تقول أي العلاقات أسلم إحصائيًا، ولا تقول ما يحبّه إنسان بعينه.
 * فمخرج هذا الملف **رقم ترتيب** يدخل ضمن عوامل أخرى (القيود، الذوق، السياق)،
 * ولا يقرّر وحده. القيد الصريح يسبقه دائمًا، وتفضيل المستخدمة يعلو عليه.
 *
 * والعلاقات تُقاس بالمسافة الزاوية على العجلة:
 *
 *     ٠°────٢٠°────٥٠°──────────١٠٠°────١٤٠°────١٦٥°────١٨٠°
 *     أحادي  متجاور    متوازن       ثلاثي   منقسم   متكامل
 */
import { hueDistance, readColor, type ColorProfile } from './colorSpace'

export type ColorRelation =
  | 'monochromatic'
  | 'analogous'
  | 'complementary'
  | 'split-complementary'
  | 'triadic'
  | 'neutral'
  | 'balanced'

export type HarmonyVerdict = {
  /** صفر إلى واحد — ترتيبٌ لا حكم */
  score: number
  relation: ColorRelation
  /** جملة عربية قصيرة تُعرض للمستخدمة كما هي */
  explanation: string
}

const RELATION_BASE: Record<ColorRelation, number> = {
  neutral: 0.86,
  monochromatic: 0.9,
  analogous: 0.84,
  complementary: 0.78,
  'split-complementary': 0.8,
  triadic: 0.72,
  // ما بين المجالات — لا متجاور فيهدأ ولا متقابل فيتباين
  balanced: 0.45,
}

/** المجال الزاوي لكل علاقة، بالترتيب من الأضيق. */
function relationOf(distance: number): ColorRelation {
  if (distance <= 20) return 'monochromatic'
  if (distance <= 50) return 'analogous'
  if (distance < 100) return 'balanced'
  if (distance < 140) return 'triadic'
  if (distance < 165) return 'split-complementary'
  return 'complementary'
}

const RELATION_WORD: Record<ColorRelation, string> = {
  monochromatic: 'درجتان من لون واحد',
  analogous: 'لونان متجاوران',
  complementary: 'لونان متقابلان',
  'split-complementary': 'تقابل مخفَّف',
  triadic: 'ثلاثيّ متباعد',
  neutral: 'محايد يسند اللون',
  balanced: 'لونان متباعدان بلا علاقة قوية',
}

/**
 * تعديلات تُقرّب الحساب من العين.
 *
 * العلاقة الزاوية وحدها تكذب أحيانًا: لونان متكاملان مشبَعان تمامًا يتصارعان
 * ولا ينسجمان، ولونان متباعدان بنفس السطوع يذوبان في بعضهما فتضيع القطعتان.
 */
function adjust(anchor: ColorProfile, candidate: ColorProfile, relation: ColorRelation): {
  delta: number
  notes: string[]
} {
  const notes: string[] = []
  let delta = 0

  const bothVivid = anchor.saturation > 0.62 && candidate.saturation > 0.62
  const contrastRelation = relation === 'complementary' || relation === 'triadic'

  if (bothVivid && contrastRelation) {
    // تقابلٌ بين مشبَعين يتنازع على النظر — يخفّ لو هدأ أحدهما
    delta -= 0.22
    notes.push('اللونان قويان معًا')
  }

  const valueGap = Math.abs(anchor.lightness - candidate.lightness)
  if (valueGap < 0.1 && relation !== 'monochromatic' && !anchor.neutral && !candidate.neutral) {
    // بنفس السطوع تذوب القطعتان في بعضهما ويضيع حدّهما
    delta -= 0.12
    notes.push('السطوع متقارب')
  }

  /*
    الأحادي يحتاج فرق سطوع ليُقرأ درجتين لا لطخة واحدة. وهذا ما يجعل «كل شيء
    عنّابي» يبدو إطلالة مقصودة أو خطأً في الغسيل.
  */
  if (relation === 'monochromatic' && valueGap > 0.18) {
    delta += 0.06
    notes.push('فرق الدرجة يوضّح الطبقات')
  }

  if (relation === 'analogous' && anchor.temperature === candidate.temperature) {
    delta += 0.04
  }

  return { delta, notes }
}

/**
 * يقيس علاقة لونين ويشرحها.
 *
 * المحايد يُحسم أولاً: الأسود والكريمي والكحلي تسند أي لون، وقياس زاويتها بلا
 * معنى — تشبّعها قريب من الصفر فزاويتها ضجيج.
 */
export function scoreColorHarmony(anchorHex: string, candidateHex: string): HarmonyVerdict {
  const anchor = readColor(anchorHex)
  const candidate = readColor(candidateHex)

  if (anchor.neutral && candidate.neutral) {
    return {
      score: 0.82,
      relation: 'neutral',
      explanation: 'محايدان معًا — أهدأ تركيبة وأسلمها.',
    }
  }

  if (anchor.neutral || candidate.neutral) {
    const colored = anchor.neutral ? candidate : anchor
    const plain = anchor.neutral ? anchor : candidate
    return {
      score: RELATION_BASE.neutral,
      relation: 'neutral',
      explanation: `${plain.family} يسند ${colored.family} بلا منافسة.`,
    }
  }

  const distance = hueDistance(anchor.hue, candidate.hue)
  const relation = relationOf(distance)
  const { delta, notes } = adjust(anchor, candidate, relation)

  const score = Math.max(0, Math.min(1, RELATION_BASE[relation] + delta))
  const explanation = [
    `${anchor.family} و${candidate.family}: ${RELATION_WORD[relation]}`,
    ...notes,
  ].join(' · ')

  return { score, relation, explanation }
}
