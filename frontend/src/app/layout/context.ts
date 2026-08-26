import { createContext, useContext } from 'react'

type AppShellValue = {
  /** يفتح مودال إضافة قطعة من أي شاشة */
  openAdd: () => void
  /** يفتح درج الستايليست من أي شاشة */
  openStylist: () => void
  /** نص البحث العام من الشريط العلوي */
  search: string
}

export const AppShellContext = createContext<AppShellValue | null>(null)

/**
 * بديل واضح لـ`useOutletContext` — النوع صريح والخطأ يبان عند الاستخدام
 * خارج القشرة بدل ما يصير `undefined` بصمت.
 */
export function useAppShell(): AppShellValue {
  const value = useContext(AppShellContext)
  if (!value) throw new Error('useAppShell خارج AppShell')
  return value
}
