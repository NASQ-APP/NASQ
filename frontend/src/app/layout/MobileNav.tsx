import { X } from 'lucide-react'
import { Brand } from './Brand'
import { NavList } from './NavList'
import { layers } from '@/theme'

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div
      style={{ zIndex: layers.overlay }}
      className="fixed inset-0 flex flex-col bg-canvas lg:hidden"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <Brand compact />
        <button onClick={onClose} aria-label="إغلاق">
          <X size={20} strokeWidth={1.4} />
        </button>
      </div>
      <NavList onNavigate={onClose} />
    </div>
  )
}
