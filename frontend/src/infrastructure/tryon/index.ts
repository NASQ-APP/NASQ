/**
 * نقطة الدخول للتجربة الافتراضية.
 *
 * التطبيق يستورد `tryOnProvider` ولا شيء غيره. مين هو المزوّد يُقرّر هنا من
 * إعداد البناء، فتوجيه التطبيق لمزوّد حقيقي تغييرُ سطر واحد بلا لمس أي مكوّن:
 *
 *   VITE_TRYON_PROVIDER=local | backend
 *
 * أسماء المزوّدين ومفاتيحهم ما تظهر في الفرونت-إند أبدًا — الباك-إند يملكها.
 */
import { env } from '@/shared/config'
import { localTryOnProvider } from './localProvider'
import { backendTryOnProvider } from './backendProvider'
import type { VirtualTryOnProvider } from '@/domain/outfit'

const REGISTRY: Record<string, VirtualTryOnProvider> = {
  local: localTryOnProvider,
  backend: backendTryOnProvider,
}

export const tryOnProvider: VirtualTryOnProvider = REGISTRY[env.tryOnProvider] ?? localTryOnProvider

export { localTryOnProvider } from './localProvider'
export { backendTryOnProvider } from './backendProvider'
export { PHOTO_GUIDELINES, validatePhoto } from './photo'
