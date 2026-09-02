/**
 * محرّك الألوان — القياس لا الاسم.
 *
 * ما يحرسه هذا الملف أن العلاقات تُحسب من الزاوية فعلاً: لو رجع أحدٌ يومًا
 * إلى جدول أسماء مكتوب يدويًا، تسقط الحالات التي لا اسم لها عندنا — وهي كل
 * قطعة مستوردة من متجر.
 */
import { describe, expect, it } from 'vitest'
import { hueDistance, readColor, rgbToHsl } from './colorSpace'
import { scoreColorHarmony } from './colorHarmony'

/** ألوان مرجعية بزوايا معروفة — تُبنى من HSL لا من اللوحة. */
const RED = '#D93636' // ~0°
const ORANGE = '#D97B36' // ~30°
const YELLOW_GREEN = '#8FD936' // ~85°
const GREEN = '#36D95C' // ~135°
const CYAN = '#36D9D9' // ~180°
const BLUE = '#365CD9' // ~225°

describe('G · تحويل اللون', () => {
  it('يقرأ الزاوية والتشبّع والسطوع من hex', () => {
    const red = readColor(RED)
    expect(red.hue).toBeGreaterThanOrEqual(0)
    expect(red.hue).toBeLessThan(15)
    expect(red.saturation).toBeGreaterThan(0.5)
    expect(red.neutral).toBe(false)
  })

  it('الرمادي الخالص تشبّعه صفر', () => {
    expect(rgbToHsl({ r: 128, g: 128, b: 128 }).saturation).toBe(0)
  })

  it('المسافة على دائرة لا على خط — ٣٥٠ و١٠ متجاورتان', () => {
    expect(hueDistance(350, 10)).toBe(20)
    expect(hueDistance(10, 350)).toBe(20)
    expect(hueDistance(0, 180)).toBe(180)
  })
})

describe('علاقات الألوان', () => {
  it('A · نفس الزاوية → أحادي', () => {
    expect(scoreColorHarmony(RED, '#8F2424').relation).toBe('monochromatic')
  })

  it('B · زاوية مجاورة → متجاور', () => {
    expect(scoreColorHarmony(RED, ORANGE).relation).toBe('analogous')
  })

  it('C · زاوية مقابلة → متكامل', () => {
    expect(scoreColorHarmony(RED, CYAN).relation).toBe('complementary')
  })

  it('D · ثلث الدائرة → ثلاثيّ', () => {
    expect(scoreColorHarmony(RED, GREEN).relation).toBe('triadic')
  })

  it('E · المحايد يُحسم قبل الزاوية', () => {
    const verdict = scoreColorHarmony('#6E2B33', '#E5DCCB') // عنّابي مع كريمي
    expect(verdict.relation).toBe('neutral')
    expect(verdict.score).toBeGreaterThan(0.8)
  })

  it('ما بين المجالات يُسمّى متباعدًا ولا يُدَّعى انسجامه', () => {
    const verdict = scoreColorHarmony(RED, YELLOW_GREEN)
    expect(verdict.relation).toBe('balanced')
    expect(verdict.score).toBeLessThan(0.6)
  })
})

describe('F · الحرارة', () => {
  it('الأحمر والبرتقالي دافئان، والأزرق بارد', () => {
    expect(readColor(RED).temperature).toBe('warm')
    expect(readColor(ORANGE).temperature).toBe('warm')
    expect(readColor(BLUE).temperature).toBe('cool')
  })

  it('المحايد لا حرارة له', () => {
    expect(readColor('#1B1B1B').temperature).toBe('neutral')
    expect(readColor('#E5DCCB').temperature).toBe('neutral')
  })
})

describe('تعديلات تقرّب الحساب من العين', () => {
  it('مشبَعان متقابلان يتنازعان فينزل ترتيبهما', () => {
    const vivid = scoreColorHarmony('#FF0000', '#00FFFF').score
    const muted = scoreColorHarmony('#8F4A4A', '#4A8F8F').score
    expect(vivid).toBeLessThan(muted)
  })

  it('الأحادي بفرق درجة أعلى من الأحادي المسطّح', () => {
    const layered = scoreColorHarmony('#8F2424', '#E5A0A0').score
    const flat = scoreColorHarmony('#8F2424', '#912626').score
    expect(layered).toBeGreaterThan(flat)
  })
})

describe('اللون المستورد بلا اسم عندنا', () => {
  it('يُقاس بزاويته ويُسمّى بأقرب لون في اللوحة', () => {
    // لون متجر غريب عن لوحتنا — يجب أن يُحسب لا أن يسقط
    const verdict = scoreColorHarmony('#6E2B33', '#7C4D28')
    expect(verdict.score).toBeGreaterThan(0)
    expect(verdict.explanation.length).toBeGreaterThan(0)
    expect(readColor('#7C4D28').family.length).toBeGreaterThan(0)
  })
})
