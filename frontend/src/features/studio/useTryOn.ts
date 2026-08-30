/**
 * حالة التجربة الافتراضية في الاستوديو.
 *
 * الصفحة تنادي `run` و`replace` وتقرأ `result` و`stage` — ولا تعرف مزوّدًا ولا
 * برومبت. كل نداء يُلغي سابقه، فالضغط المتكرر ما يترك طلبات معلّقة تتسابق على
 * الحالة.
 *
 * النتيجة **تُرجَع** مع الخطأ لا تُبتلع: الفشل الصامت يترك المستخدمة تضغط بلا
 * ما تعرف وش صار.
 */
import { useCallback, useRef, useState } from 'react'
import { aiImageProvider } from '@/infrastructure/ai'
import { toTryOnError } from '@/domain/tryon'
import type {
  BodyParameters,
  GarmentReference,
  ImageReference,
  ImageResult,
  TryOnError,
  TryOnStage,
} from '@/domain/tryon'

type Status = 'idle' | 'working' | 'done' | 'failed'

export type RunOutcome = { result?: ImageResult; error?: TryOnError }

type State = {
  status: Status
  stage?: TryOnStage
  result?: ImageResult
  error?: TryOnError
}

export function useTryOn() {
  const [state, setState] = useState<State>({ status: 'idle' })
  const controller = useRef<AbortController | null>(null)

  /** يلفّ أي عملية بنفس دورة الحالة — بلا تكرار في خمس دوال. */
  const perform = useCallback(
    async (work: (onStage: (s: TryOnStage) => void, signal: AbortSignal) => Promise<ImageResult>) => {
      controller.current?.abort()
      const ac = new AbortController()
      controller.current = ac

      setState({ status: 'working', stage: 'model' })

      try {
        const result = await work((stage) => setState((s) => ({ ...s, stage })), ac.signal)
        if (ac.signal.aborted) return {}
        setState({ status: 'done', result })
        return { result }
      } catch (raw) {
        if (ac.signal.aborted) return {}
        const error = toTryOnError(raw)
        setState({ status: 'failed', error })
        return { error }
      }
    },
    [],
  )

  const run = useCallback(
    (input: {
      personImage: ImageReference
      garments: GarmentReference[]
      bodyParameters?: BodyParameters
      instruction?: string
    }): Promise<RunOutcome> =>
      perform((onStage, signal) => aiImageProvider.generateTryOn(input, onStage, signal)),
    [perform],
  )

  const replace = useCallback(
    (input: {
      currentLook: ImageReference
      garment: GarmentReference
      keep: GarmentReference[]
    }): Promise<RunOutcome> =>
      perform((onStage, signal) => aiImageProvider.replaceGarment(input, onStage, signal)),
    [perform],
  )

  const remove = useCallback(
    (input: {
      currentLook: ImageReference
      garment: GarmentReference
      keep: GarmentReference[]
    }): Promise<RunOutcome> =>
      perform((onStage, signal) => aiImageProvider.removeGarment(input, onStage, signal)),
    [perform],
  )

  const regenerate = useCallback(
    (input: {
      personImage: ImageReference
      garments: GarmentReference[]
      previousLook?: ImageReference
      bodyParameters?: BodyParameters
      instruction?: string
    }): Promise<RunOutcome> =>
      perform((onStage, signal) => aiImageProvider.regenerateLook(input, onStage, signal)),
    [perform],
  )

  const adaptModel = useCallback(
    (input: {
      baseImage: ImageReference
      bodyParameters: BodyParameters
      refinement?: string
    }): Promise<RunOutcome> =>
      perform((onStage, signal) => aiImageProvider.adaptModel(input, onStage, signal)),
    [perform],
  )

  const cancel = useCallback(() => {
    controller.current?.abort()
    setState({ status: 'idle' })
  }, [])

  const reset = useCallback(() => setState({ status: 'idle' }), [])

  return { ...state, run, replace, remove, regenerate, adaptModel, cancel, reset }
}
