/**
 * ترويسة `X-Title` — تنظيفها، وأثره على الطلب كاملاً.
 *
 * العطل الأصلي: `fetch` يرمي عند **بناء** الطلب لا عند إرساله، فيُقرأ كأن
 * المزوّد لا يُوصَل إليه. لذلك لا يكفي اختبار الدالة النقيّة: نبني طلبًا
 * حقيقيًا بقيمة منظَّفة، ونمرّ بالمزوّد نفسه بـ`fetch` مزيّف — فنثبت أن
 * الطلب **يصل** الشبكة، وأن جسمه ما تغيّر.
 */
import { assertEquals, assertThrows } from 'jsr:@std/assert@1'
import {
  openRouterImageProvider,
  sanitizeHeaderValue,
} from '../functions/_shared/imageProviders/openRouter.ts'

const buildRequest = (title: string) =>
  new Request('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: 'Bearer test', 'X-Title': title },
  })

/** يبني الطلب فعلاً — لو كانت القيمة غير صالحة رمى هنا كما رمى في الإنتاج. */
const usable = (title: string): string =>
  buildRequest(sanitizeHeaderValue(title)).headers.get('x-title') ?? ''

Deno.test('A · اسم لاتيني يمرّ كما هو', () => {
  assertEquals(sanitizeHeaderValue('NASAQ'), 'NASAQ')
  assertEquals(usable('NASAQ'), 'NASAQ')
})

Deno.test('B · اسم عربي بالكامل → لا رمي، ويسقط للاحتياطي', () => {
  // العطل نفسه، موثّقًا: بلا تنظيف يرمي
  assertThrows(() => buildRequest('نَسّق'), TypeError)

  assertEquals(sanitizeHeaderValue('نَسّق'), 'NASAQ')
  assertEquals(usable('نَسّق'), 'NASAQ')
})

Deno.test('C · عربي وإنجليزي معًا → يبقى اللاتيني وحده', () => {
  assertEquals(usable('نَسَق | NASAQ'), '| NASAQ')
  assertEquals(usable('NASAQ نسق'), 'NASAQ')
})

Deno.test('D · الشرطة الطويلة والإيموجي وعلامات يونيكود → لا رمي', () => {
  for (const name of [
    'NASAQ — من خزانتك، نصنع طَلّتك',
    'NASAQ ✨',
    'NASAQ pro',
    '«NASAQ»',
    '   ',
  ]) {
    const value = usable(name)
    assertEquals(value.length > 0, true, name)
    // ASCII خالص: كل محرف داخل النطاق المسموح
    assertEquals(/^[ -~]+$/.test(value), true, value)
  }
  assertEquals(sanitizeHeaderValue('   '), 'NASAQ', 'الفراغ بعد trim يسقط للاحتياطي')
})

Deno.test('E+F · الطلب يصل fetch باسم عربي، والجسم كما هو', async () => {
  const original = globalThis.fetch
  let seen: Request | undefined

  Deno.env.set('OPENROUTER_API_KEY', 'test-key')
  Deno.env.set('APP_NAME', 'نَسّق')
  Deno.env.set('OPENROUTER_IMAGE_MODEL', 'test/model')

  globalThis.fetch = (input: URL | Request | string, init?: RequestInit) => {
    seen = new Request(input as string, init)
    return Promise.resolve(
      new Response(
        JSON.stringify({
          choices: [{ message: { images: [{ image_url: { url: 'data:image/png;base64,OUT' } }] } }],
        }),
        { status: 200 },
      ),
    )
  }

  try {
    const result = await openRouterImageProvider.generate({
      prompt: 'P',
      images: ['data:image/png;base64,PERSON', 'https://store.example/dress.jpg'],
      signal: AbortSignal.timeout(5_000),
    })

    // E — وصل الشبكة، والترويسة منظَّفة
    assertEquals(seen !== undefined, true, 'لو رمى البناء ما وصلنا هنا')
    assertEquals(seen!.headers.get('x-title'), 'NASAQ')
    assertEquals(seen!.headers.get('authorization'), 'Bearer test-key')
    assertEquals(seen!.headers.get('content-type'), 'application/json')

    // F — الجسم والصور والمودل بلا مساس
    const body = JSON.parse(await seen!.text())
    assertEquals(body.model, 'test/model')
    assertEquals(body.modalities, ['image', 'text'])
    assertEquals(body.messages[0].content[0].image_url.url, 'data:image/png;base64,PERSON')
    assertEquals(body.messages[0].content[1].image_url.url, 'https://store.example/dress.jpg')
    assertEquals(body.messages[0].content[2].text, 'P')

    assertEquals(result.image, 'data:image/png;base64,OUT')
  } finally {
    globalThis.fetch = original
    Deno.env.delete('OPENROUTER_API_KEY')
    Deno.env.delete('APP_NAME')
    Deno.env.delete('OPENROUTER_IMAGE_MODEL')
  }
})
