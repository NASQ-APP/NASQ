import { describe, expect, it } from 'vitest'
import { hexToRgb, nearestItemColor, rgbToLab } from './colorMatch'

const match = (hex: string) => nearestItemColor(hexToRgb(hex)).name

describe('nearestItemColor', () => {
  it('يطابق اللون نفسه بالضبط', () => {
    expect(match('#1B1B1B')).toBe('أسود')
    expect(match('#F4F3F0')).toBe('أبيض')
    expect(match('#2C3340')).toBe('كحلي')
  })

  it('يطابق درجة قريبة بأقرب لون في اللوحة', () => {
    expect(match('#000000')).toBe('أسود')
    expect(match('#FFFFFF')).toBe('أبيض')
    expect(match('#26304A')).toBe('كحلي')
  })

  it('يفرّق بين الأسود والكحلي', () => {
    expect(match('#20262F')).toBe('كحلي')
    expect(match('#151515')).toBe('أسود')
  })

  it('يطابق الدرجات الترابية', () => {
    expect(match('#6B5140')).toBe('بني')
    expect(match('#D8CBB6')).toBe('بيج')
    expect(match('#7E8168')).toBe('زيتي')
  })

  it('يرجّع لونًا من اللوحة دائمًا', () => {
    for (const hex of ['#FF00FF', '#00FF00', '#123456']) {
      expect(nearestItemColor(hexToRgb(hex)).hex).toMatch(/^#[0-9A-F]{6}$/i)
    }
  })
})

describe('rgbToLab', () => {
  it('الأسود لمعانه صفر والأبيض مئة', () => {
    const [blackL] = rgbToLab({ r: 0, g: 0, b: 0 })
    const [whiteL] = rgbToLab({ r: 255, g: 255, b: 255 })
    expect(blackL).toBeCloseTo(0, 1)
    expect(whiteL).toBeCloseTo(100, 1)
  })
})

describe('hexToRgb', () => {
  it('يقرأ الهكس مع الشباك وبدونها', () => {
    expect(hexToRgb('#1B1B1B')).toEqual({ r: 27, g: 27, b: 27 })
    expect(hexToRgb('1B1B1B')).toEqual({ r: 27, g: 27, b: 27 })
  })
})
