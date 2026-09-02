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

/** تطبيع عربي: التشكيل والشدّة والهمزات — «عنّابي» و«عنابي» اسمٌ واحد. */
const normalize = (text: string): string =>
  text
    .replace(/[ً-ْ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .trim()

/**
 * أسماء تقولها الناس، وعلاقتها بلوحتنا **ليست واحدة**.
 *
 * «رصاصي» و«رمادي» اسمان لشيء واحد. أما «أحمر» و«عنّابي» فلونان من عائلة
 * واحدة وليسا سواء — وردّ الأول إلى الثاني بصمت يجعلنا نقول «مع عنّابي…» ردًّا
 * على من سألت عن الأحمر، فتظنّ أننا لم نفهمها. وكذلك «ذهبي» و«جملي»: قريبان
 * في العائلة، مختلفان في الصفة.
 *
 * فالتفريق هنا صريح: المرادف يُبدَّل بلا تعليق، والقريب يُقال إنه **الأقرب**.
 */
const ALIAS: Record<string, string> = {
  رصاصي: 'رمادي',
  زهري: 'وردي هادئ',
  سكري: 'كريمي',
  عاجي: 'أبيض مكسور',
  اوفوايت: 'أبيض مكسور',
}

/** قريبٌ من العائلة — يُعرَض بوصفه أقرب المتاح، لا بوصفه المطلوب. */
const FAMILY: Record<string, string> = {
  احمر: 'عنّابي',
  خمري: 'عنّابي',
  نبيتي: 'عنّابي',
  بورجندي: 'عنّابي',
  نيود: 'بيج',
  ذهبي: 'جملي',
  عسلي: 'جملي',
  فضي: 'رمادي',
  اخضر: 'زيتي',
  ازرق: 'كحلي',
  وردي: 'وردي هادئ',
}

export type ColorMatch = {
  color: ItemColor
  /** `exact` مطابقة · `alias` اسمٌ آخر لنفسه · `family` أقرب المتاح */
  relation: 'exact' | 'alias' | 'family'
}

export function resolveColorName(spoken: string): ColorMatch | undefined {
  const wanted = normalize(spoken)
  if (!wanted) return undefined

  const exact = ITEM_COLORS.find((color) => normalize(color.name) === wanted)
  if (exact) return { color: exact, relation: 'exact' }

  const alias = ALIAS[wanted]
  if (alias) {
    const found = ITEM_COLORS.find((color) => color.name === alias)
    if (found) return { color: found, relation: 'alias' }
  }

  const family = FAMILY[wanted]
  if (family) {
    const found = ITEM_COLORS.find((color) => color.name === family)
    if (found) return { color: found, relation: 'family' }
  }

  /*
    الاحتواء الجزئي قريبٌ لا مطابق: «أحمر غامق» ليست لونًا في لوحتنا، وأقرب
    ما فيها يُقال أقربَ لا مطلوبًا.
  */
  const partial = ITEM_COLORS.find((color) => {
    const name = normalize(color.name)
    return wanted.includes(name) || name.includes(wanted)
  })
  return partial ? { color: partial, relation: 'family' } : undefined
}
