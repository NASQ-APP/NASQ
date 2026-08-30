/**
 * المتاجر التي يمكن استيراد قطعة منها.
 * مصدر استيراد فقط — ما فيه شراء ولا سلة. السعر يُعرض كمعلومة تساعد على
 * القرار، مب كعرض بيع (المبدأ ١).
 *
 * التسوّق يصير داخل موقع المتجر نفسه: نفتحه في تبويب جديد، والمستخدمة تسجّل
 * دخولها هناك. نَسَق ما تشوف ولا تطلب أي بيانات دخول (§14).
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
  { id: 'shein', name: 'شي إن', latin: 'SHEIN', mark: 'S', url: 'https://sa.shein.com/' },
  { id: 'namshi', name: 'نمشي', latin: 'Namshi', mark: 'N', url: 'https://www.namshi.com/saudi-ar/' },
  { id: 'ali', name: 'علي إكسبرس', latin: 'AliExpress', mark: 'A', url: 'https://www.aliexpress.com/' },
  { id: 'zara', name: 'زارا', latin: 'ZARA', mark: 'Z', url: 'https://www.zara.com/sa/ar/' },
  { id: 'noon', name: 'نون', latin: 'noon', mark: 'n', url: 'https://www.noon.com/saudi-ar/' },
  { id: 'asos', name: 'ايسوس', latin: 'ASOS', mark: 'AS', url: 'https://www.asos.com/' },
  { id: 'voga', name: 'فوغا كلوسيت', latin: 'VogaCloset', mark: 'V', url: 'https://vogacloset.com/saudi/ar/' },
  // مب متجرًا: مصدر صور. تدخل منه القطعة بنفس المسار، لكن بلا سعر ولا ماركة.
  { id: 'pinterest', name: 'بنترست', latin: 'Pinterest', mark: 'P', url: 'https://www.pinterest.com/' },
]

export const sourceById = (id?: string): ImportSource | undefined =>
  IMPORT_SOURCES.find((source) => source.id === id)
