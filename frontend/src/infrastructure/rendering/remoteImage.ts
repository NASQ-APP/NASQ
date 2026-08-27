/**
 * قراءة صور المتاجر داخل المتصفح.
 *
 * شبكات المتاجر ما ترسل ترويسة CORS، فرسم صورة منها على canvas يلوّثه ويمنع
 * قراءة بكسلاتها. تمريرها عبر وسيط التطوير يخليها من نفس الأصل فتُقرأ عاديًا.
 *
 * الوسيط يمرّر الصور اللي يعرفها فقط، فنعرّفه على الروابط أول — لأن صور إضافة
 * المتصفح ما مرّت عليه.
 */
import { DEV_IMAGE_PATH } from '../../../vite-plugins/import-path'

export const proxiedImage = (src: string): string =>
  `${DEV_IMAGE_PATH}?src=${encodeURIComponent(src)}`

export async function registerImages(images: string[]): Promise<void> {
  try {
    await fetch(DEV_IMAGE_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ images }),
    })
  } catch {
    // لو ما اشتغل التسجيل تفشل القراءة ويرجع كل مستهلك لبديله — بلا انهيار
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image), { once: true })
    image.addEventListener('error', () => reject(new Error('image load failed')), { once: true })
    image.src = src
  })
}
