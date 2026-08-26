/**
 * POST /items-from-url
 *
 * استيراد قطعة من رابط متجر (I-01). القطعة المستوردة تدخل **قطع للتجربة**
 * معزولة — ما تدخل الخزانة إلا بقرار يدوي صريح (المبدأ ١ · I-03).
 *
 * حد أمني ثابت (§14): ما نطلب كلمة مرور أي متجر ولا نخزّن أي رمز وصول.
 */
import { handlePreflight } from '../_shared/cors.ts'
import { HandledError, fail, ok } from '../_shared/response.ts'
import { readJson, requireUser } from '../_shared/supabase.ts'

type ImportRequest = { url: string }

/** المتاجر المعروفة — نستخرج منها الصورة والاسم والماركة. */
const KNOWN_STORES: Record<string, string> = {
  'shein.com': 'shein',
  'namshi.com': 'namshi',
  'aliexpress.com': 'ali',
  'zara.com': 'zara',
  'noon.com': 'noon',
  'asos.com': 'asos',
}

const storeIdFor = (hostname: string): string | undefined => {
  const host = hostname.replace(/^www\./, '')
  return Object.entries(KNOWN_STORES).find(([domain]) => host.endsWith(domain))?.[1]
}

Deno.serve(async (request) => {
  const preflight = handlePreflight(request)
  if (preflight) return preflight

  try {
    await requireUser(request)
    const { url } = await readJson<ImportRequest>(request)

    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      throw new HandledError('invalid-request', 'الرابط غير صالح.')
    }

    if (parsed.protocol !== 'https:') {
      throw new HandledError('invalid-request', 'نقبل روابط https فقط.')
    }

    const storeId = storeIdFor(parsed.hostname)

    // TODO(المرحلة ٢): جلب الصفحة واستخراج وسوم OpenGraph (الصورة والاسم والماركة).
    // لو فشل الاستخراج، الواجهة تنزّل الصورة وتكمّل المستخدمة يدويًا (I-01).
    return ok({
      storeId: storeId ?? null,
      sourceLink: parsed.toString(),
      name: null,
      brand: null,
      imageUrl: null,
      extracted: false,
      // القطعة تدخل «قطع للتجربة» دائمًا — مو الخزانة
      source: 'try',
    })
  } catch (error) {
    return fail(error)
  }
})
