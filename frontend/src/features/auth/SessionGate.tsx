/**
 * حسم الجلسة قبل أي رسم — بلا حكم ولا طرد.
 *
 * التصفّح **مفتوح**: من تفتح الموقع تدخل وتتجوّل وتشوف الشكل بلا حساب. الحساب
 * يُطلب عند أول فعل يملك أثرًا — إضافة قطعة، أو إنشاء موديل، أو حفظ إطلالة —
 * لأن هذي أشياء تُكتب لصاحبها وتحميها RLS، فبلا حساب ما فيه وين تُكتب. أما
 * النظر فما يحتاج ملكية.
 *
 * وهذي الطبقة تعرف الهوية فقط: تقرأ الجلسة، وتحمّل بيانات صاحبتها، وتنسى
 * بياناتها عند خروجها. الحراسة نفسها في `RequireAuth` وفي `useAccountGate`.
 *
 * **الانتظار قبل الرسم**: جلسة Supabase تُقرأ من التخزين ثم تُتحقَّق مع الخادم،
 * وهذا يأخذ لحظة. لو رسمنا قبلها لظهرت الصفحة كأنها لزائرة ثم انقلبت — وميض
 * يقول إن التطبيق متردّد في معرفة من أمامه.
 */
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { GlobalLoader } from '@/shared/components/render'
import { supabase } from '@/infrastructure/supabase'
import { currentUser } from '@/infrastructure/auth'
import { hasBackend } from '@/shared/config'
import { clearForeignRecords } from '@/infrastructure/storage'
import { useWardrobe } from '@/features/wardrobe/store'
import { useLooks } from '@/features/looks/store'
import { useAiModels } from '@/features/ai-model/store'
import { useTravel } from '@/features/travel/store'
import { useOnboarding } from '@/features/onboarding/store'
import { useAuth } from './store'

export function SessionGate() {
  const userId = useAuth((state) => state.user?.id)
  const setUser = useAuth((state) => state.setUser)
  const [checked, setChecked] = useState(!hasBackend())

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

  /*
    بيانات المستخدمة تُقرأ **بعد** ما تُحسم هويتها، وتُنسى مع خروجها: القراءة
    قبل الجلسة ترجع فاضية، والإبقاء بعد الخروج يعرض خزانتها لمن يجي بعدها.

    والزائرة تمرّ من نفس الفرع: مخازن فاضية تُرسم بحالاتها الفاضية، فتشوف
    الصفحات كما هي بلا أن ترى شيئًا لأحد.

    الخزانة أولًا ووحدها بانتظار: الإطلالة تقرأ فئة قطعها من الخزانة لتعرف ميلها في
    الجسم، فلو وصلت قبلها سقطت القطع على القيمة الاحتياطية. الباقي مستقل فيمشي معًا.
  */
  useEffect(() => {
    if (!checked) return

    /*
      وآخر إطلالة مولّدة تُمحى مع كل حسمٍ للهوية لا مع الخروج وحده.

      هي في IndexedDB — صورة تقارب الميجابايت — وحجبها عن غير صاحبها يتم عند
      القراءة، لكن الحجب لا يمحو: تبقى في متصفّح من لا يملكها إلى أن يُولَّد ما
      يستبدلها. فالممرّ هنا يمحو ما ليس لصاحب الجلسة، ويُبقي سجلّه هو.
    */
    void clearForeignRecords(userId)

    if (!userId) {
      useWardrobe.getState().reset()
      useLooks.getState().reset()
      useAiModels.getState().reset()
      useTravel.getState().reset()
      return
    }

    void (async () => {
      await useWardrobe.getState().load()
      await Promise.all([
        useLooks.getState().load(),
        useAiModels.getState().load(),
        useTravel.getState().load(),
        useOnboarding.getState().load(),
      ])
    })()
  }, [checked, userId])

  if (!checked) {
    /*
      شاشة الإقلاع الوحيدة — والانتظار هنا لا في الصفحات: من يهبط على أي
      مسار ينتظر مرة واحدة ثم يتصفّح بلا انقطاع، والحرّاس تحته يجدون الهوية
      محسومة فما يحتاجون انتظارًا ثانيًا.
    */
    return <GlobalLoader fullScreen message="لحظة ونجهّز لك كل شيء" />
  }

  return <Outlet />
}
