/**
 * تصنيف الأجهزة — مصدر واحد لسؤال «على أي مقاس نحن؟».
 *
 * القيم مرآة لنقاط توقّف Tailwind الافتراضية (`md` = 48rem، `lg` = 64rem)،
 * عشان قرار الـJS وقرار الـCSS ما يفترقان ويصير عنصر مخفي بالكلاس ومحسوب
 * بالشيفرة. أي تغيير هنا يقابله تغيير في الكلاسات.
 *
 * الدالة نقية بلا `window` عشان تُختبر بلا DOM.
 */
export type DeviceClass = 'mobile' | 'tablet' | 'desktop'

/** أدنى عرض بالبكسل لكل صنف. */
export const DEVICE_MIN_WIDTH = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
} as const satisfies Record<DeviceClass, number>

export function deviceClassFor(width: number): DeviceClass {
  if (width >= DEVICE_MIN_WIDTH.desktop) return 'desktop'
  if (width >= DEVICE_MIN_WIDTH.tablet) return 'tablet'
  return 'mobile'
}

/** استعلام وسائط لكل صنف — يُستهلك من `matchMedia` مباشرة. */
export const deviceQuery = (device: Exclude<DeviceClass, 'mobile'>): string =>
  `(min-width: ${DEVICE_MIN_WIDTH[device]}px)`
