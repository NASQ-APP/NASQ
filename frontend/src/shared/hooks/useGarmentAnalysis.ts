/**
 * تعبئة حقول القطعة من صورتها.
 *
 * مصدران يشتغلان معًا:
 * ١ — **اللون** يُقرأ في المتصفح، فيشتغل دائمًا بلا خادم ولا مفتاح.
 * ٢ — **الفئة والشكل والاسم** من مزوّد الرؤية خلف دالة الحافة، لو كان مفعّلاً.
 *
 * لو ما فيه مزوّد، اللون وحده يتعبّى والباقي ينتظر المستخدمة — ما نخترع فئة
 * ولا اسمًا (المبدأ ٤).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { toFieldSuggestion, type FieldSuggestion } from '@/domain/images'
import { analyzeGarment, readDominantColor } from '@/infrastructure/images'
import type { Gender } from '@/domain/wardrobe'

export type AnalysisStatus = 'idle' | 'reading' | 'done'

export type GarmentAnalysisApi = {
  status: AnalysisStatus
  suggestion?: FieldSuggestion
  /** هل جاء شي من مزوّد الرؤية، أو اللون المحلي وحده؟ */
  visionAvailable: boolean
  analyze: (image: Blob) => void
  clear: () => void
}

export function useGarmentAnalysis(
  gender: Gender,
  onSuggestion?: (suggestion: FieldSuggestion) => void,
): GarmentAnalysisApi {
  const [status, setStatus] = useState<AnalysisStatus>('idle')
  const [suggestion, setSuggestion] = useState<FieldSuggestion>()
  const [visionAvailable, setVisionAvailable] = useState(false)
  const inFlight = useRef<AbortController>(null)
  const notify = useRef(onSuggestion)

  useEffect(() => {
    notify.current = onSuggestion
  })

  const analyze = useCallback(
    (image: Blob) => {
      inFlight.current?.abort()
      const controller = new AbortController()
      inFlight.current = controller
      setStatus('reading')
      setSuggestion(undefined)

      // القراءتان تمشيان معًا — اللون ما ينتظر الشبكة
      void Promise.all([
        readDominantColor(image),
        analyzeGarment(image, controller.signal).catch(() => undefined),
      ])
        .then(([reading, analysis]) => {
          if (controller.signal.aborted) return

          const fromVision = analysis ? toFieldSuggestion(analysis, gender) : undefined
          setVisionAvailable(Boolean(fromVision?.filled.length))

          const merged: FieldSuggestion = fromVision ?? { filled: [] }
          // اللون المقروء محليًا يغلب لأنه من بكسلات الصورة نفسها
          if (reading) {
            merged.colorName = reading.color.name
            merged.colorHex = reading.color.hex
            if (!merged.filled.includes('colorName')) merged.filled.push('colorName')
          }

          if (merged.filled.length) {
            setSuggestion(merged)
            // التعبئة تصير هنا — نداء من وعد، مو من رسم ولا effect
            notify.current?.(merged)
          }
          setStatus('done')
        })
        .catch(() => {
          if (!controller.signal.aborted) setStatus('done')
        })
        .finally(() => {
          if (inFlight.current === controller) inFlight.current = null
        })
    },
    [gender],
  )

  const clear = useCallback(() => {
    inFlight.current?.abort()
    inFlight.current = null
    setStatus('idle')
    setSuggestion(undefined)
  }, [])

  useEffect(
    () => () => {
      inFlight.current?.abort()
    },
    [],
  )

  return { status, suggestion, visionAvailable, analyze, clear }
}
