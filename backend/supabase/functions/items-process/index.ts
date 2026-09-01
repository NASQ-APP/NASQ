/**
 * POST /items-process
 *
 * إزالة الخلفية + التصنيف التلقائي لقطعة مرفوعة (W-05 · A-07).
 *
 * قاعدة معمارية (§19): Edge Functions تشتغل على Deno، فما فيها معالجة صور
 * محلية (`sharp` وأمثاله). دورها **وسيط يخفي المفتاح** ويستدعي API خارجيًا.
 * لو احتجنا معالجة ثقيلة فعلاً، نضيف خدمة Node مستقلة — مو الآن.
 */
import { handlePreflight } from '../_shared/cors.ts'
import { HandledError, fail, ok } from '../_shared/response.ts'
import { optionalEnv } from '../_shared/env.ts'
import { visionProvider } from '../_shared/vision.ts'
import { readJson, requireUser, serviceClient } from '../_shared/supabase.ts'

type ProcessRequest = {
  /** مسار الملف داخل سلّة items — لا يُقبل رابط خارجي */
  storagePath: string
}

Deno.serve(async (request) => {
  const preflight = handlePreflight(request)
  if (preflight) return preflight

  try {
    const user = await requireUser(request)
    const { storagePath } = await readJson<ProcessRequest>(request)

    if (!storagePath?.startsWith(`${user.id}/`)) {
      throw new HandledError('invalid-image', 'مسار الصورة غير صالح.')
    }

    const db = serviceClient()

    // رابط موقّع محدود المدة بدل الرابط العام (§17)
    const { data: signed } = await db.storage.from('items').createSignedUrl(storagePath, 300)
    if (!signed?.signedUrl) {
      throw new HandledError('invalid-image', 'ما لقينا الصورة المرفوعة.', 404)
    }

    // نسأل نفس المصدر الذي يبني المزوّد — قراءة المتغيّر هنا تتفارق معه
    if (!visionProvider()) {
      // ما نزيّف نتيجة (المبدأ ٤): نقول صراحة إن الخدمة غير مفعّلة
      throw new HandledError(
        'not-supported-by-provider',
        'التصنيف التلقائي يحتاج تفعيل مزوّد الرؤية على الخادم.',
        503,
      )
    }

    // TODO(المرحلة ٢): إزالة الخلفية ← رفع النسخة المنقّاة ← استدعاء الرؤية.
    // كل حقل يرجع **اقتراحًا** قابلاً للتعديل، مو أمرًا نهائيًا (A-07).
    return ok({
      imageCutoutUrl: null,
      suggestion: {
        categoryId: null,
        shape: null,
        colorHex: null,
        colorName: null,
        pattern: null,
        material: null,
        seasons: [],
        occasions: [],
      },
    })
  } catch (error) {
    return fail(error)
  }
})
