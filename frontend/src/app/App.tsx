import { RouterProvider } from 'react-router-dom'
import { AppProviders } from './providers'
import { router } from './router'
import { ToastHost } from '@/shared/components/ui'
import { useStoreBridge } from '@/features/try-pieces/bridge'

export function App() {
  // استقبال القطع من إضافة المتصفح — بلا إضافة مركّبة ما يصير شي
  useStoreBridge()

  return (
    <AppProviders>
      <RouterProvider router={router} />
      <ToastHost />
    </AppProviders>
  )
}
