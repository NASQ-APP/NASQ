import { useEffect, useState } from 'react'

/**
 * يدير دخول وخروج الطبقات (المودال، الدرج) بحركة CSS خالصة.
 *
 * ليش يدويًا: `AnimatePresence` في framer-motion 13 ما يزيل العنصر بعد انتهاء
 * حركة الخروج داخل portal مع React 19، فيبقى الحاجب فوق الصفحة ويحجب الضغط
 * على كل شي تحته. هذا الهوك يملك دورة الحياة بنفسه، فالنتيجة صحيحة وأخف.
 *
 * - `mounted` — هل نرسم العنصر أصلاً؟ (يبقى `true` أثناء الخروج)
 * - `entered` — هل وصل حالته النهائية؟ (يقود كلاسات الحركة)
 */
export function useOverlayTransition(open: boolean, durationMs = 320) {
  const [closing, setClosing] = useState(false)
  const [entered, setEntered] = useState(false)
  const [previousOpen, setPreviousOpen] = useState(open)

  // اشتقاق الحالة أثناء الرسم — النمط الموصى به لمزامنة حالة مع prop متغيّر
  if (previousOpen !== open) {
    setPreviousOpen(open)
    if (!open) {
      setClosing(true)
      setEntered(false)
    }
  }

  // إطار واحد قبل تفعيل الحالة النهائية، عشان تشتغل حركة الدخول
  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [open])

  // إزالة العنصر بعد انتهاء حركة الخروج
  useEffect(() => {
    if (!closing) return
    const timer = setTimeout(() => setClosing(false), durationMs)
    return () => clearTimeout(timer)
  }, [closing, durationMs])

  return { mounted: open || closing, entered: open && entered }
}
