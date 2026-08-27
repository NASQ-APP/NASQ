/**
 * تخطيط الاستوديو.
 *
 * ثلاثة أعمدة على شبكة CSS: الخزانة · الموديل · الإطلالة. كل جانب يُطوى
 * مستقلاً، وعمود الموديل يبتلع المساحة المتحرّرة تلقائيًا لأن عرضه `1fr`.
 *
 * الحساب هنا نقي عشان يُختبر بلا DOM، ولأن قاعدة «الموديل هو البطل» تصير
 * مكتوبة في مكان واحد بدل ما تتناثر في الأنماط.
 */

import type { DeviceClass } from '@/domain/shared/device'

/** عرض الشريط المطوي — يكفي لأيقونة وزر فتح. */
export const RAIL_WIDTH = 56
/** عرض اللوحة المفتوحة على سطح المكتب. */
export const PANEL_WIDTH = 320

export type PanelState = {
  wardrobeOpen: boolean
  outfitOpen: boolean
}

/**
 * قالب أعمدة الشبكة. الموديل `1fr` دائمًا، فأي طيّ يوسّعه بلا حساب يدوي.
 * الترتيب منطقي (start → end) فيقلبه المتصفح تلقائيًا في RTL.
 */
export function studioColumns({ wardrobeOpen, outfitOpen }: PanelState): string {
  const wardrobe = wardrobeOpen ? PANEL_WIDTH : RAIL_WIDTH
  const outfit = outfitOpen ? PANEL_WIDTH : RAIL_WIDTH
  return `${wardrobe}px 1fr ${outfit}px`
}

/** وضع التركيز = الجانبان مطويّان. */
export const isFocusMode = (panels: PanelState): boolean =>
  !panels.wardrobeOpen && !panels.outfitOpen

/** الدخول لوضع التركيز والخروج منه — يحفظ الحالة السابقة ليرجّعها. */
export function toggleFocus(panels: PanelState, previous: PanelState): PanelState {
  return isFocusMode(panels) ? previous : { wardrobeOpen: false, outfitOpen: false }
}

/** عرض اللوحة على الشاشات المتوسطة — أضيق عشان يبقى للموديل نصيب. */
export const PANEL_WIDTH_COMPACT = 280

/** كيف تُعرض اللوحة: مرسّاة في الشبكة، أو ورقة تنفتح فوق المحتوى. */
export type PanelPlacement = 'docked' | 'sheet'

export type StudioLayout = {
  device: DeviceClass
  /** قالب أعمدة الشبكة لهذا الجهاز */
  columns: string
  wardrobe: PanelPlacement
  outfit: PanelPlacement
}

/**
 * خطة التخطيط لكل جهاز — قرار واحد تقرأه الصفحة بدل ما تتناثر شروط المقاس
 * في الـJSX. الموديل يبقى `1fr` على كل الأجهزة، فهو البطل دائمًا.
 *
 * سطح المكتب: ثلاثة أعمدة والجانبان يُطويان.
 * اللوحي: الخزانة مرسّاة (أضيق) والإطلالة ورقة — عمودان ما يخنقان الموديل.
 * الجوال: عمود واحد والجانبان ورقتان سفليتان.
 */
export function studioLayout(device: DeviceClass, panels: PanelState): StudioLayout {
  if (device === 'mobile') {
    return { device, columns: '1fr', wardrobe: 'sheet', outfit: 'sheet' }
  }

  if (device === 'tablet') {
    const wardrobe = panels.wardrobeOpen ? PANEL_WIDTH_COMPACT : RAIL_WIDTH
    return { device, columns: `${wardrobe}px 1fr`, wardrobe: 'docked', outfit: 'sheet' }
  }

  return { device, columns: studioColumns(panels), wardrobe: 'docked', outfit: 'docked' }
}

/** اللوحات التي تُعرض كأوراق على هذا الجهاز — يقود شريط التنقّل السفلي. */
export function sheetPanels(layout: StudioLayout): ('wardrobe' | 'outfit')[] {
  return (['wardrobe', 'outfit'] as const).filter((panel) => layout[panel] === 'sheet')
}

/* ------------------------- شريط الاقتراحات ------------------------- */

/** أدنى ارتفاع مفيد: صف واحد من الاقتراحات. */
export const SUGGESTIONS_MIN_HEIGHT = 92
/** أقصى ارتفاع: بعده يبدأ الشريط ياكل من الموديل. */
export const SUGGESTIONS_MAX_HEIGHT = 340
export const SUGGESTIONS_DEFAULT_HEIGHT = 104
/** خطوة السهم في لوحة المفاتيح. */
export const SUGGESTIONS_STEP = 24

export function clampSuggestionsHeight(height: number): number {
  if (Number.isNaN(height)) return SUGGESTIONS_DEFAULT_HEIGHT
  return Math.min(SUGGESTIONS_MAX_HEIGHT, Math.max(SUGGESTIONS_MIN_HEIGHT, Math.round(height)))
}

/**
 * فوق هذا الارتفاع يتحوّل الشريط من صف أفقي إلى شبكة بطاقات تشرح كل اقتراح.
 * التوسيع يعطي معلومة أكثر، مو نفس الصف مطّاطًا.
 */
export const SUGGESTIONS_GRID_AT = 156

export const suggestionsView = (height: number): 'row' | 'grid' =>
  height >= SUGGESTIONS_GRID_AT ? 'grid' : 'row'
