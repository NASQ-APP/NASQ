import type { ReactNode } from 'react'
import { QueryProvider } from './QueryProvider'

/** كل مزوّدات التطبيق في مكان واحد — الترتيب من الخارج للداخل. */
export function AppProviders({ children }: { children: ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>
}
