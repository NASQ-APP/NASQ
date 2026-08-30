/**
 * الموديلات الجاهزة.
 *
 * صور فوتوغرافية حقيقية كاملة الجسم، مواجهة للكاميرا، بوقفة محايدة وخلفية
 * بيضاء. ليست رسومًا متّجهة: الرسم المتّجه يعطي شكلاً تخطيطيًا لا يشبه جسمًا،
 * والمعاينة على جسم حقيقي هي المقصد.
 *
 * الملفات في `public/models/` فتُخدَم كما هي بلا معالجة.
 */
import type { Gender } from '@/domain/shared/types'

export type ReadyModel = {
  id: 'ready-female' | 'ready-male'
  name: string
  gender: Gender
  imageUrl: string
  note: string
}

export const READY_MODELS: ReadyModel[] = [
  {
    id: 'ready-female',
    name: 'الموديل النسائي',
    gender: 'female',
    imageUrl: '/models/female-base.png',
    note: 'لقطة كاملة · وقفة محايدة',
  },
  {
    id: 'ready-male',
    name: 'الموديل الرجالي',
    gender: 'male',
    imageUrl: '/models/male-base.png',
    note: 'لقطة كاملة · وقفة محايدة',
  },
]

export const readyModelById = (id: string): ReadyModel | undefined =>
  READY_MODELS.find((model) => model.id === id)

export const readyModelFor = (gender: Gender): ReadyModel =>
  READY_MODELS.find((model) => model.gender === gender) ?? READY_MODELS[0]
