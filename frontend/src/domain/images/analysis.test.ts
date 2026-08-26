import { describe, expect, it } from 'vitest'
import { toFieldSuggestion } from './analysis'

describe('toFieldSuggestion', () => {
  it('يقبل فئة وشكلًا ولونًا يعرفها التطبيق', () => {
    const suggestion = toFieldSuggestion(
      { categoryId: 'women-shirts', shape: 'shirt', colorName: 'أبيض', name: 'قميص كتان' },
      'female',
    )

    expect(suggestion.categoryId).toBe('women-shirts')
    expect(suggestion.shape).toBe('shirt')
    expect(suggestion.colorName).toBe('أبيض')
    expect(suggestion.colorHex).toBe('#F4F3F0')
    expect(suggestion.name).toBe('قميص كتان')
    expect(suggestion.filled).toEqual(['categoryId', 'shape', 'colorName', 'name'])
  })

  it('يسقط فئة مخترعة بدل ما يضيفها للخزانة', () => {
    const suggestion = toFieldSuggestion({ categoryId: 'women-capes' }, 'female')
    expect(suggestion.categoryId).toBeUndefined()
    expect(suggestion.filled).toEqual([])
  })

  it('يسقط فئة من التشكيلة الثانية', () => {
    const suggestion = toFieldSuggestion({ categoryId: 'men-thobes' }, 'female')
    expect(suggestion.categoryId).toBeUndefined()
  })

  it('يصحّح شكلًا لا ينتمي لموضع الفئة', () => {
    // حذاء داخل فئة قمصان: نأخذ أول شكل مسموح ولا نعلّمه كمقترح
    const suggestion = toFieldSuggestion(
      { categoryId: 'women-shirts', shape: 'heels' },
      'female',
    )
    expect(suggestion.categoryId).toBe('women-shirts')
    expect(suggestion.shape).toBe('tee')
    expect(suggestion.filled).toEqual(['categoryId'])
  })

  it('يسقط لونًا خارج اللوحة', () => {
    const suggestion = toFieldSuggestion({ colorName: 'فوشي' }, 'female')
    expect(suggestion.colorName).toBeUndefined()
    expect(suggestion.filled).toEqual([])
  })

  it('يقصّ الاسم الطويل ويتجاهل الفاضي', () => {
    expect(toFieldSuggestion({ name: '  ' }, 'female').name).toBeUndefined()
    expect(toFieldSuggestion({ name: 'ط'.repeat(90) }, 'female').name).toHaveLength(60)
  })

  it('يرجّع اقتراحًا فاضيًا لما ما يتعرّف على شي', () => {
    expect(toFieldSuggestion({}, 'female').filled).toEqual([])
  })
})
