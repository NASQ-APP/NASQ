/**
 * ما صرّحت به المستخدمة في التعارف الأول.
 *
 * **يُخزَّن** — بعكس المُلاحَظ من الإلهامات. السبب: هذا قرارها هي، وما يمكن
 * اشتقاقه من سلوكها لاحقًا. لو ما حفظناه ضاع، وسألناها مرة ثانية.
 *
 * ما فيه هنا أي منطق للستايليست — تخزين فقط. الدمج في `domain/style/merge`.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storageKey } from '@/infrastructure/storage'
import { EMPTY_DECLARED } from '@/domain/style/types'
import type { AvoidRule, DeclaredStyle } from '@/domain/style/types'
import type { ItemColor } from '@/domain/wardrobe'

type OnboardingState = {
  declared: DeclaredStyle
  /** يحدّث جزءًا أثناء الخطوات — بلا ختم إكمال */
  patch: (patch: Partial<DeclaredStyle>) => void
  /** يضيف أو يشيل وسمًا — بحدّ أعلى */
  toggleTag: (tag: string, max: number) => void
  /** يضيف أو يشيل لونًا — بحدّ أعلى */
  toggleColor: (color: ItemColor, max: number) => void
  toggleContext: (id: string) => void
  toggleAvoid: (rule: AvoidRule) => void
  /** يختم التعارف: يثبّت التاريخ فيصير الملف «مُصرَّحًا» */
  complete: () => void
  /** يعيد التعارف من الإعدادات — يمسح كل شي بما فيه القيود */
  reset: () => void
}

/**
 * التبديل يصير **داخل** `set` لا في المكوّن.
 *
 * لو حسبناه من قيمة التقطها الرسم، ضاع أحد اختيارين متتاليين بسرعة: الثاني
 * يُبنى على حالة ما تحدّثت بعد فيمسح الأول. القراءة من الحالة الحيّة تحلّها.
 */
const flip = <T,>(list: T[], value: T, same: (a: T, b: T) => boolean, max?: number): T[] => {
  if (list.some((entry) => same(entry, value))) return list.filter((entry) => !same(entry, value))
  if (max !== undefined && list.length >= max) return list
  return [...list, value]
}

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set) => ({
      declared: EMPTY_DECLARED,

      patch: (patch) =>
        set((state) => ({ declared: { ...state.declared, ...patch } })),

      toggleTag: (tag, max) =>
        set((state) => ({
          declared: {
            ...state.declared,
            tags: flip(state.declared.tags, tag, (a, b) => a === b, max),
          },
        })),

      toggleColor: (color, max) =>
        set((state) => ({
          declared: {
            ...state.declared,
            colors: flip(state.declared.colors, color, (a, b) => a.name === b.name, max),
          },
        })),

      toggleContext: (id) =>
        set((state) => ({
          declared: {
            ...state.declared,
            contexts: flip(state.declared.contexts, id, (a, b) => a === b),
          },
        })),

      toggleAvoid: (rule) =>
        set((state) => ({
          declared: {
            ...state.declared,
            avoid: flip(state.declared.avoid, rule, (a, b) => a === b),
          },
        })),

      complete: () =>
        set((state) => ({
          declared: { ...state.declared, completedAt: new Date().toISOString() },
        })),

      reset: () => set({ declared: EMPTY_DECLARED }),
    }),
    { name: storageKey('onboarding') },
  ),
)

/** هل أكملت المستخدمة التعارف؟ تقرأه القشرة لتقرّر عرض الترحيب. */
export const useHasOnboarded = (): boolean =>
  useOnboarding((state) => Boolean(state.declared.completedAt))
