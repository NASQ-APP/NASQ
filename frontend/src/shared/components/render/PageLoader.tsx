/**
 * انتظار صفحة — أصغر من إقلاع التطبيق وأكبر من سطر.
 *
 * **الهيكل أولى منه حين نعرف التخطيط**: شبكة قطع أو بطاقات إطلالات تُرسم
 * هياكلها فتبقى الصفحة في مكانها ولا تقفز عند وصول البيانات. وهذا المكوّن
 * لِما لا شكل له مسبقًا.
 */
import { GlobalLoader } from './GlobalLoader'

export function PageLoader({ message }: { message?: string }) {
  return <GlobalLoader size="sm" message={message} />
}
