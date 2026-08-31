import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { useItemPhotos } from './features/wardrobe/photos'
import { hasBackend } from './shared/config'
import './theme/theme.css'

// هجرة مفاتيح الاسم القديم تصير في `persistConfig` نفسه — لازم تسبق إنشاء
// المخازن، ونداؤها من هنا يجي بعد `import { App }` فيتأخر عنها.

// بلا خادم الصور في IndexedDB وتُقرأ مرة وحدة عند الإقلاع. ومع خادم مهيّأ هي
// في سلّة المستخدمة، فقراءتها تنتظر الجلسة — يستدعيها `RequireAuth` مع قراءة الخزانة.
if (!hasBackend()) void useItemPhotos.getState().hydrate()

/*
  تسجيل عامل الخدمة — شرط تثبيت التطبيق على الجوال، وبالتثبيت يظهر نَسّق في
  قائمة «مشاركة» فتقدر المستخدمة ترسل له قطعة من أي متجر بلا إضافة متصفّح.

  **في البناء النهائي فقط**: أثناء التطوير يعترض العامل طلبات Vite فيكسر التحديث
  الحيّ. والفشل ما يوقف شيءًا: التثبيت تحسين، والتطبيق يشتغل في المتصفّح كما هو.
*/
if (!import.meta.env.DEV && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
