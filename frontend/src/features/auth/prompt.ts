/**
 * طلب الحساب عند أول فعل يحتاجه.
 *
 * الزائرة تتصفّح بلا حساب، فلمّا تمدّ يدها لفعلٍ يُكتب — قطعة، موديل، إطلالة —
 * نوقف الفعل ونقول **لماذا** بدل ما نقذفها لصفحة دخول بلا سياق. السبب يُمرَّر
 * مع الطلب لأن «سجّلي دخولك» وحدها لا تجيب سؤالها: ليش الحين بالذات؟
 *
 * ومخزن صغير لا `context`: الطالب قد يكون زر في قاع صفحة والنافذة في القشرة،
 * ورفع الحالة بينهما عبر props يمرّ بكل ما بينهما بلا فائدة.
 */
import { create } from 'zustand'

type PromptState = {
  /** ما الذي أوقفناه؟ صيغة تكمل «تحتاجين حسابًا …». `undefined` = النافذة مغلقة. */
  reason?: string
  ask: (reason: string) => void
  close: () => void
}

export const useSignInPrompt = create<PromptState>()((set) => ({
  ask: (reason) => set({ reason }),
  close: () => set({ reason: undefined }),
}))
