/**
 * الرفّ الثابت — ما يجعله ثابتًا فعلاً.
 *
 * الخطر هنا ليس عطلاً بل **انزلاقًا**: أن يصير الرفّ خزانة حقيقية يومًا،
 * فتُحذف قطع التجربة مع حذفها، أو يظهر في قائمة النقل وجهةً بلا معنى.
 */
import { describe, expect, it } from 'vitest'
import { TRY_SHELF, TRY_SHELF_ID, isTryShelf } from './tryShelf'

type Piece = { id: string; source: 'wardrobe' | 'try'; wardrobeId: string | null }

const pieces: Piece[] = [
  { id: 'a', source: 'wardrobe', wardrobeId: 'w1' },
  { id: 'b', source: 'try', wardrobeId: null },
  { id: 'c', source: 'try', wardrobeId: null },
]

describe('رفّ قطع التجربة', () => {
  it('يميّز نفسه عن أي خزانة حقيقية', () => {
    expect(isTryShelf(TRY_SHELF_ID)).toBe(true)
    expect(isTryShelf('w1')).toBe(false)
    expect(isTryShelf('all')).toBe(false)
    expect(isTryShelf('')).toBe(false)
  })

  it('معرّفه غريب عن مولّد معرّفات الخزائن', () => {
    // الخزائن تُولَّد بـ`w_…`؛ تصادم المعرّفين يجعل خزانة حقيقية ترث سلوك الرفّ
    expect(TRY_SHELF_ID.startsWith('w')).toBe(false)
    expect(TRY_SHELF_ID).toContain(':')
  })

  it('العضوية فيه بالمصدر لا بحقل خزانة', () => {
    /*
      قطع التجربة `wardrobeId` فيها `null` دائمًا. لو رُبطت العضوية بالحقل
      لصار الرفّ فاضيًا أبدًا — وهذا بالضبط ما كان يحصل في لوحة الاستوديو.
    */
    const byField = pieces.filter((p) => p.wardrobeId === TRY_SHELF_ID)
    const bySource = pieces.filter((p) => p.source === 'try')

    expect(byField).toHaveLength(0)
    expect(bySource.map((p) => p.id)).toEqual(['b', 'c'])
  })

  it('له اسم يُعرض بلا بادئة «خزانة»', () => {
    // البطاقة تكتب «خزانة {الاسم}» للخزائن؛ الرفّ اسمه كامل بذاته
    expect(TRY_SHELF.name).toBe('قطع التجربة')
    expect(TRY_SHELF.nameLatin).toBe('TRY PIECES')
  })

  it('بلا تواريخ — فهو غير مُنشأ ولا مُعدَّل', () => {
    // تاريخ إنشاء لشيء لم يُنشأ ادّعاء؛ وفراغه يقول إنه ليس صفًّا
    expect(TRY_SHELF.createdAt).toBe('')
    expect(TRY_SHELF.updatedAt).toBe('')
  })
})
