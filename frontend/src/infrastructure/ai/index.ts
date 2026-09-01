/**
 * نقطة الدخول لتوليد الصور.
 *
 * التطبيق يستورد `aiImageProvider` ولا شيء غيره. اليوم ينفّذه دالة الحافة
 * `images-generate` — **والمتصفح لا يملك أي مفتاح مزوّد ولا يعرف اسمه**.
 */
import { edgeFunctionImageProvider } from './EdgeFunctionImageProvider'
import type { AIImageProvider } from '@/domain/tryon'

export const aiImageProvider: AIImageProvider = edgeFunctionImageProvider

export { edgeFunctionImageProvider } from './EdgeFunctionImageProvider'
