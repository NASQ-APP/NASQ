/**
 * الموديلات المحفوظة + الصورة الشخصية المحفوظة في الذاكرة فقط.
 *
 * الموديلات تُحفظ عشان يتكرر نفس الشخص في كل توليد (المبدأ ٣). أما الصورة
 * الشخصية فـ**مستثناة صراحة من التخزين** (§17): تعيش في ذاكرة الجلسة فقط
 * وتُحذف عند إعادة التحميل أو عند الضغط على «احذفي صورتي».
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { modelImageUrl } from '@/infrastructure/rendering'
import { renderTheme } from '@/theme'
import { storageKey } from '@/infrastructure/storage'
import { seedFrom, uid } from '@/shared/lib'
import type { AiModel, ModelCharacteristics, ModelSource, UserPhoto } from '@/domain/model'
import type { Gender } from '@/domain/wardrobe'

type ModelState = {
  models: AiModel[]
  /** الموديل اللي يستخدمه الاستوديو الآن */
  activeModelId?: string
  photo?: UserPhoto
  /** آخر وضع اختارته المستخدمة في الاستوديو */
  preferredSource: ModelSource

  saveModel: (characteristics: ModelCharacteristics, name?: string) => AiModel
  updateModel: (id: string, characteristics: ModelCharacteristics) => void
  deleteModel: (id: string) => void
  setDefault: (id: string) => void
  setActive: (id: string) => void
  modelFor: (gender: Gender) => AiModel | undefined

  /** الموديل الجاهز المختار — يُحفظ فما تعيد المستخدمة الاختيار كل مرة */
  readyModelId?: string
  setReadyModel: (id?: string) => void

  setPhoto: (photo: UserPhoto) => void
  clearPhoto: () => void
  setPreferredSource: (source: ModelSource) => void
}

const previewOf = (characteristics: ModelCharacteristics) =>
  modelImageUrl({ characteristics, framing: 'full', background: renderTheme.background })

const defaultName = (g: Gender) => (g === 'female' ? 'موديلي النسائي' : 'موديلي الرجالي')

export const useAiModels = create<ModelState>()(
  persist(
    (set, get) => ({
      models: [],
      preferredSource: 'model',

      saveModel: (characteristics, name) => {
        const model: AiModel = {
          id: uid('model'),
          name: name?.trim() || defaultName(characteristics.gender),
          characteristics,
          seed: seedFrom(JSON.stringify(characteristics)),
          previewImageUrl: previewOf(characteristics),
          isDefault: !get().models.some((m) => m.characteristics.gender === characteristics.gender),
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ models: [...state.models, model], activeModelId: model.id }))
        return model
      },

      updateModel: (id, characteristics) =>
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
        })),

      deleteModel: (id) =>
        set((state) => ({
          models: state.models.filter((m) => m.id !== id),
          activeModelId: state.activeModelId === id ? undefined : state.activeModelId,
        })),

      setDefault: (id) =>
        set((state) => {
          const target = state.models.find((m) => m.id === id)
          if (!target) return state
          return {
            models: state.models.map((m) =>
              m.characteristics.gender === target.characteristics.gender
                ? { ...m, isDefault: m.id === id }
                : m,
            ),
          }
        }),

      setActive: (id) => set({ activeModelId: id }),

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
    }),
    {
      name: storageKey('models'),
      // الصورة الشخصية مستثناة عمدًا من التخزين (§17)
      partialize: (state) => ({
        models: state.models,
        activeModelId: state.activeModelId,
        readyModelId: state.readyModelId,
        preferredSource: state.preferredSource,
      }),
    },
  ),
)
