/**
 * تحويل الرابط الملصوق إلى رابط صورة تُعرض فعلًا.
 *
 * زر المشاركة في بنترست يعطي رابط **صفحة** (`pin.it/…`) مب رابط صورة، و`<img>`
 * ما يعرض صفحة — يطلع مربع فاضي. فنجرّب الرابط كصورة أولًا، وإذا ما كان صورة
 * نقرأ `og:image` من الصفحة عبر وسيط التطوير.
 */
import { loadImage } from '@/infrastructure/rendering/remoteImage'
import { DEV_PAGE_IMAGE_PATH } from '../../../vite-plugins/import-path'

/** هل يُعرض هذا الرابط في `<img>`؟ */
async function loadsAsImage(url: string): Promise<boolean> {
  try {
    const image = await loadImage(url)
    return image.naturalWidth > 0
  } catch {
    return false
  }
}

/**
 * يرجّع رابط صورة صالحًا للعرض، أو `undefined` لو ما لقينا صورة.
 * ما نرجّع بديلًا ولا صورة وهمية — إمّا صورة اللوك أو لا شيء.
 */
export async function resolveImageUrl(url: string): Promise<string | undefined> {
  if (await loadsAsImage(url)) return url
  if (!import.meta.env.DEV) return undefined

  try {
    const response = await fetch(DEV_PAGE_IMAGE_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    if (!response.ok) return undefined
    const { imageUrl } = (await response.json()) as { imageUrl?: string }
    return imageUrl && (await loadsAsImage(imageUrl)) ? imageUrl : undefined
  } catch {
    return undefined
  }
}
