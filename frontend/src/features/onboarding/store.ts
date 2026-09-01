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
import { hasBackend } from '@/shared/config'
import { fetchPreferences, saveDeclaredStyle } from '@/infrastructure/profile/repository'
import { toggleIn } from '@/domain/style/onboarding'
import { EMPTY_DECLARED } from '@/domain/style/types'
import type { AvoidRule, DeclaredStyle } from '@/domain/style/types'
import type { Gender } from '@/domain/shared/types'
import type { ItemColor } from '@/domain/wardrobe'

type OnboardingState = {
  declared: DeclaredStyle
  /** يحدّث جزءًا أثناء الخطوات — بلا ختم إكمال */
  patch: (patch: Partial<DeclaredStyle>) => void
  /** يثبّت الجنس **فورًا** — لا ينتظر ختم التعارف */
  setGender: (gender: Gender) => void
  /** يضيف أو يشيل وسمًا — بلا سقف */
  toggleTag: (tag: string) => void
  /** يضيف أو يشيل لونًا — بلا سقف */
  toggleColor: (color: ItemColor) => void
  toggleContext: (id: string) => void
  toggleAvoid: (rule: AvoidRule) => void
  /** يختم التعارف: يثبّت التاريخ فيصير الملف «مُصرَّحًا» */
  complete: () => void
  /** يحفظ ما عدّلته من الإعدادات، ويختم التعارف لو كانت تخطّته أول مرة */
  save: (declared: DeclaredStyle) => Promise<void>
  /** يعيد التعارف من الإعدادات — يمسح كل شي بما فيه القيود */
  reset: () => void
  /** يقرأ ذوقها المصرَّح من ملفها على الخادم. */
  load: () => Promise<void>
}

/*
  التبديل يصير **داخل** `set` لا في المكوّن.

  لو حسبناه من قيمة التقطها الرسم، ضاع أحد اختيارين متتاليين بسرعة: الثاني
  يُبنى على حالة ما تحدّثت بعد فيمسح الأول. القراءة من الحالة الحيّة تحلّها.
*/

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set, get) => ({
      declared: EMPTY_DECLARED,

      patch: (patch) =>
        set((state) => ({ declared: { ...state.declared, ...patch } })),

      /*
        الجنس يُحفظ لحظة اختياره، خلافًا لبقيّة الأسئلة.

        الباقي مسوّدة تنتظر الختم — وهذا صحيح لأنها تتغيّر عشرات المرات قبل أن
        تستقر. أما الجنس فيُختار مرة، وعليه يُبنى كل ما بعده: الخيارات المعروضة
        وصيغة المخاطبة في كل شاشة. فلو انتظر الختم، ضاع ممن تخطّى التعارف —
        وهو الوحيد الذي لا يُتخطّى.

        والفشل يُبتلع: الجواب باقٍ في الذاكرة لهذي الجلسة، والخطأ هنا لا يستحق
        أن يوقف سؤالاً بضغطة.
      */
      setGender: (gender) => {
        set((state) => ({ declared: { ...state.declared, gender } }))
        if (hasBackend()) void saveDeclaredStyle(get().declared).catch(() => {})
      },

      toggleTag: (tag) =>
        set((state) => ({
          declared: {
            ...state.declared,
            tags: toggleIn(state.declared.tags, tag, (a, b) => a === b),
          },
        })),

      toggleColor: (color) =>
        set((state) => ({
          declared: {
            ...state.declared,
            colors: toggleIn(state.declared.colors, color, (a, b) => a.name === b.name),
          },
        })),

      toggleContext: (id) =>
        set((state) => ({
          declared: {
            ...state.declared,
            contexts: toggleIn(state.declared.contexts, id, (a, b) => a === b),
          },
        })),

      toggleAvoid: (rule) =>
        set((state) => ({
          declared: {
            ...state.declared,
            avoid: toggleIn(state.declared.avoid, rule, (a, b) => a === b),
          },
        })),

      /*
        الحفظ على الخادم يصير **عند الختم فقط**، لا مع كل لمسة.

        الخطوات مسودّة تتغيّر عشرات المرات قبل ما تستقر، وإرسال كل وسم يعني طلبًا
        لكل ضغطة. ومن تخرج قبل الختم ما صرّحت بشيء بعد.
      */
      complete: () => {
        set((state) => ({
          declared: { ...state.declared, completedAt: new Date().toISOString() },
        }))
        if (hasBackend()) void saveDeclaredStyle(get().declared).catch(() => {})
      },

      /*
        الحفظ من الإعدادات يشبه الختم، ويفترق عنه في شيء واحد: **التاريخ**.

        `completedAt` يقول متى عرفنا ذوقها أول مرة، فتعديل وسم بعد شهر ما
        يجعلها «تعرّفت اليوم». ومن تخطّت التعارف وجاوبت هنا تُختم الآن — لأن
        هذا أول جواب فعلاً.

        والخطأ يُرمى لا يُبتلع: الصفحة تقول «ما حفظنا» بدل ما تُظهر نجاحًا كاذبًا.
      */
      save: async (declared) => {
        const stamped = {
          ...declared,
          completedAt: declared.completedAt ?? new Date().toISOString(),
        }
        set({ declared: stamped })
        if (hasBackend()) await saveDeclaredStyle(stamped)
      },

      reset: () => {
        set({ declared: EMPTY_DECLARED })
        if (hasBackend()) void saveDeclaredStyle(EMPTY_DECLARED).catch(() => {})
      },

      load: async () => {
        if (!hasBackend()) return
        try {
          const { declared } = await fetchPreferences()
          if (declared) set({ declared: { ...EMPTY_DECLARED, ...declared } })
        } catch {
          // القراءة فشلت: يبدأ التعارف من جديد بدل ذوق مستخدمة قبلها
        }
      },
    }),
    {
      name: storageKey('onboarding'),
      version: 1,
      // الذوق المصرَّح ملك للمستخدمة لا للجهاز، فمع الخادم يُقرأ منه وحده
      partialize: (state) => (hasBackend() ? {} : { declared: state.declared }),
      migrate: (persisted, version) =>
        hasBackend() || version < 1
          ? { declared: EMPTY_DECLARED }
          : (persisted as OnboardingState),
    },
  ),
)

/** هل أكملت المستخدمة التعارف؟ تقرأه القشرة لتقرّر عرض الترحيب. */
export const useHasOnboarded = (): boolean =>
  useOnboarding((state) => Boolean(state.declared.completedAt))
