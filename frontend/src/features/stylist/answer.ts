/**
 * جسرٌ بين المحرّك الجديد والدرج القائم.
 *
 * الدرج يعرض `StylistAnswer` منذ البداية، والمحرّك يخرج `StylistOutfit`. وبدل
 * إعادة كتابة الواجهة — ومعها اختباراتها — يُترجَم المخرج هنا، وتُضاف الحقول
 * الجديدة **اختيارية** فتقرأها الواجهة المحدَّثة وتتجاهلها القديمة.
 *
 * والمنطق القديم (`suggest`) يبقى للأسئلة التي لا قطعة مثبَّتة فيها: هو يقرأ
 * نصّ السؤال، والمحرّك يقرأ السياق — ولكلٍّ مكانه حتى يصل استخراج النيّة
 * اللغوي من الخادم.
 */
import { buildOutfits, TONE_TITLE, type StylistOutfit } from './recommendations/stylistEngine'
import { buildStylistContext, type StylistOccasion } from './context/stylistContext'
import { unenforceable } from './scoring/constraints'
import { AVOID_RULES, type DeclaredStyle } from '@/domain/style/types'
import type { OutfitPalette } from './colors/colorPalette'
import type { UserStyleProfile } from '@/domain/style/types'
import type { StylistAnswer, StylistLook } from './suggest'
import type { WardrobeItem } from '@/domain/wardrobe'

/** إطلالة الدرج، مع ما يعرفه المحرّك عنها. */
export type RichLook = StylistLook & {
  palette?: OutfitPalette
  toneTitle?: string
  gapNote?: string
}

export type RichAnswer = Omit<StylistAnswer, 'looks'> & {
  looks: RichLook[]
  /** قيود صرّحت بها ولا نقدر على فرضها — تُقال ولا تُخفى */
  unenforcedNote?: string
  /**
   * تعذّر الفهم — والإعادة قد تنجح.
   *
   * تفرّق بين «ما فهمت» و«ما عندك قطع»: الأولى تُعاد، والثانية تحتاج فعلاً
   * منها. وعرض «إعادة المحاولة» على الثانية يجعلها تكرّر ما لن يتغيّر.
   */
  retryable?: boolean
}

const SLOT_NAME: Record<string, string> = {
  shoes: 'حذاء',
  top: 'قطعة علوية',
  bottom: 'قطعة سفلية',
  bag: 'حقيبة',
  outer: 'قطعة خارجية',
}

const toLook = (outfit: StylistOutfit): RichLook => ({
  title: TONE_TITLE[outfit.tone],
  reason: outfit.why,
  itemIds: outfit.itemIds,
  palette: outfit.palette,
  toneTitle: TONE_TITLE[outfit.tone],
  gapNote:
    outfit.gaps.length > 0
      ? `ما لقينا ${SLOT_NAME[outfit.gaps[0].slot] ?? 'قطعة'} مناسبًا في خزانتك${
          outfit.gaps[0].colors.length > 0 ? ` — جرّبي ${outfit.gaps[0].colors.join(' أو ')}` : ''
        }.`
      : undefined,
})

/**
 * التنسيق حول قطعة — المسار الذي يستعمل المحرّك كاملاً.
 *
 * يُنادى حين تكون هناك قطعة مثبَّتة، وهو أوثق مدخل عندنا: الاختيار فعلٌ صريح
 * لا تفسيرَ نصّ.
 */
export function styleAroundItem(input: {
  anchor: WardrobeItem
  wardrobe: WardrobeItem[]
  declared: DeclaredStyle
  observed: UserStyleProfile
  occasion?: StylistOccasion
}): RichAnswer {
  const context = buildStylistContext({
    declared: input.declared,
    observed: input.observed,
    wardrobe: input.wardrobe,
    anchor: input.anchor,
    occasion: input.occasion,
  })

  const outfits = buildOutfits(context)
  const looks = outfits.map(toLook)

  /*
    القيود غير المطبَّقة تُقال مرة واحدة تحت النتيجة.

    الصمت عنها يترك المستخدمة تظن أن «أتجنّب الضيّق» مطبَّق، فتثق باقتراح لم
    يُفحص. والقول يحفظ الثقة ويشرح ما ينقص بياناتنا.
  */
  const missing = unenforceable(input.declared.avoid)
  const unenforcedNote =
    missing.length > 0
      ? `ما نقدر نفحص ${missing
          .map((rule) => AVOID_RULES.find((entry) => entry.id === rule)?.name ?? rule)
          .join(' و')} — ما عندنا هذي التفاصيل في القطع.`
      : undefined

  return {
    message: looks.length
      ? `ثبتنا «${input.anchor.name}» وبنينا حولها.`
      : `ما لقينا في خزانتك ما ينسّق مع «${input.anchor.name}».`,
    looks,
    pieces: [],
    gap: looks.length ? undefined : 'ينقصك قطعة أساسية أو حذاء بلون متناسق.',
    unenforcedNote,
  }
}
