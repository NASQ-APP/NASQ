/**
 * قشرة التطبيق: شريط جانبي على سطح المكتب، وقائمة منسدلة على الجوال (X-03).
 * تجمع الأجزاء فقط — كل جزء يعيش في ملفه.
 */
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { PageTransition } from '@/shared/components/motion'
import { AppShellContext } from './context'
import { MobileNav } from './MobileNav'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useSidebar } from './useSidebar'
import { AddItemModal } from '@/features/wardrobe/components/AddItemModal'
import { StylistDrawer } from '@/features/stylist/StylistDrawer'
import { SignInPrompt } from '@/features/auth/SignInPrompt'
import { useAccountGate } from '@/features/auth/useAccountGate'
import { ROUTES } from '@/shared/config'
import { shell } from '@/theme'

export function AppShell() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const collapsed = useSidebar((state) => state.collapsed)
  const [addOpen, setAddOpen] = useState(false)
  const [stylistOpen, setStylistOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [term, setTerm] = useState('')

  // التمرير للأعلى مع كل تنقّل. إغلاق القائمة يتم من حدث الضغط نفسه.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- المسار وحده هو المحفّز
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  /*
    الفعلان الوحيدان اللي تفتحهما القشرة — ومنها يُحرسان.

    الحراسة هنا لا عند كل نداء: `openAdd` و`openStylist` يُستدعيان من الرئيسية
    والاستوديو وصفحة القطع، فحراستهما عند المصدر تكفي الجميع وما تترك بابًا
    نسيناه. والنافذة تشرح السبب بلسان الفعل نفسه.
  */
  const gate = useAccountGate()
  const openAdd = useMemo(
    () => gate('عشان تضيف قطعة لخزانتك', () => setAddOpen(true)),
    [gate],
  )
  const openStylist = useMemo(
    () => gate('عشان يشوف المنسّق خزانتك وينسّق لك منها', () => setStylistOpen(true)),
    [gate],
  )

  const runSearch = () => {
    const query = term.trim()
    if (query) navigate(`${ROUTES.wardrobes}?q=${encodeURIComponent(query)}`)
  }

  const sidebarWidth = collapsed ? shell.sidebarCollapsedWidth : shell.sidebarWidth

  return (
    <AppShellContext.Provider value={{ openAdd, openStylist, search: term }}>
      <div
        className="grid min-h-screen lg:grid-cols-[var(--sidebar)_1fr]"
        style={{ '--sidebar': `${sidebarWidth}px` } as CSSProperties}
      >
        <Sidebar />

        <div className="flex min-w-0 flex-col">
          <TopBar
            term={term}
            onTermChange={setTerm}
            onSearch={runSearch}
            onOpenNav={() => setNavOpen(true)}
            onOpenAdd={openAdd}
          />
          <main className="flex-1">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </main>
        </div>

        <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />

        <AddItemModal open={addOpen} onClose={() => setAddOpen(false)} />
        <StylistDrawer open={stylistOpen} onClose={() => setStylistOpen(false)} />
        {/* في القشرة لأن الطلب يجي من أي صفحة تحتها — ونسخة وحدة تكفي كلها */}
        <SignInPrompt />
      </div>
    </AppShellContext.Provider>
  )
}
