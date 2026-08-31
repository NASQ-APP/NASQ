/**
 * الموديلات المحفوظة + الصورة الشخصية المحفوظة في الذاكرة فقط.
 *
 * الموديلات تُحفظ عشان يتكرر نفس الشخص في كل توليد (المبدأ ٣). أما الصورة
 * الشخصية فـ**مستثناة صراحة من التخزين** (§17): تعيش في ذاكرة الجلسة فقط
 * وتُحذف عند إعادة التحميل أو عند الضغط على «احذفي صورتي».
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storageKey } from '@/infrastructure/storage'
import { hasBackend } from '@/shared/config'
import { seedFrom, uid, uuid } from '@/shared/lib'
import { toast } from '@/shared/components/ui'
import * as remote from '@/infrastructure/model/repository'
import type { AiModel, ModelCharacteristics, ModelSource, UserPhoto } from '@/domain/model'
import type { Gender } from '@/domain/wardrobe'
import { readyModelFor } from '@/domain/model'

type ModelState = {
  models: AiModel[]
  /** الموديل اللي يستخدمه الاستوديو الآن */
  activeModelId?: string
  photo?: UserPhoto
  /** آخر وضع اختارته المستخدمة في الاستوديو */
  preferredSource: ModelSource

  /** يقرأ موديلات المستخدمة من الخادم بعد ما تُحسم الجلسة. */
  load: () => Promise<void>
  /** ينسى موديلات الجلسة عند الخروج. */
  reset: () => void

  saveModel: (characteristics: ModelCharacteristics, name?: string) => AiModel
  updateModel: (id: string, characteristics: ModelCharacteristics) => void
  deleteModel: (id: string) => void
  setDefault: (id: string) => void
  /** `undefined` يفكّ التثبيت فيرجع الاستوديو للموديل الافتراضي حسب الجنس */
  setActive: (id?: string) => void
  modelFor: (gender: Gender) => AiModel | undefined

  /** الموديل الجاهز المختار — يُحفظ فما تعيد المستخدمة الاختيار كل مرة */
  readyModelId?: string
  setReadyModel: (id?: string) => void

  setPhoto: (photo: UserPhoto) => void
  clearPhoto: () => void
  setPreferredSource: (source: ModelSource) => void
}

/**
 * صورة بطاقة الموديل.
 *
 * صورة الأساس حسب الجنس، لا رسمة متّجهة مبنية من المقاسات: الرسمة كانت تعطي
 * شكلاً تخطيطيًا ما يشبه جسمًا، وتوهم بدقة ما تملكها.
 */
const previewOf = (characteristics: ModelCharacteristics) =>
  readyModelFor(characteristics.gender).imageUrl

const defaultName = (g: Gender) => (g === 'female' ? 'موديلي النسائي' : 'موديلي الرجالي')

export const useAiModels = create<ModelState>()(
  persist(
    (set, get) => {
      let queue: Promise<void> = Promise.resolve()

      const push = (action: () => Promise<void>, whatFailed: string) => {
        if (!hasBackend()) return
        queue = queue.then(action).catch(() => {
          toast.error(`ما قدرنا نحفظ ${whatFailed} على الخادم — رجّعنا آخر نسخة محفوظة.`)
          return get().load()
        })
      }

      /** الموديل بمعرّفه من الحالة الحيّة — الكتابة ترسل الصفّ كاملًا. */
      const modelById = (id: string) => get().models.find((m) => m.id === id)

      return {
      models: [],
      preferredSource: 'model',

      load: async () => {
        if (!hasBackend()) return
        try {
          const models = await remote.fetchModels()
          set({ models })
        } catch {
          // القراءة فشلت: قائمة فاضية أصدق من موديلات مستخدمة قبلها
        }
      },

      reset: () => set({ models: [], activeModelId: undefined, readyModelId: undefined }),

      saveModel: (characteristics, name) => {
        const model: AiModel = {
          id: hasBackend() ? uuid() : uid('model'),
          name: name?.trim() || defaultName(characteristics.gender),
          characteristics,
          seed: seedFrom(JSON.stringify(characteristics)),
          previewImageUrl: previewOf(characteristics),
          isDefault: !get().models.some((m) => m.characteristics.gender === characteristics.gender),
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ models: [...state.models, model], activeModelId: model.id }))
        push(() => remote.insertModel(model), 'الموديل')
        return model
      },

      updateModel: (id, characteristics) => {
        set((state) => ({
          models: state.models.map((m) =>
            m.id === id
              ? {
                  ...m,
                  characteristics,
                  seed: seedFrom(JSON.stringify(characteristics)),
                  previewImageUrl: previewOf(characteristics),
                }
              : m,
          ),
        }))
        const updated = modelById(id)
        if (updated) push(() => remote.updateModel(updated), 'تعديل الموديل')
      },

      deleteModel: (id) => {
        set((state) => ({
          models: state.models.filter((m) => m.id !== id),
          activeModelId: state.activeModelId === id ? undefined : state.activeModelId,
        }))
        push(() => remote.deleteModel(id), 'حذف الموديل')
      },

      setDefault: (id) => {
        const gender = modelById(id)?.characteristics.gender
        if (!gender) return
        set((state) => ({
          models: state.models.map((m) =>
            m.characteristics.gender === gender ? { ...m, isDefault: m.id === id } : m,
          ),
        }))
        push(() => remote.setDefaultModel(id, gender), 'الموديل الافتراضي')
      },

      setActive: (activeModelId) => set({ activeModelId }),

      modelFor: (gender) => {
        const { models, activeModelId } = get()
        const active = models.find((m) => m.id === activeModelId)
        if (active?.characteristics.gender === gender) return active
        const forGender = models.filter((m) => m.characteristics.gender === gender)
        return forGender.find((m) => m.isDefault) ?? forGender[0]
      },

      setReadyModel: (readyModelId) => set({ readyModelId }),

      setPhoto: (photo) => set({ photo }),
      clearPhoto: () =>
        set((state) => {
          if (state.photo?.url.startsWith('blob:')) URL.revokeObjectURL(state.photo.url)
          return { photo: undefined }
        }),
      setPreferredSource: (source) => set({ preferredSource: source }),
      }
    },
    {
      name: storageKey('models'),
      version: 1,
      /*
        الموديلات على الخادم، فما نحفظ نسخة تزاحمه. ويبقى محليًا ما هو **خيار جهاز**
        لا ملكًا: أي موديل مثبّت الآن، وأي وضع عرض اختارته. رفعهما للخادم يعني
        أن تفتح جهازًا فيقفز لموديل ثبّتته على جهاز ثانٍ.

        والصورة الشخصية مستثناة عمدًا من التخزين كلّه (§17).
      */
      partialize: (state) => ({
        ...(hasBackend() ? {} : { models: state.models }),
        activeModelId: state.activeModelId,
        readyModelId: state.readyModelId,
        preferredSource: state.preferredSource,
      }),
      /** الإصدار ١: انتقلت الموديلات للخادم — أي نسخة محفوظة تُسقط. */
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<ModelState>
        return {
          activeModelId: state.activeModelId,
          readyModelId: state.readyModelId,
          preferredSource: state.preferredSource ?? 'model',
          models: hasBackend() || version < 1 ? [] : (state.models ?? []),
        }
      },
    },
  ),
)
