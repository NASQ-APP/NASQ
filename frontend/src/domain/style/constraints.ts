/**
 * القيود: ما لا تريد المستخدمة أن يُقترح عليها.
 *
 * **قاعدة حاكمة: القيد يُطبَّق على المؤكَّد فقط.** القطعة اللي ما نعرف طولها
 * أو قَصّتها تمرّ — لأن التخمين هنا يخفي نصف الخزانة بلا سبب، والخطأ في
 * الإخفاء أسوأ من الخطأ في العرض: المستخدمة تشوف القطعة وتتجاهلها، لكنها ما
 * تشوف اللي أخفيناه عنها.
 *
 * كل قاعدة هنا مربوطة بحقل حقيقي في القطعة. ما نضيف قيدًا بلا بيانات تسنده.
 */
import { NEUTRAL_COLOR_NAMES } from '@/domain/wardrobe'
import type { GarmentShape, WardrobeItem } from '@/domain/wardrobe'
import type { AvoidRule } from './types'

/** الأشكال التي تُلبس بأكمام طويلة — مرآة لقائمة الراسم. */
const LONG_SLEEVE: GarmentShape[] = [
  'shirt',
  'sweater',
  'hoodie',
  'jacket',
  'coat',
  'blazer',
  'abaya',
  'thobe',
  'blouse',
]

/** أشكال بلا أكمام بطبيعتها. */
const SLEEVELESS: GarmentShape[] = ['skirt', 'shorts', 'pants', 'jeans']

/**
 * هل تخالف القطعة قيدًا واحدًا؟
 * `false` تعني «تمرّ» — سواء كانت مطابقة للقيد أو **مجهولة**.
 */
function breaks(item: WardrobeItem, rule: AvoidRule): boolean {
  switch (rule) {
    /*
     * الطول: `WardrobeItem` في هذي النسخة ما فيها `length`، فما بقي إلا
     * الشكل القصير بطبيعته. والمجهول يمرّ — ما نخمّن طولًا ما نملكه.
     */
    case 'short':
      return item.shape === 'shorts'

    /*
     * القَصّة: ما لها إلا `fit`، وهو غير موجود في هذي النسخة — فالقيد
     * **معطَّل صراحةً** بدل ما يُخمَّن. تخمين القَصّة يخفي نصف الخزانة بلا
     * سند، وقاعدة الملف أن المجهول يمرّ. يُفعَّل يوم يدخل الحقل للقطعة.
     */
    case 'tight':
      return false

    /* الأكمام: الأشكال السفلية ما لها أكمام أصلًا فما ينطبق عليها القيد. */
    case 'sleeveless':
      // شكل مجهول = ما نعرف لها أكمام، فما نستبعدها
      if (!item.shape) return false
      return (
        !SLEEVELESS.includes(item.shape) &&
        !LONG_SLEEVE.includes(item.shape) &&
        item.shape !== 'dress'
      )

    /* اللون: معروف دائمًا، فالقيد دقيق. */
    case 'boldColor':
      return !NEUTRAL_COLOR_NAMES.includes(item.colorName)

    case 'heels':
      return item.shape === 'heels'
  }
}

/** هل تخالف القطعة أيًّا من القيود؟ */
export const violatesAvoid = (item: WardrobeItem, avoid: AvoidRule[]): boolean =>
  avoid.some((rule) => breaks(item, rule))

/**
 * يستبعد ما تخالف القيود.
 * يُستدعى **قبل** أي تركيب أو ترجيح: القيد يغيّر المجموعة، مب الترتيب.
 */
export const allowedItems = (items: WardrobeItem[], avoid: AvoidRule[]): WardrobeItem[] =>
  avoid.length === 0 ? items : items.filter((item) => !violatesAvoid(item, avoid))
