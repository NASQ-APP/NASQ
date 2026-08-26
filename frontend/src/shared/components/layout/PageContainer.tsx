import type { ReactNode } from 'react'
import { cn } from '@/shared/lib'

const WIDTHS = {
  /** الاستوديو — يحتاج أوسع مساحة ممكنة للوحاته الثلاث */
  full: 'max-w-[1500px]',
  /** الشبكات الكبيرة: الخزائن والقطع والإطلالات */
  wide: 'max-w-[1400px]',
  /** الشاشات المتوسطة: السفر وباني الموديل */
  content: 'max-w-[1200px]',
  /** الحالات الفارغة وصفحات الخطأ */
  narrow: 'max-w-[900px]',
  /** النص المتصل: الخصوصية والإعدادات */
  prose: 'max-w-[820px]',
} as const

/** الحاوية الموحّدة لكل شاشة — عرض وحواف واحدة في التطبيق كله. */
export function PageContainer({
  children,
  width = 'wide',
  className,
}: {
  children: ReactNode
  width?: keyof typeof WIDTHS
  className?: string
}) {
  return (
    <div className={cn('mx-auto px-5 py-10 lg:px-10', WIDTHS[width], className)}>{children}</div>
  )
}
