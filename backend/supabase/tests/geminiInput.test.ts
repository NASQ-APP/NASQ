/**
 * Gemini وشكل المدخلات — الحالة التي أوقفت التوليد على المستخدمة.
 *
 * قطعة مستوردة من متجر تُمرَّر برابطها الخارجي لا `data:`. Gemini يشترط
 * `inline_data` فيعتذر فورًا (صفر مللي، بلا نداء شبكة). السؤال الذي تحسمه
 * هذي الاختبارات: هل يتوقف الطلب هنا، أم ينتقل لمزوّد يقبل الروابط؟
 */
import { assertEquals, assertRejects } from 'jsr:@std/assert@1'
import { geminiImageProvider } from '../functions/_shared/imageProviders/gemini.ts'
import { ProviderError, isRetryable } from '../functions/_shared/imageProviders/types.ts'

const signal = () => AbortSignal.timeout(5_000)

Deno.test('Gemini + رابط خارجي → قابل للانتقال، وبلا نداء شبكة', async () => {
  let called = false
  const original = globalThis.fetch
  globalThis.fetch = () => {
    called = true
    return Promise.reject(new Error('should not be reached'))
  }

  try {
    const error = await assertRejects(
      () =>
        geminiImageProvider.generate({
          prompt: 'p',
          images: ['https://cdn.example.com/dress.jpg'],
          signal: signal(),
        }),
      ProviderError,
    )

    assertEquals(isRetryable(error), true, 'لازم ينتقل لمزوّد يقبل الروابط')
    assertEquals(error.code, 'provider-failure')
    assertEquals(called, false, 'يعتذر قبل الشبكة — لهذا كان attemptMs صفرًا')
  } finally {
    globalThis.fetch = original
  }
})

Deno.test('Gemini + data URL → يصل الشبكة (السلوك الطبيعي)', async () => {
  let reachedNetwork = false
  const original = globalThis.fetch
  globalThis.fetch = () => {
    reachedNetwork = true
    return Promise.resolve(new Response('{}', { status: 500 }))
  }

  try {
    await assertRejects(
      () =>
        geminiImageProvider.generate({
          prompt: 'p',
          images: ['data:image/png;base64,AAAA'],
          signal: signal(),
        }),
      ProviderError,
    )
    assertEquals(reachedNetwork, true, 'المدخل مقبول شكلاً، فالرفض يجي من الخدمة لا قبلها')
  } finally {
    globalThis.fetch = original
  }
})
