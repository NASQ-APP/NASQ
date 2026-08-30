/**
 * نقطة الدخول لتوليد الصور.
 *
 * التطبيق يستورد `aiImageProvider` ولا شيء غيره. من ينفّذه يُقرّر هنا، فنقله
 * لخادم لاحقًا = سطر واحد في هذا الملف.
 */
import { openRouterImageProvider } from './OpenRouterImageProvider'
import type { AIImageProvider } from '@/domain/tryon'

export const aiImageProvider: AIImageProvider = openRouterImageProvider

export { openRouterImageProvider } from './OpenRouterImageProvider'
