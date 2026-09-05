/**
 * بوّابة الأفعال: يمرّ الفعل لصاحبة الحساب، ويُستبدل بطلب دخول للزائرة.
 *
 * الحراسة هنا لا في المخزن: المخزن يعرف الكتابة ولا يعرف نيّة المستخدمة، فرفضه
 * الصامت يترك الزر يُضغط بلا أثر. والحراسة عند الزر تجعل الرفض **مقروءًا**.
 *
 *     const gate = useAccountGate()
 *     <Button onClick={gate('عشان تضيفين قطعة لخزانتك', openAdd)} />
 *
 * والفعل يبقى فعلًا: الغلاف يمرّر معاملاته كما هي، فما يتغيّر شيء عند صاحبة
 * الحساب — لا تأخير ولا خطوة زائدة.
 */
import { useCallback } from 'react'
import { useAuth } from './store'
import { useSignInPrompt } from './prompt'

export function useAccountGate() {
  const signedIn = useAuth((state) => Boolean(state.user))
  const ask = useSignInPrompt((state) => state.ask)

  return useCallback(
    <A extends unknown[]>(reason: string, action: (...args: A) => unknown) =>
      (...args: A) => {
        if (signedIn) {
          action(...args)
          return
        }
        ask(reason)
      },
    [signedIn, ask],
  )
}

/** للحالات التي تحتاج السؤال نفسه لا غلافًا حوله — كقرار داخل دالة أطول. */
export function useIsGuest(): boolean {
  return useAuth((state) => !state.user)
}
