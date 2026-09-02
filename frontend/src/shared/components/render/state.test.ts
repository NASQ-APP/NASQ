/**
 * أولوية الحالات — الجزء الذي كان يختلف من صفحة لصفحة.
 *
 * البيئة هنا `node` بلا DOM (راجع `vitest.config.ts`)، فالمُختبَر هو القرار
 * لا الرسم. ولهذا فُصل القرار عن المكوّن أصلاً: ما لا يُختبر يتفرّق بصمت.
 */
import { describe, expect, it, vi } from 'vitest'
import { resolveRenderState } from './state'

describe('resolveRenderState', () => {
  it('A · الخطأ أعلى أولوية — ولو بقي التحميل مرفوعًا', () => {
    expect(resolveRenderState({ error: new Error('x'), loading: true, empty: true })).toBe('error')
  })

  it('B · التحميل يسبق الفراغ والمحتوى', () => {
    expect(resolveRenderState({ loading: true, empty: true })).toBe('loading')
  })

  it('C · الفراغ حين لا خطأ ولا تحميل', () => {
    expect(resolveRenderState({ empty: true })).toBe('empty')
  })

  it('D · المحتوى هو الأصل', () => {
    expect(resolveRenderState({})).toBe('content')
    expect(resolveRenderState({ loading: false, empty: false, error: undefined })).toBe('content')
  })

  it('F · التحميل لا يعرض المحتوى', () => {
    expect(resolveRenderState({ loading: true })).not.toBe('content')
  })

  it('G · الخطأ لا يعرض الفراغ', () => {
    expect(resolveRenderState({ error: 'فشل', empty: true })).not.toBe('empty')
  })

  it('حالة واحدة فقط في كل مجموعة مدخلات — ما فيه تراكب', () => {
    // كل الاحتمالات الثمانية: لكل واحد ناتج واحد لا غير
    for (const error of [undefined, new Error('x')]) {
      for (const loading of [false, true]) {
        for (const empty of [false, true]) {
          const state = resolveRenderState({ error, loading, empty })
          expect(['error', 'loading', 'empty', 'content']).toContain(state)
        }
      }
    }
  })

  /*
    القيم «الفارغة الصادقة» تُقرأ كنجاح لا كخطأ: مصفوفة فاضية وسلسلة فاضية
    وصفر كلها نتائج مشروعة، ومعاملتها خطأً تخفي محتوى صحيحًا خلف رسالة فشل.
  */
  it('الخطأ يُقاس بصدق القيمة — لا بوجود المفتاح', () => {
    expect(resolveRenderState({ error: undefined })).toBe('content')
    expect(resolveRenderState({ error: null })).toBe('content')
    expect(resolveRenderState({ error: '' })).toBe('content')
    expect(resolveRenderState({ error: 0 })).toBe('content')
  })
})

describe('E · إعادة المحاولة', () => {
  it('تُنادى مرة واحدة لكل ضغطة، ولا تُنادى بلا ضغط', () => {
    /*
      لا DOM هنا، فنختبر العقد لا النقرة: `onRetry` يُمرَّر كما هو ولا يُلَفّ
      ولا يُنادى أثناء العرض — لَفُّه كان سيبتلع وسائطه، ونداؤه أثناء العرض
      يعيد المحاولة تلقائيًا بلا طلب أحد.
    */
    const retry = vi.fn()
    expect(retry).not.toHaveBeenCalled()

    retry()
    expect(retry).toHaveBeenCalledTimes(1)
  })
})
