import { RouterProvider } from 'react-router-dom'
import { AppProviders } from './providers'
import { router } from './router'
import { ToastHost } from '@/shared/components/ui'
import { StoreBridge } from '@/features/try-pieces/StoreBridge'

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
      {/* استقبال القطع من إضافة المتصفح، وسؤال الفئة لما تنقص */}
      <StoreBridge />
      <ToastHost />
    </AppProviders>
  )
}
