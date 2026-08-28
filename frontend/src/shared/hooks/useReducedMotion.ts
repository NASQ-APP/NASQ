/**
 * هل تفضّل المستخدمة تقليل الحركة؟
 *
 * الحركة تُطفأ لمن يطلبها في نظامه — ما هي تفصيلاً تجميليًا: الحركة تسبّب دوارًا
 * فعليًا لبعض الناس. نقرأ التفضيل بدل ما نفترضه.
 */
import { useMediaQuery } from './useMediaQuery'

export const useReducedMotion = (): boolean =>
  useMediaQuery('(prefers-reduced-motion: reduce)')
