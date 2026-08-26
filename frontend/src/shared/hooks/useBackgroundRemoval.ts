/**
 * وصلة بين آلة رفع الصورة والخدمة المركزية لإزالة الخلفية.
 *
 * مسؤولياتها الثلاث فقط: تشغيل الطلب، إلغاء الطلب القديم عند اختيار صورة
 * جديدة، وتنظيف روابط الكائن حتى ما يتسرّب شي من الذاكرة.
 * كل قرارات الحالة في `uploadReducer` — نقية ومُختبَرة بلا DOM.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  imageError,
  initialUploadState,
  selectedCandidate,
  uploadReducer,
  validateImageFile,
  type ImageCandidate,
  type ImageError,
  type UploadState,
  type ValidationOptions,
} from '@/domain/images'
import {
  ImageProcessingError,
  prepareForUpload,
  removeImageBackground,
} from '@/infrastructure/images'

export type BackgroundRemovalOptions = ValidationOptions & {
  /** إيقافها لصور لا تحتاج معالجة — مثل الصورة الشخصية */
  enabled?: boolean
  onError?: (error: ImageError) => void
}

export type BackgroundRemovalApi = {
  state: UploadState
  /** روابط عرض جاهزة، تُنشأ وتُلغى مع تغيّر الصور */
  originalUrl?: string
  processedUrl?: string
  /** الصورة اللي راح تُحفظ لو وافقت المستخدمة الآن */
  selected?: ImageCandidate
  select: (file: File) => void
  retry: () => void
  choose: (version: 'processed' | 'original') => void
  reset: () => void
}

type PreviewUrls = { original?: string; processed?: string }

const isAbort = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError'

const toDetail = (error: unknown, fallback: Parameters<typeof imageError>[0]): ImageError =>
  error instanceof ImageProcessingError ? error.detail : imageError(fallback)

export function useBackgroundRemoval({
  enabled = true,
  onError,
  acceptedTypes,
  maxBytes,
}: BackgroundRemovalOptions = {}): BackgroundRemovalApi {
  const [state, dispatch] = useReducer(uploadReducer, initialUploadState)
  const [urls, setUrls] = useState<PreviewUrls>({})

  const inFlight = useRef<AbortController>(null)
  /** عدّاد الطلبات — مصدر واحد للمعرّف، تقرأه الآلة من الحدث. */
  const requestSeq = useRef(0)
  /** كل الروابط الحيّة — تُقرأ في المعالجات والتفكيك فقط، ما تُلمس أثناء الرسم */
  const liveUrls = useRef<string[]>([])
  const errorHandler = useRef(onError)

  useEffect(() => {
    errorHandler.current = onError
  })

  const trackUrl = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob)
    liveUrls.current.push(url)
    return url
  }, [])

  const revokeAll = useCallback(() => {
    for (const url of liveUrls.current) URL.revokeObjectURL(url)
    liveUrls.current = []
  }, [])

  const abortInFlight = useCallback(() => {
    inFlight.current?.abort()
    inFlight.current = null
  }, [])

  const failWith = useCallback((requestId: number, detail: ImageError) => {
    errorHandler.current?.(detail)
    dispatch({ type: 'failed', requestId, error: detail })
  }, [])

  /** يشغّل الطلب ويحدّث الحالة — يُنادى من معالجات الأحداث، مو من الرسم. */
  const run = useCallback(
    async (source: Blob, fileName: string, requestId: number) => {
      abortInFlight()
      const controller = new AbortController()
      inFlight.current = controller

      try {
        const processed = await removeImageBackground(source, controller.signal)
        setUrls((previous) => ({ ...previous, processed: trackUrl(processed) }))
        // الاسم يورَّث من الملف الأصلي — تُقترح منه تسمية القطعة في المراجعة
        dispatch({
          type: 'processed',
          requestId,
          processed: { blob: processed, fileName, transparent: true },
        })
      } catch (error) {
        if (isAbort(error)) return
        failWith(requestId, toDetail(error, 'removal-failed'))
      } finally {
        if (inFlight.current === controller) inFlight.current = null
      }
    },
    [abortInFlight, failWith, trackUrl],
  )

  const process = useCallback(
    (blob: Blob, fileName: string, requestId: number) => {
      const asFile = blob instanceof File ? blob : new File([blob], fileName || 'image')
      void prepareForUpload(asFile)
        .then((source) => run(source, fileName, requestId))
        .catch((error: unknown) => {
          if (isAbort(error)) return
          failWith(requestId, toDetail(error, 'unreadable'))
        })
    },
    [failWith, run],
  )

  const select = useCallback(
    (file: File) => {
      abortInFlight()

      const invalid = validateImageFile(file, { acceptedTypes, maxBytes })
      if (invalid) {
        errorHandler.current?.(invalid)
        return
      }

      // صورة جديدة تُلغي كل ما سبق: الطلب والروابط والحالة
      revokeAll()
      setUrls({ original: trackUrl(file) })

      const requestId = ++requestSeq.current
      dispatch({
        type: 'select',
        requestId,
        original: { blob: file, fileName: file.name, transparent: false },
        removeBackground: enabled,
      })

      if (enabled) process(file, file.name, requestId)
    },
    [abortInFlight, acceptedTypes, enabled, maxBytes, process, revokeAll, trackUrl],
  )

  const retry = useCallback(() => {
    const original = state.original
    if (!original) return

    setUrls((previous) => ({ original: previous.original }))
    const requestId = ++requestSeq.current
    dispatch({ type: 'retry', requestId })
    process(original.blob, original.fileName, requestId)
  }, [process, state.original])

  const reset = useCallback(() => {
    requestSeq.current += 1
    abortInFlight()
    revokeAll()
    setUrls({})
    dispatch({ type: 'reset' })
  }, [abortInFlight, revokeAll])

  const choose = useCallback(
    (version: 'processed' | 'original') => dispatch({ type: 'choose', version }),
    [],
  )

  // تفكيك المكوّن أثناء المعالجة: نلغي الطلب وننظّف كل الروابط
  useEffect(
    () => () => {
      inFlight.current?.abort()
      for (const url of liveUrls.current) URL.revokeObjectURL(url)
      liveUrls.current = []
    },
    [],
  )

  const selected = useMemo(() => selectedCandidate(state), [state])

  return {
    state,
    originalUrl: urls.original,
    processedUrl: state.processed ? urls.processed : undefined,
    selected,
    select,
    retry,
    choose,
    reset,
  }
}
