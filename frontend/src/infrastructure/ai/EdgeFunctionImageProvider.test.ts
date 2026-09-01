/**
 * تحقّق من **العقد** بين الواجهة ودالة `images-generate`.
 *
 * العميل هو من يطابق العقد المنشور، لا العكس. فالاختبار يلتقط الحمولة كما
 * تُرسل ويقارنها بأسماء الحقول التي تقرؤها الدالة حرفيًا — أي انزلاق في اسم
 * حقل يظهر هنا لا في الإنتاج بعد نداء مدفوع.
 *
 * ويحرس القرار الأهم: **لا صور قطع في الحمولة**. الخادم يقرأها من صفّها
 * بمعرّفها، ورفعها base64 يرسل ميغابايتات لشيء يملكه أصلاً.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

const invoke = vi.fn()

vi.mock('@/infrastructure/supabase', () => ({
  requireSupabase: () => ({ functions: { invoke } }),
}))

const { edgeFunctionImageProvider } = await import('./EdgeFunctionImageProvider')

/** ما تقرؤه الدالة فعلاً — منقول من `images-generate/index.ts`. */
const SERVER_FIELDS = new Set([
  'operation',
  'personImage',
  'baseImage',
  'currentLook',
  'previousLook',
  'garmentIds',
  'garmentId',
  'keepIds',
  'bodyParameters',
  'instruction',
  'refinement',
])

const garment = (id: string) => ({
  id,
  category: 'dress',
  slot: 'full' as const,
  name: 'فستان',
  colorName: 'عنابي',
})

const sent = () => invoke.mock.calls.at(-1)?.[1].body as Record<string, unknown>

beforeEach(() => {
  invoke.mockReset()
  invoke.mockResolvedValue({ data: { image: 'data:image/png;base64,AAA' }, error: null })
})

describe('عقد images-generate', () => {
  it('لا يرسل إلا حقولًا تقرؤها الدالة', async () => {
    await edgeFunctionImageProvider.generateTryOn({
      personImage: 'data:image/jpeg;base64,PERSON',
      garments: [garment('a'), garment('b')],
      bodyParameters: { heightCm: 166 },
    })

    for (const key of Object.keys(sent())) expect(SERVER_FIELDS).toContain(key)
  })

  it('try-on: معرّفات القطع بالترتيب، وصورة الشخص وحدها', async () => {
    await edgeFunctionImageProvider.generateTryOn({
      personImage: 'data:image/jpeg;base64,PERSON',
      garments: [garment('a'), garment('b')],
      bodyParameters: { heightCm: 166, waistCm: 72 },
    })

    expect(invoke).toHaveBeenCalledWith('images-generate', expect.anything())
    expect(sent()).toEqual({
      operation: 'try-on',
      personImage: 'data:image/jpeg;base64,PERSON',
      garmentIds: ['a', 'b'],
      bodyParameters: { heightCm: 166, waistCm: 72 },
      instruction: undefined,
    })
  })

  it('regenerate: يحمل الإطلالة السابقة مرجعًا', async () => {
    await edgeFunctionImageProvider.regenerateLook({
      personImage: 'PERSON',
      garments: [garment('a')],
      previousLook: 'data:image/png;base64,PREV',
    })

    expect(sent().operation).toBe('regenerate')
    expect(sent().previousLook).toBe('data:image/png;base64,PREV')
    expect(sent().garmentIds).toEqual(['a'])
  })

  it('adapt-model: صورة الأساس والقياسات والتعديل النصّي', async () => {
    await edgeFunctionImageProvider.adaptModel({
      baseImage: 'data:image/png;base64,BASE',
      bodyParameters: { heightCm: 170 },
      refinement: 'خصر أضيق',
    })

    expect(sent()).toEqual({
      operation: 'adapt-model',
      baseImage: 'data:image/png;base64,BASE',
      bodyParameters: { heightCm: 170 },
      refinement: 'خصر أضيق',
    })
  })

  it('replace-garment: القطعة معرّفًا، والباقي معرّفات', async () => {
    await edgeFunctionImageProvider.replaceGarment({
      currentLook: 'data:image/png;base64,LOOK',
      garment: garment('new'),
      keep: [garment('k1'), garment('k2')],
    })

    expect(sent()).toEqual({
      operation: 'replace-garment',
      currentLook: 'data:image/png;base64,LOOK',
      garmentId: 'new',
      keepIds: ['k1', 'k2'],
    })
  })

  it('remove-garment: نفس الشكل بعملية مختلفة', async () => {
    await edgeFunctionImageProvider.removeGarment({
      currentLook: 'LOOK',
      garment: garment('gone'),
      keep: [garment('k1')],
    })

    expect(sent()).toEqual({
      operation: 'remove-garment',
      currentLook: 'LOOK',
      garmentId: 'gone',
      keepIds: ['k1'],
    })
  })

  it('**لا يرسل صورة قطعة أبدًا** في العمليات الخمس', async () => {
    const withImage = { ...garment('a'), image: 'data:image/jpeg;base64,GARMENT' }

    await edgeFunctionImageProvider.generateTryOn({ personImage: 'P', garments: [withImage] })
    await edgeFunctionImageProvider.regenerateLook({ personImage: 'P', garments: [withImage] })
    await edgeFunctionImageProvider.adaptModel({ baseImage: 'B', bodyParameters: {} })
    await edgeFunctionImageProvider.replaceGarment({ currentLook: 'L', garment: withImage, keep: [] })
    await edgeFunctionImageProvider.removeGarment({ currentLook: 'L', garment: withImage, keep: [] })

    for (const call of invoke.mock.calls) {
      expect(JSON.stringify(call[1].body)).not.toContain('GARMENT')
    }
  })

  it('العمليات الخمس تُسمّى كما تسمّيها الدالة', async () => {
    await edgeFunctionImageProvider.generateTryOn({ personImage: 'P', garments: [garment('a')] })
    await edgeFunctionImageProvider.regenerateLook({ personImage: 'P', garments: [garment('a')] })
    await edgeFunctionImageProvider.adaptModel({ baseImage: 'B', bodyParameters: {} })
    await edgeFunctionImageProvider.replaceGarment({ currentLook: 'L', garment: garment('a'), keep: [] })
    await edgeFunctionImageProvider.removeGarment({ currentLook: 'L', garment: garment('a'), keep: [] })

    expect(invoke.mock.calls.map((call) => call[1].body.operation)).toEqual([
      'try-on',
      'regenerate',
      'adapt-model',
      'replace-garment',
      'remove-garment',
    ])
  })

  it('خطأ الدالة يصير خطأ مجال مفهومًا بلا تسريب', async () => {
    invoke.mockResolvedValue({ data: null, error: { context: { code: 'rate-limited' } } })

    await expect(
      edgeFunctionImageProvider.generateTryOn({ personImage: 'P', garments: [garment('a')] }),
    ).rejects.toMatchObject({ code: 'rate-limited' })
  })
})
