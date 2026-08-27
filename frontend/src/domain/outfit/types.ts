/**
 * أنواع الإطلالة.
 *
 * `Framing` قصّة الكاميرا التي يرسم بها عارض الموديل نفسه، و`SavedLook`
 * الإطلالة كما تُحفظ في «إطلالاتي». الاثنان مستقلان عن أي توليد.
 */
import type { BodySlot } from '@/domain/shared/types'

export type { BodySlot }

/** قصّة الكاميرا عند رسم الموديل. */
export type Framing = 'full' | 'upper' | 'lower' | 'detail'

/** إطلالة محفوظة: صورتها مع معرّفات القطع اللي صنعتها فعليًا (S-06). */
export type SavedLook = {
  id: string
  number: number
  name: string
  occasion: string
  resultImageUrl: string
  modelId?: string
  itemIds: string[]
  framing: Framing
  notes?: string
  createdAt: string
}
