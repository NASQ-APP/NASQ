/**
 * GET /share?token=…
 *
 * صفحة الإطلالة المشاركة (P-01 · P-02).
 *
 * ترجّع **HTML** فيه وسوم OpenGraph عشان تظهر المعاينة في واتساب — التطبيق
 * صفحة واحدة (SPA) وما يعطي معاينة بنفسه. هذا المسار الوحيد اللي يفتح بدون
 * تسجيل دخول، والقراءة تمر عبر دالة `shared_outfit` اللي تحترم إعدادات
 * المشاركة: إخفاء الأسعار افتراضيًا، وإظهار الماركات حسب اختيار صاحبتها.
 */
import { corsHeaders, handlePreflight } from '../_shared/cors.ts'
import { serviceClient } from '../_shared/supabase.ts'
import { optionalEnv } from '../_shared/env.ts'

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string,
  )

const page = (title: string, description: string, image: string, body: string): string => `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    ${image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <style>
      body { margin:0; background:#fff; color:#111; font-family:'Alexandria',system-ui,sans-serif;
             font-weight:300; display:grid; place-items:center; min-height:100vh; padding:24px; }
      .card { max-width:520px; width:100%; border:1px solid #E8E8E5; border-radius:10px; overflow:hidden; }
      img { width:100%; display:block; background:#F7F7F5; }
      .meta { padding:20px; }
      h1 { font-size:20px; font-weight:300; margin:0 0 6px; }
      p { color:#666; font-size:13px; margin:0; line-height:1.9; }
      ul { list-style:none; padding:0; margin:14px 0 0; }
      li { border-top:1px solid #E8E8E5; padding:9px 0; font-size:13px; }
    </style>
  </head>
  <body>${body}</body>
</html>`

Deno.serve(async (request) => {
  const preflight = handlePreflight(request)
  if (preflight) return preflight

  const headers = { ...corsHeaders, 'content-type': 'text/html; charset=utf-8' }
  const token = new URL(request.url).searchParams.get('token') ?? ''
  const appName = optionalEnv('APP_NAME', 'دولابي الذكي')

  try {
    const { data } = await serviceClient().rpc('shared_outfit', { share_token: token })

    if (!data) {
      return new Response(
        page(appName, 'الرابط غير متاح', '', '<div class="card"><div class="meta"><h1>الرابط غير متاح</h1><p>يمكن صاحبته ألغته.</p></div></div>'),
        { status: 404, headers },
      )
    }

    const outfit = data as {
      name: string
      occasion: string | null
      imageUrl: string | null
      simulated: boolean
      items: { name: string; brand: string | null; price: number | null }[]
    }

    const pieces = outfit.items
      .map((item) => {
        const brand = item.brand ? ` · ${escapeHtml(item.brand)}` : ''
        const price = item.price != null ? ` · ${item.price}` : ''
        return `<li>${escapeHtml(item.name)}${brand}${price}</li>`
      })
      .join('')

    const body = `<div class="card">
      ${outfit.imageUrl ? `<img src="${escapeHtml(outfit.imageUrl)}" alt="${escapeHtml(outfit.name)}" />` : ''}
      <div class="meta">
        <h1>${escapeHtml(outfit.name)}</h1>
        <p>${escapeHtml(outfit.occasion ?? '')}${outfit.simulated ? ' · معاينة تقريبية' : ''}</p>
        <ul>${pieces}</ul>
      </div>
    </div>`

    return new Response(
      page(outfit.name, `إطلالة من ${appName}`, outfit.imageUrl ?? '', body),
      { headers },
    )
  } catch (error) {
    console.error('share', error)
    return new Response(page(appName, 'خطأ', '', '<div class="card"><div class="meta"><h1>صار خطأ</h1></div></div>'), {
      status: 500,
      headers,
    })
  }
})
