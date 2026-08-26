import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ImageProcessingError, removeBackgroundOnServer } from './backgroundRemoval'

const png = () => new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const imageResponse = (bytes: number[], type = 'image/png') =>
  new Response(new Blob([new Uint8Array(bytes)], { type }), { status: 200 })

describe('removeBackgroundOnServer', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('ترسل الصورة كـFormData وترجّع النتيجة كـBlob', async () => {
    const fetchMock = vi.fn().mockResolvedValue(imageResponse([9, 9, 9]))
    vi.stubGlobal('fetch', fetchMock)

    const result = await removeBackgroundOnServer(png())

    expect(result.type).toBe('image/png')
    expect(result.size).toBe(3)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/images-remove-background')
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(FormData)
    expect((init.body as FormData).get('image')).toBeInstanceOf(Blob)
  })

  it('ما ترسل أي مفتاح للمزوّد من المتصفح', async () => {
    const fetchMock = vi.fn().mockResolvedValue(imageResponse([1]))
    vi.stubGlobal('fetch', fetchMock)

    await removeBackgroundOnServer(png())

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = JSON.stringify(init.headers ?? {}).toLowerCase()
    expect(headers).not.toContain('x-api-key')
    expect(headers).not.toContain('authorization')
  })

  it('تترجم رمز الخادم لرسالة عربية تسمح بالاحتفاظ بالأصلية', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(503, { code: 'not-configured' })))

    await expect(removeBackgroundOnServer(png())).rejects.toMatchObject({
      detail: { code: 'removal-unavailable', canKeepOriginal: true },
    })
  })

  it('ترجّع رمز «ما فيه قطعة واضحة» لما يفشل التمييز', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(422, { code: 'no-subject' })))

    await expect(removeBackgroundOnServer(png())).rejects.toMatchObject({
      detail: { code: 'removal-empty' },
    })
  })

  it('تعتبر الرد الفاضي فشلاً بدل ما تحفظ صورة فاضية', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse([])))

    await expect(removeBackgroundOnServer(png())).rejects.toMatchObject({
      detail: { code: 'removal-empty' },
    })
  })

  it('تعتبر الرد غير الصوري فشلاً', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok', { status: 200 })))

    await expect(removeBackgroundOnServer(png())).rejects.toBeInstanceOf(ImageProcessingError)
  })

  it('تحوّل انقطاع الشبكة لرسالة مفهومة', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(removeBackgroundOnServer(png())).rejects.toMatchObject({
      detail: { code: 'removal-failed', canKeepOriginal: true },
    })
  })

  it('تحترم الإلغاء وترمي AbortError بدون تحويله', async () => {
    const controller = new AbortController()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        () =>
          new Promise((_resolve, reject) => {
            controller.signal.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            )
          }),
      ),
    )

    const pending = removeBackgroundOnServer(png(), controller.signal)
    controller.abort()

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('removeImageBackground — اختيار المزوّد', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('الوضع الافتراضي محلي: ما يلمس الشبكة أبدًا', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { removeImageBackground } = await import('./backgroundRemoval')
    // بلا canvas في بيئة node، فالمعالجة المحلية تفشل — والمهم إنها ما نادت الشبكة
    await expect(removeImageBackground(png())).rejects.toBeDefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
