/**
 * بناء البرومبت ديناميكيًا (A-04).
 *
 * ما هو نص ثابت أبدًا: يُركّب من الطلب نفسه، فلقطة حذاء وعباية كاملة يطلبان
 * أشياء مختلفة. المستخدمة ما تشوف أي شي من هذا — موجود للمزوّد خلف الخادم.
 *
 * البرومبت يتبع نظام التصميم (§18): خلفية محايدة فاتحة وإضاءة ناعمة موحّدة،
 * عشان الصورة المولّدة تندمج مع الواجهة بدل ما تصادمها.
 */
import { categoryById } from '@/domain/wardrobe/categories'
import type { VirtualTryOnRequest } from './types'

const FRAMING_LINE: Record<string, string> = {
  full: 'Full-body fashion shot, the whole silhouette visible, feet included.',
  upper: 'Upper-body crop from head to hips; garment detail clearly readable.',
  lower: 'Three-quarter lower-body crop with emphasis on the footwear.',
  detail: 'Tight crop on the selected accessory, still recognisably worn by the model.',
}

export function buildTryOnPrompt(request: VirtualTryOnRequest): string {
  const parts: string[] = []

  parts.push(
    request.source === 'photo'
      ? 'Create a realistic try-on image using the supplied photograph as the identity and body reference.'
      : 'Create a realistic try-on image using the supplied model reference as a fixed identity.',
  )

  if (request.preserveIdentity) {
    parts.push(
      'Preserve the person exactly: facial features, skin tone, body proportions, hair and pose. Do not substitute a different person.',
    )
  }
  if (request.modelSeed != null) {
    parts.push(`Identity seed: ${request.modelSeed}. Reuse it so repeat generations stay the same person.`)
  }

  const worn = request.selectedItems
    .map((p) => {
      const cat = categoryById(p.categoryId)
      return `- ${cat?.nameLatin ?? p.categoryId}: "${p.name}" (${p.colorHex})`
    })
    .join('\n')
  parts.push(`Dress the person in the following garments, using the supplied references verbatim:\n${worn}`)

  // §41 — the catalogue is the source of truth, the image only visualises it
  parts.push(
    'Reproduce each garment exactly: same silhouette, colour, pattern, texture and details. Do not redesign, recolour, restyle or embellish any garment.',
  )

  if (request.neutralFillers.length) {
    const fillers = request.neutralFillers.map((f) => `${f.slot} (${f.colorHex})`).join(', ')
    parts.push(
      `Complete the outfit with plain unbranded studio basics for: ${fillers}. Keep them visually quiet so the selected garments remain the focus. They must not look like purchasable products.`,
    )
  }

  parts.push(FRAMING_LINE[request.framing])
  parts.push(
    'Clean seamless studio background, soft even lighting, premium e-commerce look. No text, no watermark, no extra accessories, one person only.',
  )

  return parts.join('\n\n')
}
