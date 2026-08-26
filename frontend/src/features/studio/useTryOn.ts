import { useCallback, useRef, useState } from 'react'
import { buildTryOnRequest, toTryOnError, type BuildRequestInput } from '@/domain/outfit'
import { tryOnProvider } from '@/infrastructure/tryon'
import type { TryOnError, TryOnStageId, TryOnStatus, VirtualTryOnRequest, VirtualTryOnResult } from '@/domain/outfit'

export const STAGE_LABELS: { id: TryOnStageId; label: string }[] = [
  { id: 'analyze', label: 'نقرأ القطع المختارة' },
  { id: 'prepare', label: 'نجهّز موديلك' },
  { id: 'apply', label: 'نلبّس القطع' },
  { id: 'compose', label: 'نضبط التكوين' },
  { id: 'finalize', label: 'نجهّز الصورة' },
]

type State = {
  status: TryOnStatus
  stage?: TryOnStageId
  result?: VirtualTryOnResult
  error?: TryOnError
  request?: VirtualTryOnRequest
}

export function useTryOn() {
  const [state, setState] = useState<State>({ status: 'idle' })
  const controller = useRef<AbortController>(null)

  const cancel = useCallback(() => {
    controller.current?.abort()
    setState({ status: 'idle' })
  }, [])

  const run = useCallback(async (input: BuildRequestInput) => {
    controller.current?.abort()
    const ac = new AbortController()
    controller.current = ac

    try {
      setState({ status: 'processing' })
      const request = buildTryOnRequest(input)
      setState({ status: 'generating', stage: 'analyze', request })

      const result = await tryOnProvider.generateTryOn(
        request,
        (stage) => setState((s) => ({ ...s, stage })),
        ac.signal,
      )
      setState({ status: 'completed', result, request })
      return result
    } catch (err) {
      if (ac.signal.aborted) return undefined
      setState({ status: 'failed', error: toTryOnError(err) })
      return undefined
    }
  }, [])

  const reset = useCallback(() => setState({ status: 'idle' }), [])

  return { ...state, run, cancel, reset, provider: tryOnProvider }
}
