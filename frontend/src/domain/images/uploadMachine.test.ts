import { describe, expect, it } from 'vitest'
import { imageError } from './types'
import {
  canConfirm,
  initialUploadState,
  selectedCandidate,
  uploadReducer,
  type ImageCandidate,
  type UploadState,
} from './uploadMachine'

const candidate = (name: string, transparent = false): ImageCandidate => ({
  blob: new Blob(['x'], { type: transparent ? 'image/png' : 'image/jpeg' }),
  fileName: name,
  transparent,
})

const select = (state: UploadState, name = 'a.jpg', removeBackground = true) =>
  uploadReducer(state, {
    type: 'select',
    requestId: state.requestId + 1,
    original: candidate(name),
    removeBackground,
  })

describe('uploadReducer', () => {
  it('يبدأ المعالجة عند اختيار صورة مع إزالة الخلفية', () => {
    const state = select(initialUploadState)
    expect(state.status).toBe('processing')
    expect(state.original?.fileName).toBe('a.jpg')
    expect(state.requestId).toBe(1)
  })

  it('يتخطّى المعالجة لما تكون إزالة الخلفية مطفأة', () => {
    const state = select(initialUploadState, 'me.jpg', false)
    expect(state.status).toBe('ready')
    expect(state.chosen).toBe('original')
  })

  it('يعرض النسخة المنقّاة بعد نجاح المعالجة', () => {
    const processing = select(initialUploadState)
    const ready = uploadReducer(processing, {
      type: 'processed',
      requestId: processing.requestId,
      processed: candidate('a.png', true),
    })
    expect(ready.status).toBe('ready')
    expect(ready.chosen).toBe('processed')
    expect(selectedCandidate(ready)?.transparent).toBe(true)
  })

  it('يرجع للأصلية عند فشل المعالجة', () => {
    const processing = select(initialUploadState)
    const failed = uploadReducer(processing, {
      type: 'failed',
      requestId: processing.requestId,
      error: imageError('removal-failed'),
    })
    expect(failed.status).toBe('failed')
    expect(failed.chosen).toBe('original')
    expect(failed.error?.canKeepOriginal).toBe(true)
    expect(selectedCandidate(failed)?.fileName).toBe('a.jpg')
  })

  it('يتجاهل نتيجة طلب قديم بعد اختيار صورة ثانية', () => {
    const first = select(initialUploadState, 'first.jpg')
    const second = select(first, 'second.jpg')

    const stale = uploadReducer(second, {
      type: 'processed',
      requestId: first.requestId,
      processed: candidate('stale.png', true),
    })

    expect(stale).toBe(second)
    expect(stale.status).toBe('processing')
    expect(stale.original?.fileName).toBe('second.jpg')
  })

  it('يتجاهل فشل طلب قديم كذلك', () => {
    const first = select(initialUploadState, 'first.jpg')
    const second = select(first, 'second.jpg')
    const stale = uploadReducer(second, {
      type: 'failed',
      requestId: first.requestId,
      error: imageError('removal-timeout'),
    })
    expect(stale.status).toBe('processing')
    expect(stale.error).toBeUndefined()
  })

  it('إعادة المحاولة تبدأ طلبًا جديدًا بمعرّف أحدث', () => {
    const processing = select(initialUploadState)
    const failed = uploadReducer(processing, {
      type: 'failed',
      requestId: processing.requestId,
      error: imageError('removal-timeout'),
    })
    const retried = uploadReducer(failed, { type: 'retry', requestId: failed.requestId + 1 })

    expect(retried.status).toBe('processing')
    expect(retried.requestId).toBe(failed.requestId + 1)
    expect(retried.error).toBeUndefined()
    expect(retried.original?.fileName).toBe('a.jpg')
  })

  it('تقدر المستخدمة تختار الاحتفاظ بالصورة الأصلية', () => {
    const processing = select(initialUploadState)
    const ready = uploadReducer(processing, {
      type: 'processed',
      requestId: processing.requestId,
      processed: candidate('a.png', true),
    })
    const keepOriginal = uploadReducer(ready, { type: 'choose', version: 'original' })

    expect(keepOriginal.chosen).toBe('original')
    expect(selectedCandidate(keepOriginal)?.fileName).toBe('a.jpg')
  })

  it('ما تقدر تختار نسخة منقّاة غير موجودة', () => {
    const processing = select(initialUploadState)
    const failed = uploadReducer(processing, {
      type: 'failed',
      requestId: processing.requestId,
      error: imageError('removal-empty'),
    })
    expect(uploadReducer(failed, { type: 'choose', version: 'processed' })).toBe(failed)
  })

  it('ما فيه صورة جاهزة للحفظ أثناء المعالجة', () => {
    const processing = select(initialUploadState)
    expect(selectedCandidate(processing)).toBeUndefined()
    expect(canConfirm(processing)).toBe(false)
  })

  it('الإلغاء يرجّع الحالة للبداية ويبطل الطلب الجاري', () => {
    const processing = select(initialUploadState)
    const reset = uploadReducer(processing, { type: 'reset' })

    expect(reset.status).toBe('idle')
    expect(reset.original).toBeUndefined()
    expect(canConfirm(reset)).toBe(false)
    // نتيجة الطلب الملغى ما تعيد فتح الحالة
    const late = uploadReducer(reset, {
      type: 'processed',
      requestId: processing.requestId,
      processed: candidate('late.png', true),
    })
    expect(late.status).toBe('idle')
  })
})
