/**
 * انتقال الصفحات.
 *
 * الصفحة الجديدة تدخل بارتفاع خفيف وتلاشٍ، فالانتقال يُقرأ كحركة واحدة بدل
 * قفزة. المسافة صغيرة (٨ بكسل) عمدًا: الانتقال الطويل يصير عائقًا بين
 * المستخدمة وما تبيه، لا زينة.
 *
 * **بـCSS لا بجافاسكربت**: الحالة الطبيعية للعنصر ظاهرة، والحركة تبدأ من حالة
 * محوّلة وتنتهي عندها. فلو ما اشتغلت الحركة لأي سبب يبقى المحتوى مرئيًا — بينما
 * البدء من `opacity:0` في جافاسكربت يترك الصفحة بيضاء عند أي عطل.
 *
 * والمفتاح هو المسار، فيعيد React تركيب العنصر عند كل تنقّل وتشتغل الحركة من
 * جديد. وإطفاء الحركة يتكفّل به `prefers-reduced-motion` في CSS.
 */
import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div key={pathname} className="page-in">
      {children}
    </div>
  )
}
