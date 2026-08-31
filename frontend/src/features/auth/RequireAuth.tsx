/**
 * بوّابة التطبيق — لا دخول بلا حساب.
 *
 * كانت الجلسة اختيارية والدولاب محليًا في المتصفّح. بعد وصل الخادم صارت
 * البيانات مملوكة لحساب وتحميها RLS، فالدخول بلا حساب ما عاد له معنى: ما فيه
 * صفوف تُقرأ أصلاً.
 *
 * **الانتظار قبل الحكم**: جلسة Supabase تُقرأ من التخزين ثم تُتحقَّق مع الخادم،
 * وهذا يأخذ لحظة. لو حكمنا فورًا طردنا مستخدمة مسجّلة عند كل تحديث للصفحة.
 * فنعرض سكونًا لين تُحسم الجلسة، ثم نقرّر.
 */
import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '@/infrastructure/supabase'
import { currentUser } from '@/infrastructure/auth'
import { hasBackend } from '@/shared/config'
import { ROUTES } from '@/shared/config'
import { useWardrobe } from '@/features/wardrobe/store'
import { useAuth } from './store'

export function RequireAuth() {
  const user = useAuth((state) => state.user)
  const userId = user?.id
  const setUser = useAuth((state) => state.setUser)
  const [checked, setChecked] = useState(!hasBackend())
  const location = useLocation()

  useEffect(() => {
    if (!hasBackend() || !supabase) return
    let alive = true

    // الجلسة القائمة عند الإقلاع
    currentUser()
      .then((found) => {
        if (!alive) return
        setUser(found)
      })
      .catch(() => {
        if (alive) setUser(undefined)
      })
      .finally(() => {
        if (alive) setChecked(true)
      })

    // وأي تغيّر بعدها: خروج من تبويب آخر، أو انتهاء جلسة
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return
      if (!session) setUser(undefined)
    })

    return () => {
      alive = false
      data.subscription.unsubscribe()
    }
  }, [setUser])

  // خزانة المستخدمة تُقرأ **بعد** ما تُحسم هويتها، وتُنسى مع خروجها: القراءة
  // قبل الجلسة ترجع فاضية، والإبقاء بعد الخروج يعرض خزانتها لمن يجي بعدها.
  useEffect(() => {
    if (!checked) return
    if (userId) void useWardrobe.getState().load()
    else useWardrobe.getState().reset()
  }, [checked, userId])

  if (!checked) {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="text-[12.5px] text-muted">نتحقّق من جلستك…</p>
      </div>
    )
  }

  if (!user) {
    // نحفظ الوجهة فترجع لها المستخدمة بعد الدخول بدل ما تبدأ من الرئيسية
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
