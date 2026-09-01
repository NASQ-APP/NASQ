/**
 * سلوك راوتر المزوّدين — بمزوّدين محقونين، بلا أي نداء حقيقي ولا رصيد.
 *
 * خارج مجلد `functions/` عمدًا: ما بداخله يُحزَم مع الدالة عند النشر، واختبار
 * لا مكان له في الإنتاج.
 *
 * التشغيل: `npx deno@latest test --allow-env backend/supabase/tests/`
 */
import { assertEquals, assertRejects } from 'jsr:@std/assert@1'
import {
  ProviderError,
  generateImage,
  providersInOrder,
} from '../functions/_shared/imageProviders/index.ts'
import type { ImageGenerationProvider } from '../functions/_shared/imageProviders/types.ts'

const input = { prompt: 'p', images: ['data:image/png;base64,AA'], signal: AbortSignal.timeout(5_000) }

/** مزوّد مزيّف: ينجح أو يرمي خطأً مصنَّفًا، ويعدّ محاولاته. */
function stub(
  id: 'fal' | 'gemini' | 'openrouter',
  behaviour: 'ok' | ProviderError,
): ImageGenerationProvider & { calls: number } {
  const provider = {
    id,
    calls: 0,
    isConfigured: () => true,
    generate() {
      provider.calls++
      if (behaviour === 'ok') return Promise.resolve({ image: `data:image/png;base64,${id}` })
      return Promise.reject(behaviour)
    },
  }
  return provider
}

const retryable = (code: string, status: number) => new ProviderError(code, 'x', status, true)
const terminal = (code: string, status: number) => new ProviderError(code, 'x', status, false)

Deno.test('E · خطأ طلب (٤٢٢) يتوقف ولا ينتقل لمزوّد ثانٍ', async () => {
  const first = stub('fal', terminal('blocked', 422))
  const second = stub('gemini', 'ok')

  await assertRejects(() => generateImage(input, [first, second]), ProviderError)

  assertEquals(first.calls, 1)
  assertEquals(second.calls, 0, 'الثاني يرفضه بنفس السبب — محاولته تحرق رصيدًا بلا فائدة')
})

Deno.test('F · خطأ عابر (٤٢٩) ينتقل للمزوّد التالي', async () => {
  const first = stub('fal', retryable('rate-limited', 429))
  const second = stub('gemini', 'ok')

  const outcome = await generateImage(input, [first, second])

  assertEquals(first.calls, 1)
  assertEquals(second.calls, 1)
  assertEquals(outcome.provider, 'gemini')
  assertEquals(outcome.usedFallback, true)
})

Deno.test('F · الرصيد والمهلة و٥xx كلها تنتقل', async () => {
  for (const error of [retryable('no-credit', 402), retryable('timeout', 504), retryable('x', 503)]) {
    const first = stub('fal', error)
    const second = stub('openrouter', 'ok')
    const outcome = await generateImage(input, [first, second])
    assertEquals(outcome.provider, 'openrouter')
  }
})

Deno.test('محاولة واحدة لكل مزوّد — لا إعادة على نفسه', async () => {
  const only = stub('fal', retryable('rate-limited', 429))
  await assertRejects(() => generateImage(input, [only]), ProviderError)
  assertEquals(only.calls, 1)
})

Deno.test('G · لا مزوّد مهيّأ → خطأ واضح بلا كشف أسرار', async () => {
  const error = await assertRejects(() => generateImage(input, []), ProviderError)

  assertEquals(error.status, 503)
  assertEquals(error.code, 'not-configured')

  // الرسالة للمستخدمة: لا اسم متغيّر ولا مزوّد ولا قيمة
  const message = error.message
  for (const leak of ['KEY', 'SECRET', 'FAL', 'GEMINI', 'OPENROUTER', 'sk-', 'AIza']) {
    assertEquals(message.includes(leak), false, `الرسالة تسرّب «${leak}»`)
  }
})

Deno.test('غير المهيّأ يُسقَط قبل أي محاولة', () => {
  const configured = providersInOrder({
    fal: { ...stub('fal', 'ok'), isConfigured: () => false },
    gemini: stub('gemini', 'ok'),
    openrouter: stub('openrouter', 'ok'),
  })

  assertEquals(
    configured.map((provider) => provider.id).includes('fal'),
    false,
    'مزوّد بلا مفتاح ما يستهلك محاولة',
  )
})
