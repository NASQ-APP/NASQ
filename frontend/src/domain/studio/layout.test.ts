import { describe, expect, it } from 'vitest'
import {
  PANEL_WIDTH,
  SUGGESTIONS_DEFAULT_HEIGHT,
  SUGGESTIONS_GRID_AT,
  SUGGESTIONS_MAX_HEIGHT,
  SUGGESTIONS_MIN_HEIGHT,
  clampSuggestionsHeight,
  suggestionsView,
  PANEL_WIDTH_COMPACT,
  RAIL_WIDTH,
  isFocusMode,
  sheetPanels,
  studioColumns,
  studioLayout,
  toggleFocus,
} from './layout'

describe('studioColumns', () => {
  it('اللوحتان مفتوحتان', () => {
    expect(studioColumns({ wardrobeOpen: true, outfitOpen: true })).toBe(
      `${PANEL_WIDTH}px 1fr ${PANEL_WIDTH}px`,
    )
  })

  it('طيّ الخزانة يوسّع الموديل', () => {
    expect(studioColumns({ wardrobeOpen: false, outfitOpen: true })).toBe(
      `${RAIL_WIDTH}px 1fr ${PANEL_WIDTH}px`,
    )
  })

  it('طيّ الإطلالة يوسّع الموديل', () => {
    expect(studioColumns({ wardrobeOpen: true, outfitOpen: false })).toBe(
      `${PANEL_WIDTH}px 1fr ${RAIL_WIDTH}px`,
    )
  })

  it('وضع التركيز: الجانبان شريطان', () => {
    expect(studioColumns({ wardrobeOpen: false, outfitOpen: false })).toBe(
      `${RAIL_WIDTH}px 1fr ${RAIL_WIDTH}px`,
    )
  })

  it('الموديل يبقى 1fr في كل الحالات فيبتلع المساحة المتحرّرة', () => {
    for (const wardrobeOpen of [true, false]) {
      for (const outfitOpen of [true, false]) {
        expect(studioColumns({ wardrobeOpen, outfitOpen })).toContain('1fr')
      }
    }
  })
})

describe('وضع التركيز', () => {
  it('يُكتشف لما ينطوي الجانبان', () => {
    expect(isFocusMode({ wardrobeOpen: false, outfitOpen: false })).toBe(true)
    expect(isFocusMode({ wardrobeOpen: true, outfitOpen: false })).toBe(false)
  })

  it('التفعيل يطوي الجانبين', () => {
    const open = { wardrobeOpen: true, outfitOpen: true }
    expect(toggleFocus(open, open)).toEqual({ wardrobeOpen: false, outfitOpen: false })
  })

  it('الخروج يرجّع الحالة السابقة', () => {
    const previous = { wardrobeOpen: true, outfitOpen: false }
    const focused = { wardrobeOpen: false, outfitOpen: false }
    expect(toggleFocus(focused, previous)).toEqual(previous)
  })
})

describe('studioLayout', () => {
  const open = { wardrobeOpen: true, outfitOpen: true }

  it('سطح المكتب: ثلاثة أعمدة واللوحتان مرسّاتان', () => {
    const layout = studioLayout('desktop', open)
    expect(layout.columns).toBe(`${PANEL_WIDTH}px 1fr ${PANEL_WIDTH}px`)
    expect(layout.wardrobe).toBe('docked')
    expect(layout.outfit).toBe('docked')
  })

  it('اللوحي: عمودان، الخزانة مرسّاة أضيق والإطلالة ورقة', () => {
    const layout = studioLayout('tablet', open)
    expect(layout.columns).toBe(`${PANEL_WIDTH_COMPACT}px 1fr`)
    expect(layout.wardrobe).toBe('docked')
    expect(layout.outfit).toBe('sheet')
  })

  it('اللوحي: طيّ الخزانة يرجّعها شريطًا', () => {
    expect(studioLayout('tablet', { wardrobeOpen: false, outfitOpen: true }).columns).toBe(
      `${RAIL_WIDTH}px 1fr`,
    )
  })

  it('الجوال: عمود واحد واللوحتان ورقتان', () => {
    const layout = studioLayout('mobile', open)
    expect(layout.columns).toBe('1fr')
    expect(layout.wardrobe).toBe('sheet')
    expect(layout.outfit).toBe('sheet')
  })

  it('الموديل يبقى 1fr على كل جهاز', () => {
    for (const device of ['mobile', 'tablet', 'desktop'] as const) {
      expect(studioLayout(device, open).columns).toContain('1fr')
    }
  })
})

describe('sheetPanels', () => {
  const open = { wardrobeOpen: true, outfitOpen: true }

  it('يقود شريط التنقّل: لا تبويبات على سطح المكتب', () => {
    expect(sheetPanels(studioLayout('desktop', open))).toEqual([])
  })

  it('تبويب واحد على اللوحي', () => {
    expect(sheetPanels(studioLayout('tablet', open))).toEqual(['outfit'])
  })

  it('تبويبان على الجوال', () => {
    expect(sheetPanels(studioLayout('mobile', open))).toEqual(['wardrobe', 'outfit'])
  })
})

describe('ارتفاع الاقتراحات', () => {
  it('يُحصر بين الحدّين', () => {
    expect(clampSuggestionsHeight(10)).toBe(SUGGESTIONS_MIN_HEIGHT)
    expect(clampSuggestionsHeight(9999)).toBe(SUGGESTIONS_MAX_HEIGHT)
    expect(clampSuggestionsHeight(200)).toBe(200)
  })

  it('يقرّب الكسور ويردّ الافتراضي لقيمة غير رقمية', () => {
    expect(clampSuggestionsHeight(200.6)).toBe(201)
    expect(clampSuggestionsHeight(Number.NaN)).toBe(SUGGESTIONS_DEFAULT_HEIGHT)
  })

  it('الافتراضي داخل المدى ويعطي صفًا مضغوطًا', () => {
    expect(clampSuggestionsHeight(SUGGESTIONS_DEFAULT_HEIGHT)).toBe(SUGGESTIONS_DEFAULT_HEIGHT)
    expect(suggestionsView(SUGGESTIONS_DEFAULT_HEIGHT)).toBe('row')
  })

  it('التوسيع يبدّل العرض إلى شبكة', () => {
    expect(suggestionsView(SUGGESTIONS_GRID_AT - 1)).toBe('row')
    expect(suggestionsView(SUGGESTIONS_GRID_AT)).toBe('grid')
    expect(suggestionsView(SUGGESTIONS_MAX_HEIGHT)).toBe('grid')
  })
})
