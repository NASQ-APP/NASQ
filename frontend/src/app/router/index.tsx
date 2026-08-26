import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/app/layout/AppShell'
import { ROUTES } from '@/shared/config'
import { CreateModelPage } from '@/pages/CreateModelPage'
import { HomePage } from '@/pages/HomePage'
import { ItemPage } from '@/pages/ItemPage'
import { LooksPage } from '@/pages/LooksPage'
import { ModelsPage } from '@/pages/ModelsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { StudioPage } from '@/pages/StudioPage'
import { TravelPage } from '@/pages/TravelPage'
import { TripPage } from '@/pages/TripPage'
import { TryPiecesPage } from '@/pages/TryPiecesPage'
import { WardrobePage } from '@/pages/WardrobePage'
import { WardrobesPage } from '@/pages/WardrobesPage'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: ROUTES.home, element: <HomePage /> },
      { path: ROUTES.wardrobes, element: <WardrobesPage /> },
      { path: '/wardrobe/:id', element: <WardrobePage /> },
      { path: '/item/:id', element: <ItemPage /> },
      { path: ROUTES.studio, element: <StudioPage /> },
      { path: ROUTES.looks, element: <LooksPage /> },
      { path: ROUTES.travel, element: <TravelPage /> },
      { path: '/travel/:id', element: <TripPage /> },
      { path: ROUTES.tryPieces, element: <TryPiecesPage /> },
      { path: ROUTES.models, element: <ModelsPage /> },
      { path: ROUTES.newModel, element: <CreateModelPage /> },
      { path: '/models/:id', element: <CreateModelPage /> },
      { path: ROUTES.settings, element: <SettingsPage /> },
      { path: ROUTES.privacy, element: <PrivacyPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
