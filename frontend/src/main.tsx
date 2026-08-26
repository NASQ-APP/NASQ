import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { LEGACY_STORES, migrateLegacyStorage } from './infrastructure/storage'
import { useItemPhotos } from './features/wardrobe/photos'
import './theme/theme.css'

// هجرة بيانات الاسم القديم قبل ما تُقرأ المخازن (X-05)
migrateLegacyStorage([...LEGACY_STORES])

// صور القطع المرفوعة تُقرأ من IndexedDB مرة وحدة، فتصير متاحة لكل بطاقة فورًا
void useItemPhotos.getState().hydrate()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
