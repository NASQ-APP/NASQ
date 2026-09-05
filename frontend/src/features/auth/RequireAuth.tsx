/**
 * حارس المسارات المملوكة.
 *
 * أكثر التطبيق مفتوح للتصفّح (انظر `SessionGate`)، وهذا الحارس لا يغطّي إلا
 * الصفحات التي **لا معنى لها بلا صاحب**: إنشاء موديل، والإعدادات، ومقصد
 * المشاركة. صفحة تكتب في حساب لا وجود له ليست صفحة فاضية — هي صفحة كاذبة.
 *
 * الهوية محسومة قبل الوصول هنا — `SessionGate` فوقنا لا يرسم إلا بعد حسمها —
 * فما نحتاج انتظارًا ثانيًا، ولا يصير طرد لمستخدمة مسجّلة عند تحديث الصفحة.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ROUTES } from '@/shared/config'
import { useAuth } from './store'

export function RequireAuth() {
  const user = useAuth((state) => state.user)
  const location = useLocation()

  if (!user) {
    /*
      نحفظ الوجهة **بمعاملاتها**، لا مسارها وحده.

      قطعة تشاركها من متجر تصل على `/share?url=…` — فإسقاط المعاملات يعني إنها
      تسجّل دخولها ثم تلقى صفحة تقول «ما وصلنا رابط». القطعة هي المعاملة.
    */
    return (
      <Navigate
        to={ROUTES.login}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  return <Outlet />
}
