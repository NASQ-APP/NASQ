import { RouterProvider } from 'react-router-dom'
import { AppProviders } from './providers'
import { router } from './router'
import { ToastHost } from '@/shared/components/ui'

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
      <ToastHost />
    </AppProviders>
  )
}
