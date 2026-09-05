/**
 * رابط لصفحة تحتاج حسابًا — يبقى رابطًا لصاحبته، ويصير سؤالاً للزائرة.
 *
 * `RequireAuth` يحرس الصفحة نفسها، لكن حراسته **تحويل**: الزائرة تضغط «أنشئ
 * موديلك» فتجد نفسها في صفحة دخول بلا كلمة تفسّر لماذا. فنسبق التحويل بسؤال
 * يقول السبب، والحارس يبقى الشبكة الأخيرة لمن وصل بالرابط مباشرة.
 *
 * ولمن معها حساب يبقى `<a>` حقيقيًا: الضغط الأوسط و«فتح في تبويب جديد»
 * يشتغلان، والفأرة تشوف الوجهة في شريط الحالة.
 */
import type { ReactNode } from 'react'
import { Button, ButtonLink } from '@/shared/components/ui'
import type { ButtonSize, ButtonVariant } from '@/shared/components/ui'
import { useAuth } from './store'
import { useSignInPrompt } from './prompt'

/*
  الأنماط وحدها تُمرَّر — لا `ComponentProps` كاملة.

  المكوّن يتحوّل بين `<a>` و`<button>`، وعقدهما يختلف (`ref` و`href` و`type`)،
  فتمرير كل خصائص الرابط لزرّ لا يُترجم. والمشترك بينهما هو الشكل، فهو ما نقبله.
*/
type Props = {
  to: string
  /** يكمل «تحتاجين حسابًا …» في النافذة */
  reason: string
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  className?: string
}

export function AccountLink({ reason, to, children, ...style }: Props) {
  const signedIn = useAuth((state) => Boolean(state.user))
  const ask = useSignInPrompt((state) => state.ask)

  if (signedIn) {
    return (
      <ButtonLink to={to} {...style}>
        {children}
      </ButtonLink>
    )
  }

  return (
    <Button {...style} onClick={() => ask(reason)}>
      {children}
    </Button>
  )
}
