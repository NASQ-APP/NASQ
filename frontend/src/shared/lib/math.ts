export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/** اختيار دوري من قائمة — يرجّع undefined لو القائمة فاضية. */
export const pickCyclic = <T>(list: T[], index: number): T | undefined =>
  list.length ? list[index % list.length] : undefined

/** إزالة التكرار مع الحفاظ على الترتيب. */
export const unique = <T>(list: T[]): T[] => [...new Set(list)]
