/**
 * نظام العرض المشترك — انتظار وخطأ وفراغ وصور، بلغة بصرية واحدة.
 *
 * `EmptyState` يبقى في `ui/` حيث كان: هو عنصر واجهة مثل الزر والبطاقة، وليس
 * حالة تحميل. نقله لأجل الترتيب وحده يكسر كل من يستورده بلا مقابل.
 */
export { GlobalLoader } from './GlobalLoader'
export { PageLoader } from './PageLoader'
export { InlineLoader } from './InlineLoader'
export { PageError } from './PageError'
export { AIProcessingState } from './AIProcessingState'
export { ImageWithFallback } from './ImageWithFallback'
export { AppStateRenderer } from './AppStateRenderer'
export { WardrobeGridSkeleton, LooksGridSkeleton, SettingsSkeleton } from './skeletons'
export { resolveRenderState } from './state'

export type { GlobalLoaderProps } from './GlobalLoader'
export type { PageErrorKind } from './PageError'
export type { AIStageLabel } from './AIProcessingState'
export type { RenderState } from './state'
