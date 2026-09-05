import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/app/layout/AppShell'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { SessionGate } from '@/features/auth/SessionGate'
import { ROUTES } from '@/shared/config'
import { CreateModelPage } from '@/pages/CreateModelPage'
import { HomePage } from '@/pages/HomePage'
import { ItemPage } from '@/pages/ItemPage'
import { LoginPage } from '@/pages/LoginPage'
import { LooksPage } from '@/pages/LooksPage'
import { ModelsPage } from '@/pages/ModelsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SharePage } from '@/pages/SharePage'
import { SignUpPage } from '@/pages/SignUpPage'
import { WelcomePage } from '@/pages/WelcomePage'
import { StudioPage } from '@/pages/StudioPage'
import { TravelPage } from '@/pages/TravelPage'
import { TripPage } from '@/pages/TripPage'
import { TryPiecesPage } from '@/pages/TryPiecesPage'
import { WardrobePage } from '@/pages/WardrobePage'
import { WardrobesPage } from '@/pages/WardrobesPage'

/*
  الموقع يُتصفَّح بلا حساب.

  الجلسة تُحسم مرة واحدة في `SessionGate` فوق الكل — بلا حكم — ثم يمشي كل شيء:
  الزائرة تدخل الصفحات وتشوف شكل التطبيق، ومخازنها فاضية فتُرسم حالات الفراغ
  كما صُمّمت. الحساب يُطلب في موضعين فقط:

  1. **صفحات لا معنى لها بلا صاحب** — تحت `RequireAuth` هنا.
  2. **أفعال تُكتب** — عند أزرارها عبر `useAccountGate`، فتُشرح بدل ما يُقذف
     صاحبها لصفحة دخول بلا سياق.

  ونقطة الاختلاف بينهما: صفحة إنشاء موديل بلا حساب نموذج يُملأ ثم يضيع، أما
  صفحة الخزانة بلا حساب فهي خزانة فاضية — وهذي حالة صادقة تستحق أن تُرى.
*/
export const router = createBrowserRouter([
  {
    element: <SessionGate />,
    children: [
      // صفحات الحساب بلا قشرة: ما فيها شريط جانبي ولا بحث
      { path: ROUTES.login, element: <LoginPage /> },
      { path: ROUTES.signUp, element: <SignUpPage /> },
      {
        element: <RequireAuth />,
        children: [
          /*
            التعارف يلي إنشاء الحساب، ويحتاجه: جوابه **يُحفظ على الخادم عند
            الختم** ولا يُحفظ في المتصفح، فزائرة تجاوب ستة أسئلة ثم تُلقى
            إجاباتها في أول تحديث للصفحة — نموذج يُملأ ليضيع.
          */
          { path: ROUTES.welcome, element: <WelcomePage /> },
        ],
      },
      {
        element: <AppShell />,
        children: [
          // ---- مفتوح للتصفّح ----
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
          { path: ROUTES.privacy, element: <PrivacyPage /> },

          // ---- يحتاج حسابًا ----
          {
            element: <RequireAuth />,
            children: [
              /*
                الموديل يُبنى على حساب: طول ومقاس ولون بشرة تُحفظ لصاحبها،
                فنموذج بلا وجهة يُملأ ثم يضيع عند «احفظ».
              */
              { path: ROUTES.newModel, element: <CreateModelPage /> },
              { path: '/models/:id', element: <CreateModelPage /> },
              // إعدادات حساب لا وجود له ليست صفحة فاضية — هي صفحة كاذبة
              { path: ROUTES.settings, element: <SettingsPage /> },
              /*
                مقصد المشاركة: القطعة تُكتب في خزانة مستخدَمة بعينها، فبلا جلسة
                ما فيه وين تروح. الحارس يحفظ الوجهة فترجع لها بعد الدخول برابطها
                كاملًا.
              */
              { path: ROUTES.share, element: <SharePage /> },
            ],
          },

          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
