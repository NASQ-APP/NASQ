import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { useItemPhotos } from './features/wardrobe/photos'
import './theme/theme.css'

// هجرة مفاتيح الاسم القديم تصير في `persistConfig` نفسه — لازم تسبق إنشاء
// المخازن، ونداؤها من هنا يجي بعد `import { App }` فيتأخر عنها.

// صور القطع المرفوعة تُقرأ من IndexedDB مرة وحدة، فتصير متاحة لكل بطاقة فورًا
void useItemPhotos.getState().hydrate()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
