import { describe, expect, it } from 'vitest'
import { conditionFromCode, isWet } from './conditions'
import { dressingBrief, temperatureBand, weatherSentence } from './dressing'
import type { WeatherNow } from './types'

const now = (patch: Partial<WeatherNow> = {}): WeatherNow => ({
  cityId: 'riyadh',
  temperature: 28,
  feelsLike: 30,
  high: 34,
  low: 26,
  humidity: 30,
  windSpeed: 8,
  condition: 'clear',
  observedAt: '2026-08-26T12:00',
  ...patch,
})

describe('conditionFromCode', () => {
  it('يطوي أكواد WMO إلى ثمانية أحوال', () => {
    expect(conditionFromCode(0)).toBe('clear')
    expect(conditionFromCode(2)).toBe('cloudy')
    expect(conditionFromCode(3)).toBe('overcast')
    expect(conditionFromCode(48)).toBe('fog')
    expect(conditionFromCode(53)).toBe('drizzle')
    expect(conditionFromCode(65)).toBe('rain')
    expect(conditionFromCode(75)).toBe('snow')
    expect(conditionFromCode(82)).toBe('rain')
    expect(conditionFromCode(95)).toBe('thunder')
  })

  it('كود غير معروف يرجع للصحو بدل ما ينكسر', () => {
    expect(conditionFromCode(-1)).toBe('clear')
    expect(conditionFromCode(999)).toBe('thunder')
  })

  it('يميّز ما يبلّل', () => {
    expect(isWet('rain')).toBe(true)
    expect(isWet('thunder')).toBe(true)
    expect(isWet('cloudy')).toBe(false)
  })
})

describe('temperatureBand', () => {
  it('حدود مضبوطة على مناخ الخليج', () => {
    expect(temperatureBand(42)).toBe('hot')
    expect(temperatureBand(38)).toBe('hot')
    expect(temperatureBand(33)).toBe('warm')
    expect(temperatureBand(25)).toBe('mild')
    expect(temperatureBand(18)).toBe('cool')
    expect(temperatureBand(5)).toBe('cold')
    expect(temperatureBand(-8)).toBe('cold')
  })
})

describe('dressingBrief', () => {
  it('يعطي سطرًا يوصف اللبس مو الرقم', () => {
    expect(dressingBrief(now({ temperature: 40 })).headline).toContain('حر شديد')
    expect(dressingBrief(now({ temperature: 16 })).headline).toContain('طبقة خفيفة')
  })

  it('المطر يجي أول الملاحظات', () => {
    const brief = dressingBrief(now({ condition: 'rain', humidity: 80, windSpeed: 30 }))
    expect(brief.notes[0]).toContain('مطر')
  })

  it('الرطوبة تُذكر مع الحر فقط', () => {
    expect(dressingBrief(now({ temperature: 32, humidity: 70 })).notes.join()).toContain('رطوبة')
    expect(dressingBrief(now({ temperature: 12, humidity: 70 })).notes.join()).not.toContain('رطوبة')
  })

  it('الرياح والفرق بين الليل والنهار يُذكران عند تجاوز الحدّ', () => {
    expect(dressingBrief(now({ windSpeed: 30 })).notes.join()).toContain('رياح')
    expect(dressingBrief(now({ windSpeed: 10 })).notes.join()).not.toContain('رياح')
    expect(dressingBrief(now({ high: 40, low: 25 })).notes.join()).toContain('الليل والنهار')
  })

  it('جو هادئ ما يولّد ملاحظات', () => {
    expect(dressingBrief(now({ high: 30, low: 26 })).notes).toEqual([])
  })
})

describe('weatherSentence', () => {
  it('يبني السطر الذي سيقرأه المنسّق', () => {
    const sentence = weatherSentence(now({ temperature: 37.6, condition: 'clear' }), 'الرياض')
    expect(sentence).toContain('الرياض')
    expect(sentence).toContain('صحو')
    expect(sentence).toContain('38°')
    expect(sentence.endsWith('.')).toBe(true)
  })
})
