/**
 * عقد البرومبت — نصوص فقط، بلا شبكة ولا مزوّد.
 *
 * ما يُختبر هنا ليس الصياغة بل **القواعد التي انكسرت فعلاً في النتائج**:
 * القطعة تُركَّب فوق اللبس الأصلي بدل أن تحلّ محلّه، والكاميرا تقرّب فتقصّ
 * الرأس. القاعدة الغائبة عن النص لا يعرفها النموذج.
 */
import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1'
import {
  buildRegeneratePrompt,
  buildRemoveGarmentPrompt,
  buildReplaceGarmentPrompt,
  buildTryOnPrompt,
} from '../functions/_shared/tryonPrompts.ts'
import type { GarmentReference } from '../functions/_shared/tryonPrompts.ts'

const dress: GarmentReference = {
  id: 'd1',
  category: 'dress',
  slot: 'full body',
  name: 'فستان سهرة عنابي طويل',
  colorName: 'burgundy',
}

Deno.test('J · الفستان يلغي العلوي والسفلي الأصليين صراحةً', () => {
  const prompt = buildTryOnPrompt([dress])

  assertStringIncludes(prompt, 'PLACEHOLDER clothing only')
  assertStringIncludes(prompt, 'define the FINAL outfit')
  assertStringIncludes(prompt, 'remove the original top and the original pants, jeans or leggings')
  // الاستثناء يبقى: جاكيت مختار يُلبس فوق قميص مختار
  assertStringIncludes(prompt, 'unless a selected garment is explicitly an outerwear')
})

Deno.test('K · التأطير: بلا تقريب وبلا قصّ ورأس كامل', () => {
  const prompt = buildTryOnPrompt([dress])

  assertStringIncludes(prompt, 'Do not zoom in or out.')
  assertStringIncludes(prompt, 'Do not crop the head, the face or the feet.')
  assertStringIncludes(prompt, 'Keep the full body visible from head to toe.')
  assertStringIncludes(prompt, 'same camera distance, framing and crop')
})

Deno.test('الهوية والقطعة محفوظتان — ما تغيّرت بالتشديد', () => {
  const prompt = buildTryOnPrompt([dress])

  for (const rule of [
    '- identity',
    '- face and facial features',
    '- hairstyle',
    '- skin tone',
    '- body proportions',
    '- original colour',
    '- length and cut',
  ]) {
    assertStringIncludes(prompt, rule)
  }
  assertStringIncludes(prompt, 'Do not invent extra garments beyond the supplied references.')
})

Deno.test('regenerate يرث نفس العقد حرفيًا', () => {
  const base = buildTryOnPrompt([dress])
  const again = buildRegeneratePrompt([dress], true)

  assertStringIncludes(again, 'remove the original top and the original pants, jeans or leggings')
  assertStringIncludes(again, 'Do not zoom in or out.')
  // الوراثة بالبناء لا بالنسخ: النص الأساسي داخله كاملاً
  assertStringIncludes(again, base)
})

Deno.test('التحرير يحفظ التأطير ولا يرث عقد الاستبدال الكامل', () => {
  const keep: GarmentReference[] = []
  for (const prompt of [
    buildReplaceGarmentPrompt(dress, keep),
    buildRemoveGarmentPrompt(dress, keep),
  ]) {
    assertStringIncludes(prompt, 'Do not zoom in or out.')
    assertStringIncludes(prompt, 'Keep the full body visible from head to toe.')
    /*
      «اللبس الظاهر placeholder» صحيحة على صورة الموديل الخام وكارثية على
      إطلالة مولّدة: تجعل النموذج يمسح ما بناه بدل أن يعدّل قطعة واحدة.
    */
    assertEquals(prompt.includes('PLACEHOLDER clothing only'), false)
  }
})
