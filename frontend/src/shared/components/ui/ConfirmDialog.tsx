import type { ReactNode } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

/**
 * تأكيد قبل أي إجراء لا رجعة فيه.
 * وجودها كمكوّن واحد يضمن إن كل حذف في التطبيق يمر بنفس الخطوة.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  eyebrow,
  title,
  children,
  confirmLabel = 'تأكيد',
  cancelLabel = 'تراجع',
  destructive = true,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  eyebrow?: string
  title: string
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={eyebrow}
      title={title}
      width="sm"
      footer={
        <div className="flex gap-3">
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
        </div>
      }
    >
      {typeof children === 'string' ? (
        <p className="text-[13px] leading-8 text-muted">{children}</p>
      ) : (
        children
      )}
    </Modal>
  )
}
