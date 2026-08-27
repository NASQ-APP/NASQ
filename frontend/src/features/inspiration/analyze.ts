/**
 * قراءة اللوك من صورة الإلهام.
 *
 * الألوان نستخرجها محليًا من البكسلات وهي حقيقية. أما **تفكيك اللوك** —
 * «بليزر بيج + بنطلون أسود + شنطة بنية» — فيحتاج نموذج رؤية، وما فيه بديل
 * محلي صادق له. فالنسخة المحلية تقول ذلك صراحة بدل ما تخمّن، والمستخدمة
 * تدخل القطع بنفسها.
 *
 * الفاصل هنا نفس فاصل التلبيس: يوم يجهز الخادم، تُنفَّذ نسخة `backend` مقابل
 * `agent-chat` بلا ما تتغيّر أي شاشة.
 */
import { extractPalette } from './palette'
import type { ItemColor } from '@/domain/wardrobe'
import type { LookPiece } from '@/domain/style/types'

export type LookReading = {
  palette: ItemColor[]
  /** القطع التي تعرّفنا عليها — فاضية في النسخة المحلية */
  pieces: LookPiece[]
  /** يُعرض للمستخدمة: وش قرأناه ووش ما قدرنا نقرأه */
  notice: string
}

export type InspirationAnalyzer = {
  id: string
  /** هل يعرف يفكّك اللوك لقطع؟ الواجهة تقرأ هذا بدل ما تفترض. */
  detectsPieces: boolean
  read: (src: string) => Promise<LookReading>
}

/** المحلّل المرفق: ألوان فقط، وصادق في وصف حدوده. */
export const localAnalyzer: InspirationAnalyzer = {
  id: 'local-palette',
  detectsPieces: false,

  async read(src) {
    const palette = await extractPalette(src)
    return {
      palette,
      pieces: [],
      notice: palette.length
        ? 'قرأنا ألوان اللوك من الصورة. تحديد القطع نفسها يحتاج تحليل صورة في الخادم، فاكتبيها بنفسك تحت.'
        : 'ما قدرنا نقرأ ألوان الصورة. تقدرين تكتبين قطع اللوك بنفسك.',
    }
  },
}

export const inspirationAnalyzer: InspirationAnalyzer = localAnalyzer
