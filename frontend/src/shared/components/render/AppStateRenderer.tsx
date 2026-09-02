/**
 * حالة واحدة تُعرض في كل لحظة.
 *
 * الصفحات كانت تكتب `if (loading) … if (error) … if (!items.length) …` كلٌّ
 * بترتيبه، فتختلف الأولوية من صفحة لصفحة: هنا يسبق الفراغُ الخطأ، وهناك يظهر
 * هيكل التحميل فوق فشل. توحيد الترتيب في مكان واحد ينهي هذا.
 *
 * القرار نفسه في `state.ts` — نقيّ ومُختبَر. وهذا المكوّن يعرضه لا غير.
 */
import type { ReactNode } from 'react'
import { PageError } from './PageError'
import { PageLoader } from './PageLoader'
import { resolveRenderState } from './state'

export function AppStateRenderer({
  loading,
  error,
  empty,
  onRetry,
  loadingView,
  emptyView,
  errorView,
  loadingMessage,
  children,
}: {
  loading?: boolean
  /** أي قيمة صادقة تعني فشلاً — ولا يُعرض محتواها للمستخدمة */
  error?: unknown
  empty?: boolean
  onRetry?: () => void
  /** هيكل مطابق لتخطيط الصفحة حين نعرفه — أفضل من مؤشّر عائم */
  loadingView?: ReactNode
  emptyView?: ReactNode
  errorView?: ReactNode
  loadingMessage?: string
  children: ReactNode
}) {
  switch (resolveRenderState({ error, loading, empty })) {
    case 'error':
      return <>{errorView ?? <PageError onRetry={onRetry} />}</>
    case 'loading':
      return <>{loadingView ?? <PageLoader message={loadingMessage} />}</>
    case 'empty':
      return <>{emptyView}</>
    default:
      return <>{children}</>
  }
}
