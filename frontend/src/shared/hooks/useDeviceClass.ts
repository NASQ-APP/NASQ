/**
 * صنف الجهاز الحالي — جوال · لوحي · سطح مكتب.
 *
 * المكوّنات تسأل هذا الخطاف بدل ما تحسب `window.innerWidth` بنفسها، فتبقى
 * نقطة التوقّف معرّفة في مكان واحد (`domain/shared/device`) ومتطابقة مع
 * كلاسات Tailwind.
 */
import { useMediaQuery } from './useMediaQuery'
import { deviceQuery } from '@/domain/shared/device'
import type { DeviceClass } from '@/domain/shared/device'

export function useDeviceClass(): DeviceClass {
  const desktop = useMediaQuery(deviceQuery('desktop'))
  const tablet = useMediaQuery(deviceQuery('tablet'))
  if (desktop) return 'desktop'
  return tablet ? 'tablet' : 'mobile'
}

/** اختصار شائع: هل نحن تحت مقاس سطح المكتب؟ */
export function useIsCompact(): boolean {
  return useDeviceClass() !== 'desktop'
}
