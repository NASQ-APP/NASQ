/**
 * تصنيف صورة القطعة — واجهة مزوّد قابلة للتبديل (A-07).
 *
 * المزوّد يرجّع **اقتراحات** بمفردات التطبيق نفسها (معرّف فئة، شكل، اسم لون
 * عربي). أي قيمة خارج القوائم تُسقط في الفرونت-إند، فالحقل يبقى فاضيًا بدل
 * ما تدخل الخزانة فئة مخترعة.
 *
 * قاعدة أمنية (§17): المفتاح يُقرأ من بيئة الدالة فقط، وما يُرجَّع للمتصفح.
 *
 * **المفاتيح والنموذج يجيان من طبقة الوكيل والراوتر**، لا من متغيّرات خاصة
 * بالرؤية. كان هذا الملف يطلب `VISION_API_KEY` — متغيّر غير موجود في البيئة —
 * فيرجع المزوّد `null` دائمًا ويسقط التصنيف بصمت. المفتاح واحد للوكيل كله،
 * والراوتر يقرّر طبقة النموذج.
 */
import { optionalEnv } from './env.ts'
import { agentChat, agentConfigured } from './agent.ts'
import { routeTask } from './router.ts'

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

/**
 * مزوّد الرؤية عبر الوكيل.
 *
 * الصورة تُمرَّر data URL، والنموذج يُختار من الراوتر (طبقة `vision`). الرد
 * يُطلب JSON صراحةً — المخرَج مبنيَن لا فقرة نصية.
 */
const agentVision = (): VisionProvider => ({
  id: 'agent',
  async analyze(image, signal) {
    const bytes = new Uint8Array(await image.arrayBuffer())

    // btoa يحتاج نصًا؛ نبنيه على دفعات حتى ما ينفجر المكدس مع الصور الكبيرة
    let binary = ''
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
    }
    const dataUrl = `data:${image.type};base64,${btoa(binary)}`

    const { model } = routeTask({ operation: 'analyze-garment', hasImage: true })

    const content = await agentChat({
      model,
      maxTokens: 300,
      json: true,
      signal,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: INSTRUCTION },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    })

    if (!content) return {}
    try {
      return JSON.parse(content) as GarmentAnalysis
    } catch {
      // ردّ ليس JSON: اقتراحات فاضية أصدق من تخمين محتواه
      return {}
    }
  },
})

const REGISTRY: Record<string, () => VisionProvider> = {
  agent: agentVision,
  // الاسم القديم يبقى مقبولاً: بيئة مضبوطة عليه ما تنكسر بتغيير التسمية
  'openai-compatible': agentVision,
}

/**
 * المزوّد المفعّل، أو `null` لو ما فيه — الغياب ليس خطأ، والتصنيف كماليّ.
 *
 * الافتراضي `agent`: البيئة التي فيها مفتاح وكيل تريد التصنيف، وإجبارها على
 * ضبط متغيّر ثانٍ لتفعيله يترك الميزة مطفأة بلا سبب ظاهر.
 */
export function visionProvider(): VisionProvider | null {
  if (!agentConfigured()) return null
  const factory = REGISTRY[optionalEnv('VISION_PROVIDER', 'agent')]
  return factory ? factory() : null
}
