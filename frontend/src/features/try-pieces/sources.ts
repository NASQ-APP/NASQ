/**
 * المتاجر التي يمكن استيراد قطعة منها.
 * مصدر استيراد فقط — ما فيه شراء ولا سلة ولا سعر معروض للبيع (المبدأ ١).
 */
export type ImportSource = {
  id: string
  name: string
  latin: string
  mark: string
}

export const IMPORT_SOURCES: ImportSource[] = [
  { id: 'shein', name: 'شي إن', latin: 'SHEIN', mark: 'S' },
  { id: 'namshi', name: 'نمشي', latin: 'Namshi', mark: 'N' },
  { id: 'ali', name: 'علي إكسبرس', latin: 'AliExpress', mark: 'A' },
  { id: 'zara', name: 'زارا', latin: 'ZARA', mark: 'Z' },
  { id: 'noon', name: 'نون', latin: 'noon', mark: 'n' },
  { id: 'asos', name: 'ايسوس', latin: 'ASOS', mark: 'AS' },
]

export const sourceById = (id?: string): ImportSource | undefined =>
  IMPORT_SOURCES.find((source) => source.id === id)
