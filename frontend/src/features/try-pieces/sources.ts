/**
 * المتاجر التي يمكن استيراد قطعة منها.
 * مصدر استيراد فقط — ما فيه شراء ولا سلة. السعر يُعرض كمعلومة تساعد على
 * القرار، مب كعرض بيع (المبدأ ١).
 *
 * التسوّق يصير داخل موقع المتجر نفسه: نفتحه في تبويب جديد، والمستخدمة تسجّل
 * دخولها هناك. نَسّق ما تشوف ولا تطلب أي بيانات دخول (§14).
 */
export type ImportSource = {
  id: string
  name: string
  latin: string
  mark: string
  /** الموقع الرسمي — يُفتح في تبويب جديد */
  url: string
}

export const IMPORT_SOURCES: ImportSource[] = [
  /*
    قياس وقت كتابة هذا الملف: هذي المتاجر ردّت على القراءة من الخادم في ثانية
    أو ثانيتين. **توثيق لا شرط** — ما نبني عليه فرعًا في الكود، لأن المتجر
    يغيّر حمايته متى شاء، والقائمة ما تغطي كل متجر تلصق منه المستخدمة.
    كل رابط يمرّ بالمحاولة نفسها، وما يفشل يُشرح.
  */
  { id: 'shein', name: 'شي إن', latin: 'SHEIN', mark: 'S', url: 'https://ar.shein.com/' },
  { id: 'voga', name: 'فوغا كلوسيت', latin: 'VogaCloset', mark: 'V', url: 'https://vogacloset.com/saudi/ar/' },
  { id: 'ounass', name: 'أُناس', latin: 'Ounass', mark: 'O', url: 'https://www.ounass.com/' },
  { id: 'nisnass', name: 'نس نس', latin: 'Nisnass', mark: 'NS', url: 'https://www.nisnass.com/sa-ar/' },
  { id: 'trendyol', name: 'ترينديول', latin: 'Trendyol', mark: 'T', url: 'https://www.trendyol.com/' },
  { id: 'mango', name: 'مانجو', latin: 'MANGO', mark: 'M', url: 'https://shop.mango.com/sa/ar' },
  { id: 'centrepoint', name: 'سنتربوينت', latin: 'Centrepoint', mark: 'C', url: 'https://www.centrepointstores.com/sa/ar/' },
  { id: 'amazon', name: 'أمازون', latin: 'Amazon.sa', mark: 'AZ', url: 'https://www.amazon.sa/' },
  { id: 'ali', name: 'علي إكسبرس', latin: 'AliExpress', mark: 'A', url: 'https://www.aliexpress.com/' },
  { id: 'temu', name: 'تيمو', latin: 'Temu', mark: 'TM', url: 'https://www.temu.com/' },
  { id: 'plt', name: 'بريتي ليتل ثينج', latin: 'PrettyLittleThing', mark: 'PL', url: 'https://www.prettylittlething.com/' },
  { id: 'boohoo', name: 'بوهو', latin: 'boohoo', mark: 'B', url: 'https://www.boohoo.com/' },
  // مب متجرًا: مصدر صور. تدخل منه القطعة بنفس المسار، لكن بلا سعر ولا ماركة.
  { id: 'pinterest', name: 'بنترست', latin: 'Pinterest', mark: 'P', url: 'https://www.pinterest.com/' },

  /*
    وهذي رفضت وقت القياس: تقبل الاتصال وتكمّل TLS ثم ما ترسل ولا بايت، أو
    ترد 403. طريقها رفع الصورة — والواجهة تشرحه لما تفشل المحاولة.
  */
  { id: 'namshi', name: 'نمشي', latin: 'Namshi', mark: 'N', url: 'https://www.namshi.com/saudi-ar/' },
  { id: 'noon', name: 'نون', latin: 'noon', mark: 'n', url: 'https://www.noon.com/saudi-ar/' },
  { id: 'zara', name: 'زارا', latin: 'ZARA', mark: 'Z', url: 'https://www.zara.com/sa/ar/' },
  { id: 'asos', name: 'ايسوس', latin: 'ASOS', mark: 'AS', url: 'https://www.asos.com/' },
  { id: 'hm', name: 'إتش آند إم', latin: 'H&M', mark: 'H', url: 'https://www2.hm.com/ar_sa/index.html' },
  { id: 'max', name: 'ماكس', latin: 'Max Fashion', mark: 'MX', url: 'https://www.maxfashion.com/sa/ar/' },
  { id: '6th', name: 'ذا سيكست ستريت', latin: '6thStreet', mark: '6', url: 'https://en.6thstreet.com/' },
  { id: 'styli', name: 'ستايلي', latin: 'Styli', mark: 'ST', url: 'https://www.styli.com/sa-ar/' },
]

export const sourceById = (id?: string): ImportSource | undefined =>
  IMPORT_SOURCES.find((source) => source.id === id)

/**
 * متجر الرابط — يُقرأ من نطاقه بلا خادم.
 *
 * لمّا يفشل النداء نفسه (مهلة أو بوابة تردّ 502) ما يوصلنا من الخادم شيء،
 * ومع ذلك نعرف المتجر من الرابط وحده — فتدخل القطعة باسم متجرها لا «مصادر أخرى».
 */
const DOMAINS: Record<string, string> = {
  'shein.com': 'shein',
  'vogacloset.com': 'voga',
  'ounass.com': 'ounass',
  'nisnass.com': 'nisnass',
  'trendyol.com': 'trendyol',
  'mango.com': 'mango',
  'centrepointstores.com': 'centrepoint',
  'amazon.sa': 'amazon',
  'aliexpress.com': 'ali',
  'temu.com': 'temu',
  'prettylittlething.com': 'plt',
  'boohoo.com': 'boohoo',
  'pinterest.com': 'pinterest',
  'pin.it': 'pinterest',
  'namshi.com': 'namshi',
  'noon.com': 'noon',
  'zara.com': 'zara',
  'asos.com': 'asos',
  'hm.com': 'hm',
  'maxfashion.com': 'max',
  '6thstreet.com': '6th',
  'styli.com': 'styli',
}

export function storeIdFromUrl(link: string): string | undefined {
  try {
    const host = new URL(link).hostname.replace(/^www\./, '').toLowerCase()
    return Object.entries(DOMAINS).find(([domain]) => host.endsWith(domain))?.[1]
  } catch {
    return undefined
  }
}

