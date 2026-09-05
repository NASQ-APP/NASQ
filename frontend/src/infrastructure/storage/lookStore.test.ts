/**
 * قاعدة الملكية في مخزن الإطلالة.
 *
 * الاختبار هنا لا للتخزين — بل للشرط الذي يقرّر **من يرى صورة من**. القاعدة
 * تخصّ المتصفّح لا الحساب، فخطأ في هذا السطر يعرض إطلالة وُلّدت من خزانة
 * أحدهم على شاشة غيره.
 */
import { describe, expect, it } from 'vitest'
import { ownedBy } from './lookStore'

const record = (owner?: string) => ({ image: 'data:…', owner })

describe('السجلّ يُردّ لصاحبه وحده', () => {
  it('صاحبه يستعيده', () => {
    expect(ownedBy(record('layan'), 'layan')).toEqual(record('layan'))
  })

  it('وغيره لا يراه — ولو كان داخلاً بحساب', () => {
    expect(ownedBy(record('layan'), 'sara')).toBeUndefined()
  })

  it('والزائرة لا تملك شيئًا هنا، فما يُردّ لها سجلّ أصلاً', () => {
    expect(ownedBy(record('layan'), undefined)).toBeUndefined()
  })
})

describe('السجلّ بلا صاحب لا يُردّ لأحد', () => {
  /*
    سجلّ من نسخة سابقة لا يحمل `owner`. وهذا موضع الانقلاب: قارئ بلا هوية
    وسجلّ بلا صاحب يتساويان عند مقارنة ساذجة (`undefined === undefined`)،
    فيمرّ السجلّ للزائرة — وهي بالضبط الحالة التي وُضع الحقل لأجلها.
  */
  it('لا لزائرة', () => {
    expect(ownedBy(record(undefined), undefined)).toBeUndefined()
  })

  it('ولا لمن دخل بحساب', () => {
    expect(ownedBy(record(undefined), 'layan')).toBeUndefined()
  })
})

it('ولا سجلّ أصلاً يعني لا شيء', () => {
  expect(ownedBy(undefined, 'layan')).toBeUndefined()
})
