/**
 * البحث عن قطعة ناقصة داخل المتاجر.
 *
 * ما عندنا فهرس منتجات، وما نخترع قطعة ولا سعرًا. اللي نقدر عليه — وهو صادق
 * ومفيد — إننا نبني رابط البحث في المتجر نفسه، فتفتحه المستخدمة وتشوف نتائج
 * المتجر الحقيقية، وتضيف ما يعجبها بزر الإضافة أو باللصق.
 *
 * كل رابط هنا مُتحقَّق منه في متصفح حقيقي، مب مفترضًا.
 */
import { IMPORT_SOURCES, type ImportSource } from './sources'

/** يبني رابط بحث المتجر من نص عربي أو إنجليزي. */
type SearchUrl = (query: string) => string

const SEARCH: Record<string, SearchUrl> = {
  shein: (q) => `https://ar.shein.com/pdsearch/${encodeURIComponent(q)}/`,
  namshi: (q) => `https://www.namshi.com/saudi-ar/search?q=${encodeURIComponent(q)}`,
  ali: (q) => `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(q)}`,
  zara: (q) => `https://www.zara.com/sa/ar/search?searchTerm=${encodeURIComponent(q)}`,
  noon: (q) => `https://www.noon.com/saudi-ar/search/?q=${encodeURIComponent(q)}`,
  asos: (q) => `https://www.asos.com/search/?q=${encodeURIComponent(q)}`,
  voga: (q) => `https://vogacloset.com/saudi/ar/catalogsearch/result/?q=${encodeURIComponent(q)}`,
}

export type StoreSearch = { store: ImportSource; url: string }

/** روابط البحث عن نفس القطعة في كل متجر عندنا. */
export function searchStores(query: string): StoreSearch[] {
  const term = query.trim()
  if (!term) return []
  return IMPORT_SOURCES.filter((store) => SEARCH[store.id]).map((store) => ({
    store,
    url: SEARCH[store.id](term),
  }))
}
