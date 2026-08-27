import { describe, expect, it } from 'vitest'
import { DEVICE_MIN_WIDTH, deviceClassFor, deviceQuery } from './device'

describe('deviceClassFor', () => {
  it('الجوال تحت ٧٦٨', () => {
    expect(deviceClassFor(320)).toBe('mobile')
    expect(deviceClassFor(375)).toBe('mobile')
    expect(deviceClassFor(767)).toBe('mobile')
  })

  it('اللوحي من ٧٦٨ إلى ما دون ١٠٢٤', () => {
    expect(deviceClassFor(768)).toBe('tablet')
    expect(deviceClassFor(1023)).toBe('tablet')
  })

  it('سطح المكتب من ١٠٢٤', () => {
    expect(deviceClassFor(1024)).toBe('desktop')
    expect(deviceClassFor(1440)).toBe('desktop')
  })

  it('الحدود متطابقة مع نقاط توقّف Tailwind', () => {
    expect(DEVICE_MIN_WIDTH.tablet).toBe(768)
    expect(DEVICE_MIN_WIDTH.desktop).toBe(1024)
  })
})

describe('deviceQuery', () => {
  it('يبني استعلام أدنى عرض', () => {
    expect(deviceQuery('desktop')).toBe('(min-width: 1024px)')
    expect(deviceQuery('tablet')).toBe('(min-width: 768px)')
  })
})
