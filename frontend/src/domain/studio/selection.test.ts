import { describe, expect, it } from 'vitest'
import { resolveSelection } from './selection'

type Item = { id: string; name: string; source: 'wardrobe' | 'try' }

const wardrobe: Item = { id: 'w1', name: 'قميص', source: 'wardrobe' }
const tryPiece: Item = { id: 't1', name: 'فستان سهرة تول', source: 'try' }
const items = [wardrobe, tryPiece]

describe('resolveSelection', () => {
  it('قطعة التجربة تُحلّ مثل قطعة الخزانة تمامًا', () => {
    /*
      هذا هو العطل نفسه: الحلّ كان على «قطعي» فقط، فالمستوردة من متجر تدخل
      الاختيار وتختفي من الاستوديو بلا خطأ. لو رجع الفلترة، يسقط هذا وحده.
    */
    expect(resolveSelection(['t1'], items)).toEqual([tryPiece])
  })

  it('الخلط بين المصدرين يبقى كاملاً', () => {
    expect(resolveSelection(['w1', 't1'], items).map((i) => i.id)).toEqual(['w1', 't1'])
  })

  it('الترتيب ترتيب الاختيار لا ترتيب المصدر — وهو ترتيب التلبيس', () => {
    expect(resolveSelection(['t1', 'w1'], items).map((i) => i.id)).toEqual(['t1', 'w1'])
  })

  it('معرّف لا يقابله شيء يُسقَط بلا انهيار', () => {
    // قطعة حُذفت من جهاز آخر والاختيار محفوظ محليًا
    expect(resolveSelection(['w1', 'محذوفة'], items)).toEqual([wardrobe])
    expect(resolveSelection(['لا شيء'], items)).toEqual([])
  })

  it('اختيار فارغ يعطي إطلالة فارغة', () => {
    expect(resolveSelection([], items)).toEqual([])
  })

  it('التكرار يُحفظ كما هو — التصفية ليست من مهمّته', () => {
    // المخزن يمنع التكرار عند الإضافة؛ ازدواج المنع يخفي عطلاً لو انكسر هناك
    expect(resolveSelection(['w1', 'w1'], items)).toHaveLength(2)
  })
})
