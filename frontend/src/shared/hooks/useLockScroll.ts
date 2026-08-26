import { useEffect } from 'react'

/** يمنع تمرير الصفحة خلف المودال أو الدرج. */
export function useLockScroll(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [active])
}
