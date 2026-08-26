import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * حالة الخادم فقط: الجلب والكاش والمزامنة (§19).
 *
 * قاعدة معمارية: **لا تُخلط مع Zustand.** Zustand للحالة المؤقتة في الواجهة،
 * وهذا لبيانات الخادم. خلطهم أكثر خطأ متكرر في مشاريع Supabase.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
