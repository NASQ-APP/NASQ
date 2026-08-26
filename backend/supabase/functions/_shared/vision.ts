/**
 * تصنيف صورة القطعة — واجهة مزوّد قابلة للتبديل (A-07).
 *
 * المزوّد يرجّع **اقتراحات** بمفردات التطبيق نفسها (معرّف فئة، شكل، اسم لون
 * عربي). أي قيمة خارج القوائم تُسقط في الفرونت-إند، فالحقل يبقى فاضيًا بدل
 * ما تدخل الخزانة فئة مخترعة.
 *
 * قاعدة أمنية (§17): المفتاح يُقرأ من بيئة الدالة فقط، وما يُرجَّع للمتصفح.
 */
import { optionalEnv, requireEnv } from './env.ts'
import { HandledError } from './response.ts'

export type GarmentAnalysis = {
  categoryId?: string
  shape?: string
  colorName?: string
  name?: string
  brand?: string
  confidence?: number
}

export type VisionProvider = {
  readonly id: string
  analyze(image: Blob, signal: AbortSignal): Promise<GarmentAnalysis>
}

export const VISION_TIMEOUT_MS = 25_000

/** المفردات المسموحة — تُحقن في التعليمات فما يرجّع المزوّد قيمًا من عنده. */
export const CATEGORY_IDS = [
  'women-tshirts', 'women-shirts', 'women-blouses', 'women-tops', 'women-sweaters',
  'women-hoodies', 'women-jackets', 'women-coats', 'women-dresses', 'women-abayas',
  'women-skirts', 'women-pants', 'women-jeans', 'women-shorts', 'women-shoes',
  'women-bags', 'women-accessories',
  'men-tshirts', 'men-shirts', 'men-polos', 'men-sweaters', 'men-hoodies',
  'men-jackets', 'men-coats', 'men-suits', 'men-thobes', 'men-pants', 'men-jeans',
  'men-shorts', 'men-shoes', 'men-bags', 'men-accessories',
]

export const SHAPE_IDS = [
  'tee', 'shirt', 'blouse', 'polo', 'sweater', 'hoodie', 'jacket', 'blazer', 'coat',
  'abaya', 'thobe', 'dress', 'skirt', 'pants', 'jeans', 'shorts', 'sneakers', 'heels',
  'boots', 'flats', 'tote', 'shoulderBag', 'clutch', 'scarf', 'sunglasses', 'belt', 'cap',
]

export const COLOR_NAMES = [
  'أسود', 'أبيض', 'أبيض مكسور', 'كريمي', 'بيج', 'جملي', 'بني', 'رمادي', 'فحمي',
  'كحلي', 'زيتي', 'أزرق دينم', 'رملي', 'عنّابي', 'أخضر باهت', 'وردي هادئ',
]

const INSTRUCTION = `أنتِ مساعدة تصنيف ملابس. انظري للصورة وأرجعي JSON فقط بهذي الحقول:
{"categoryId":"", "shape":"", "colorName":"", "name":""}

- categoryId من هذي القائمة حصرًا: ${CATEGORY_IDS.join(', ')}
- shape من هذي القائمة حصرًا: ${SHAPE_IDS.join(', ')}
- colorName من هذي القائمة حصرًا: ${COLOR_NAMES.join(', ')}
- name اسم عربي قصير للقطعة، مثل "قميص كتان أبيض"، بحد أقصى ٤٠ حرفًا.

لو ما تأكدتِ من حقل، اتركيه فاضيًا. لا تخترعي قيمًا خارج القوائم.`

/** مزوّد متوافق مع واجهة OpenAI للرؤية (chat completions بصورة). */
const openAiCompatible = (): VisionProvider => ({
  id: 'openai-compatible',
  async analyze(image, signal) {
    const base = optionalEnv('VISION_API_BASE', 'https://api.openai.com/v1')
    const model = optionalEnv('VISION_MODEL', 'gpt-4o-mini')
    const bytes = new Uint8Array(await image.arrayBuffer())

    // btoa يحتاج نصًا؛ نبنيه على دفعات حتى ما ينفجر المكدس مع الصور الكبيرة
    let binary = ''
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
    }
    const dataUrl = `data:${image.type};base64,${btoa(binary)}`

    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal,
      headers: {
        authorization: `Bearer ${requireEnv('VISION_API_KEY')}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: INSTRUCTION },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    })

    if (response.status === 429) {
      throw new HandledError('rate-limited', 'وصلنا حد المعالجة الحالي.', 429)
    }
    if (!response.ok) {
      // ما نسجّل الجسم: ممكن يحمل بيانات الصورة
      console.error('vision rejected', { status: response.status })
      throw new HandledError('provider-failed', 'تعذّر قراءة الصورة.', 502)
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const content = payload.choices?.[0]?.message?.content
    if (!content) return {}

    try {
      return JSON.parse(content) as GarmentAnalysis
    } catch {
      return {}
    }
  },
})

const REGISTRY: Record<string, () => VisionProvider> = {
  'openai-compatible': openAiCompatible,
}

/** المزوّد المفعّل، أو `null` لو ما فيه — الغياب ليس خطأ. */
export function visionProvider(): VisionProvider | null {
  const configured = optionalEnv('VISION_PROVIDER')
  const factory = REGISTRY[configured]
  if (!factory || !optionalEnv('VISION_API_KEY')) return null
  return factory()
}
