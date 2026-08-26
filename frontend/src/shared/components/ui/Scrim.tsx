import { cn } from '@/shared/lib'
import { layers } from '@/theme'

/** الطبقة المعتمة خلف المودال والدرج. */
export function Scrim({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      aria-hidden
      style={{ zIndex: layers.scrim }}
      className={cn(
        'fixed inset-0 bg-[rgba(10,10,10,0.32)] transition-opacity duration-[320ms] ease-soft',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    />
  )
}
