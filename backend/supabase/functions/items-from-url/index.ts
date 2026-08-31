/**
 * POST /items-from-url
 *
 * استيراد قطعة من رابط متجر (I-01). القطعة المستوردة تدخل **قطع للتجربة**
 * معزولة — ما تدخل الخزانة إلا بقرار يدوي صريح (المبدأ ١ · I-03).
 *
 * حد أمني ثابت (§14): ما نطلب كلمة مرور أي متجر ولا نخزّن أي رمز وصول، ونقرأ
 * صفحة واحدة اختارتها المستخدمة لا أكثر.
 *
 * **الفشل يُقال لا يُخفى**: الردّ يحمل `extracted: false` وسببًا بلغة بشر بدل
 * خطأ HTTP، لأن «نمشي يحجب القراءة الآن» ليس عطلًا في نَسّق — والمستخدمة
 * تحتاج تعرف الفرق كي تعرف وش تسوي.
 */
import { handlePreflight } from '../_shared/cors.ts'
import { HandledError, fail, ok } from '../_shared/response.ts'
import { readJson, requireUser } from '../_shared/supabase.ts'
import { readProduct } from './extract.ts'

type ImportRequest = { url: string }

Deno.serve(async (request) => {
  const preflight = handlePreflight(request)
  if (preflight) return preflight

  try {
    // الجلسة شرط: القراءة تستهلك شبكتنا، فما نفتحها لمن ليس عندنا
    await requireUser(request)
    const { url } = await readJson<ImportRequest>(request)

    if (typeof url !== 'string' || !url.trim()) {
      throw new HandledError('invalid-request', 'الرابط غير صالح.')
    }

    return ok(await readProduct(url.trim()))
  } catch (error) {
    return fail(error)
  }
})
