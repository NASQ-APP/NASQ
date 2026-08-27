/**
 * قراءة استعلام وسائط داخل React.
 *
 * `useSyncExternalStore` بدل `useEffect + setState`: القيمة تُقرأ وقت الرسم
 * فما يومض التخطيط بمقاس خاطئ في أول إطار، والاشتراك ينظّف نفسه.
 */
import { useCallback, useSyncExternalStore } from 'react'

const NEVER = () => () => {}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined') return NEVER()
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )

  const read = useCallback(
    () => (typeof window === 'undefined' ? false : window.matchMedia(query).matches),
    [query],
  )

  // اللقطة على الخادم: نفترض الجوال — أصغر تخطيط ما ينكسر لو كبر
  return useSyncExternalStore(subscribe, read, () => false)
}
