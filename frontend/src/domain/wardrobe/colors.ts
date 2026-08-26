/**
 * لوحة ألوان القطع (W-06).
 * القطعة لها لون أساسي واحد لأنها غرض حقيقي، مو منتج بألوان متعددة.
 */
export type ItemColor = { name: string; hex: string }

export const ITEM_COLORS: ItemColor[] = [
  { name: 'أسود', hex: '#1B1B1B' },
  { name: 'أبيض', hex: '#F4F3F0' },
  { name: 'أبيض مكسور', hex: '#EDEAE3' },
  { name: 'كريمي', hex: '#E5DCCB' },
  { name: 'بيج', hex: '#D8CBB6' },
  { name: 'جملي', hex: '#B79268' },
  { name: 'بني', hex: '#6B5140' },
  { name: 'رمادي', hex: '#B5B5B0' },
  { name: 'فحمي', hex: '#3C3D41' },
  { name: 'كحلي', hex: '#2C3340' },
  { name: 'زيتي', hex: '#7E8168' },
  { name: 'أزرق دينم', hex: '#7C90A8' },
  { name: 'رملي', hex: '#CBBFA8' },
  { name: 'عنّابي', hex: '#6E2B33' },
  { name: 'أخضر باهت', hex: '#9AA793' },
  { name: 'وردي هادئ', hex: '#E0CCC5' },
]

/** الألوان المحايدة — الستايليست يفضّلها في إطلالات العمل والجامعة. */
export const NEUTRAL_COLOR_NAMES = [
  'أسود',
  'أبيض',
  'أبيض مكسور',
  'كريمي',
  'بيج',
  'رمادي',
  'فحمي',
  'رملي',
  'كحلي',
]

export const colorByName = (name: string): ItemColor =>
  ITEM_COLORS.find((color) => color.name === name) ?? ITEM_COLORS[0]
