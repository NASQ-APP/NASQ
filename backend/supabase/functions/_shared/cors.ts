/**
 * رؤوس CORS — تُضاف لكل رد، ولكل دالة طلب OPTIONS مسبق.
 *
 * **الأصل يُطابَق لا يُثبَّت.** كان الرد يحمل قيمة `APP_ORIGIN` كما هي مهما كان
 * أصل الطلب. وهي **قائمة** بأصلين أو أكثر، فيرجع الرد بقائمة في ترويسة لا
 * تقبل إلا أصلًا واحدًا — فيرفضها المتصفّح كلها، ويُحجب حتى الأصل المكتوب فيها.
 *
 * الآن نقرأها قائمةً ونرجّع **أصل الطلب نفسه** لو كان فيها. وهذا شرط الرد على
 * طلب يحمل بيانات اعتماد: المتصفح يرفض `*` معه.
 *
 * ومنافذ `localhost` مسموحة دائمًا — لأنها الحالة التي تتكسّر كل مرة: منفذ
 * Vite يتغيّر حسب ما هو شاغر، فالإعداد يصير صحيحًا اليوم وخاطئًا بكرة بلا ما
 * يتغيّر شي. ولا تفتح شيئًا: صفحة على جهاز المطوّرة وحدها.
 */
const CONFIGURED = (Deno.env.get('APP_ORIGIN') ?? '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean)

/** أي منفذ على الجهاز نفسه — التطوير يبدّلها بلا إذن. */
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/

const allowed = (origin: string): boolean => CONFIGURED.includes(origin) || LOCAL.test(origin)

/**
 * رؤوس الرد لأصل الطلب.
 *
 * الأصل غير المعروف يأخذ أول أصل مضبوط بدل أن نصدّق ما جاءنا: المتصفح يرفض
 * الرد فيظهر الخطأ عند صاحبه، ولا نعلن سماحًا لم نمنحه.
 */
export function corsFor(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') ?? ''

  return {
    /*
      **يفشل مغلقًا.** كان الرجوع عند غياب `APP_ORIGIN` إلى `*` — سماحٌ لكل
      موقع بمناداة دوالنا من متصفح مستخدمة مسجّلة. الآن الغياب يعني ترويسة
      فاضية فيرفض المتصفح الرد: إعدادٌ ناقص يوقف الطلب لا يفتحه. و`localhost`
      يبقى مسموحًا فما ينكسر التطوير.
    */
    'access-control-allow-origin': allowed(origin) ? origin : (CONFIGURED[0] ?? ''),
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    // الردّ يختلف باختلاف الأصل، فلا يُخزَّن رد أصل ويُقدَّم لأصل آخر
    vary: 'Origin',
  }
}

/**
 * رؤوس بلا طلب — للمسارات التي تبني الرد بعيدًا عن الطلب.
 *
 * تبقى للتوافق مع ما كُتب قبل المطابقة؛ الجديد يستعمل `corsFor`.
 */
export const corsHeaders: Record<string, string> = {
  'access-control-allow-origin': CONFIGURED[0] ?? '',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  vary: 'Origin',
}

/** يرد على طلب OPTIONS المسبق، أو null لو الطلب ليس كذلك. */
export const handlePreflight = (request: Request): Response | null =>
  request.method === 'OPTIONS' ? new Response('ok', { headers: corsFor(request) }) : null
