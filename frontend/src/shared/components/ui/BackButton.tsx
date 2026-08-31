/**
 * زر الرجوع.
 *
 * كان في كل صفحة نسخته الخاصة — نصّ بحجم ١٠ بكسل بلون `faint` بلا حدّ، فما
 * كان يُقرأ ولا يُرى كزر. وحّدناه هنا: حدّ واضح ومساحة نقر كاملة ونص بحجم
 * يُقرأ، فتعرف المستخدمة إن فيه طريق رجوع بلا ما تدوّره.
 *
 * **السهم يشير يمينًا** لأن الواجهة عربية: الرجوع في RTL يمشي لليمين، والسهم
 * لليسار يقول «تقدّم» فيربك.
 */
import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from './Button'
import type { ButtonSize } from './Button'

type BackButtonProps = {
  /** ماذا يفعل الضغط — الافتراضي رجوع خطوة في التاريخ */
  onClick?: () => void
  /** نصّ الزر — يوضّح الوجهة حين تكون معروفة: «رجوع للاستوديو» */
  label?: string
  size?: ButtonSize
  className?: string
}

export function BackButton({
  onClick,
  label = 'رجوع',
  size = 'sm',
  className,
}: BackButtonProps) {
  const navigate = useNavigate()

  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      className={className}
      onClick={onClick ?? (() => navigate(-1))}
    >
      <ChevronRight size={15} strokeWidth={1.6} aria-hidden />
      {label}
    </Button>
  )
}
