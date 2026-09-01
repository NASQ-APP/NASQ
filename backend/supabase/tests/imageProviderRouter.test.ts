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
  providersForOperation,
  providersInOrder,
} from '../functions/_shared/imageProviders/index.ts'
import { contentRefusal, unsupportedInput } from '../functions/_shared/imageProviders/types.ts'
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

Deno.test('شكل مدخلات لا يقبله مزوّد → ينتقل للتالي', () => {
  /*
    القطعة المستوردة من متجر تُمرَّر برابطها لا بـ`data:`. Gemini يشترط
    `data:` وfal يقبل الروابط — فالحالة قابلة للانتقال لا رفضًا نهائيًا.
    كانت مصنَّفة رفض محتوى، فتقتل الطلب قبل أن يصل fal.
  */
  assertEquals(unsupportedInput().retryable, true)
})

Deno.test('Gemini يرفض الرابط الخارجي → fal يكمل وينجح', async () => {
  // مسار المستخدمة كاملاً: قطعة من متجر، Gemini أولاً، fal ثانيًا.
  const gemini = stub('gemini', unsupportedInput())
  const fal = stub('fal', 'ok')

  const outcome = await generateImage(input, [gemini, fal])

  assertEquals(gemini.calls, 1)
  assertEquals(fal.calls, 1)
  assertEquals(outcome.provider, 'fal')
  assertEquals(outcome.usedFallback, true)
})

Deno.test('نجاح المزوّد الأول → لا يُستدعى ثانٍ', async () => {
  const first = stub('gemini', 'ok')
  const second = stub('fal', 'ok')

  const outcome = await generateImage(input, [first, second])

  assertEquals(first.calls, 1)
  assertEquals(second.calls, 0)
  assertEquals(outcome.usedFallback, false)
})

Deno.test('رفض المحتوى يبقى نهائيًا — الثاني يرفضه بنفس السبب', () => {
  assertEquals(contentRefusal().retryable, false)
})

/* ------------------- التوجيه حسب العملية ------------------- */

const STUDIO_OPS = ['try-on', 'regenerate', 'replace-garment', 'remove-garment', 'adapt-model']

/** سجلّ كامل: الثلاثة مهيّأون، فما يُسقَط أحد إلا بقرار التوجيه نفسه. */
const fullRegistry = () => ({
  fal: stub('fal', 'ok'),
  gemini: stub('gemini', 'ok'),
  openrouter: stub('openrouter', 'ok'),
})

Deno.test('A · عمليات الاستوديو الخمس → OpenRouter وحده', () => {
  for (const op of STUDIO_OPS) {
    assertEquals(
      providersForOperation(op, fullRegistry()).map((p) => p.id),
      ['openrouter'],
      op,
    )
  }
})

Deno.test('E-I · Gemini خارج كل عملية استوديو — ولو كان مهيّأ وأول الأولوية', () => {
  // البيئة تضع gemini أولاً؛ التوجيه لازم يتجاهلها لا يرثها
  Deno.env.set('IMAGE_PROVIDER_PRIORITY', 'gemini,fal,openrouter')
  try {
    for (const op of STUDIO_OPS) {
      const ids = providersForOperation(op, fullRegistry()).map((p) => p.id)
      assertEquals(ids.includes('gemini'), false, `gemini في ${op}`)
      assertEquals(ids.includes('fal'), false, `fal في ${op}`)
    }
  } finally {
    Deno.env.delete('IMAGE_PROVIDER_PRIORITY')
  }
})

Deno.test('B · نجاح OpenRouter → لا fal ولا gemini يُستدعى', async () => {
  const registry = fullRegistry()
  const outcome = await generateImage(input, providersForOperation('try-on', registry))

  assertEquals(outcome.provider, 'openrouter')
  assertEquals(outcome.usedFallback, false)
  assertEquals(registry.gemini.calls, 0)
  assertEquals(registry.fal.calls, 0)
})

Deno.test('E · إخفاق OpenRouter → يتوقف بخطأ آمن، ولا ينزلق لمزوّد ممنوع', async () => {
  const registry = fullRegistry()
  registry.openrouter = stub('openrouter', retryable('rate-limited', 429))

  await assertRejects(
    () => generateImage(input, providersForOperation('try-on', registry)),
    ProviderError,
  )
  assertEquals(registry.gemini.calls, 0, 'الخطأ العابر ما يفتح بابًا لمزوّد مستبعد')
  assertEquals(registry.fal.calls, 0)
})

Deno.test('مفتاح OpenRouter غائب → توقف واضح لا انزلاق إلى Gemini', () => {
  const registry = fullRegistry()
  registry.openrouter = { ...registry.openrouter, isConfigured: () => false }

  assertEquals(providersForOperation('try-on', registry).length, 0)
})

Deno.test('عملية غير معروفة → ترجع للترتيب العالمي', () => {
  Deno.env.set('IMAGE_PROVIDER_PRIORITY', 'gemini,fal')
  try {
    // `tryon` القديمة تنادي الراوتر بلا operation — ما ينكسر مسارها
    assertEquals(providersForOperation(undefined, fullRegistry()).map((p) => p.id), ['gemini', 'fal'])
    assertEquals(providersForOperation('images-analyze', fullRegistry()).map((p) => p.id), [
      'gemini',
      'fal',
    ])
  } finally {
    Deno.env.delete('IMAGE_PROVIDER_PRIORITY')
  }
})

Deno.test('C+D · عودة fal لاحقًا: أول القائمة يفشل عابرًا → الثاني ينجح ويُعلَم', async () => {
  /*
    fal محذوف اليوم للتشخيص. هذا الاختبار يحرس **آلية** الانتقال نفسها فتبقى
    مثبتة حين يرجع — وإلا رجع بلا شبكة أمان تكشف لو انكسرت.
  */
  const first = stub('openrouter', retryable('rate-limited', 429))
  const second = stub('fal', 'ok')

  const outcome = await generateImage(input, [first, second])

  assertEquals(first.calls, 1)
  assertEquals(second.calls, 1)
  assertEquals(outcome.provider, 'fal')
  assertEquals(outcome.usedFallback, true)
})
