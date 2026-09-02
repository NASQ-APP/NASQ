/**
 * تصنيف أخطاء OpenAI — **القرار الذي يحسم: أنعيد أم نتوقّف؟**
 *
 * العطل الذي تحرسه هذي الاختبارات وقع فعلاً في الإنتاج: `credit_balance_exhausted`
 * سقط على «ضغط» لأن الفحص كان على اسمٍ واحد. والخطأ لم يظهر عطلاً — ظهر
 * **تشخيصًا كاذبًا** في السجل، وهو أخطر: يقول «انتظري» حيث الجواب «ادفعي».
 *
 * ولا نداء حيًّا هنا: تصنيفٌ يقرّر إنفاق وقت المستخدمة لا يُتحقَّق منه بمزوّد.
 */
import { assertEquals } from 'jsr:@std/assert@1'
import { classify, isRetryable } from '../functions/stylist-intent/openai.ts'

Deno.test('٤٢٩ + insufficient_quota → نفاد رصيد، بلا إعادة', () => {
  const kind = classify(429, 'insufficient_quota')
  assertEquals(kind, 'quota-exhausted')
  assertEquals(isRetryable(kind), false)
})

Deno.test('٤٢٩ + credit_balance_exhausted → نفاد رصيد، بلا إعادة', () => {
  // هذا ما ردّه الإنتاج فعلاً، وهذا ما كان يسقط على «ضغط»
  const kind = classify(429, 'credit_balance_exhausted')
  assertEquals(kind, 'quota-exhausted')
  assertEquals(isRetryable(kind), false)
})

Deno.test('٤٢٩ + rate_limit_exceeded → ضغط، والإعادة تنفع', () => {
  const kind = classify(429, 'rate_limit_exceeded')
  assertEquals(kind, 'rate-limited')
  assertEquals(isRetryable(kind), true)
})

Deno.test('٤٢٩ بلا صنف → ضغطٌ افتراضًا لا نفاد رصيد', () => {
  /*
    الافتراض متعمّد: من ظنّ الرصيد نافدًا وهو ضغط يوقف ميزة تعمل، ومن ظنّه
    ضغطًا وهو نفاد يعيد محاولة تفشل. والثاني أرخص.
  */
  assertEquals(classify(429, undefined), 'rate-limited')
})

Deno.test('بقيّة الحالات تحتفظ بتصنيفها', () => {
  assertEquals(classify(401), 'auth')
  assertEquals(classify(403), 'auth')
  assertEquals(classify(404), 'model-not-found')
  assertEquals(classify(400), 'bad-request')
  assertEquals(classify(500), 'provider-error')
  assertEquals(classify(503), 'provider-error')
})

Deno.test('المفتاح الباطل والطلب الفاسد لا يُعادان', () => {
  // إعادتهما تعطي نفس الجواب مهما تكرّرت
  for (const kind of ['auth', 'bad-request', 'model-not-found', 'quota-exhausted'] as const) {
    assertEquals(isRetryable(kind), false, kind)
  }
})

Deno.test('العابر يُعاد', () => {
  for (const kind of ['rate-limited', 'timeout', 'network', 'provider-error'] as const) {
    assertEquals(isRetryable(kind), true, kind)
  }
})
