import { describe, expect, it } from 'vitest'
import { MAX_IMAGE_MB, validateImageFile } from './validation'

const file = (type: string, mb = 1) => ({ type, size: mb * 1024 * 1024 })

describe('validateImageFile', () => {
  it('يقبل PNG وJPEG وWEBP', () => {
    expect(validateImageFile(file('image/png'))).toBeNull()
    expect(validateImageFile(file('image/jpeg'))).toBeNull()
    expect(validateImageFile(file('image/webp'))).toBeNull()
  })

  it('يقبل image/jpg اللي ترسله بعض الأجهزة', () => {
    expect(validateImageFile(file('image/jpg'))).toBeNull()
  })

  it('يرفض الصيغ غير المدعومة برسالة واضحة', () => {
    const error = validateImageFile(file('image/gif'))
    expect(error?.code).toBe('unsupported-type')
    expect(error?.message).toBe('صيغة الصورة غير مدعومة.')
    expect(error?.canKeepOriginal).toBe(false)
  })

  it('يرفض الملفات غير الصورية', () => {
    expect(validateImageFile(file('application/pdf'))?.code).toBe('unsupported-type')
  })

  it('يرفض الصورة الأكبر من الحد', () => {
    const error = validateImageFile(file('image/png', MAX_IMAGE_MB + 1))
    expect(error?.code).toBe('too-large')
  })

  it('يقبل الصورة على الحد بالضبط', () => {
    expect(validateImageFile(file('image/png', MAX_IMAGE_MB))).toBeNull()
  })

  it('يحترم الحدود المخصّصة', () => {
    expect(validateImageFile(file('image/png', 2), { maxBytes: 1024 * 1024 })?.code).toBe('too-large')
    expect(validateImageFile(file('image/webp'), { acceptedTypes: ['image/png'] })?.code).toBe(
      'unsupported-type',
    )
  })
})
