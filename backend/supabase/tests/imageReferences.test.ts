/**
 * محاذاة المراجع — الوصف والصورة يشيران لنفس القطعة.
 *
 * العطل الذي تحرسه هذي الاختبارات ليس تعطّلاً بل **كذبًا هادئًا**: النموذج
 * يولّد صورة سليمة الشكل لقطعة غير التي اختارتها المستخدمة، فما فيه ما يكشفه
 * إلا عين تقارن. لذلك الحراسة على البنية لا على النتيجة.
 */
import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1'
import {
  alignGarments,
  buildRegeneratePrompt,
  buildTryOnPrompt,
  buildTryOnReferences,
} from '../functions/_shared/tryonPrompts.ts'
import type { GarmentReference, ResolvedGarment } from '../functions/_shared/tryonPrompts.ts'

const garment = (id: string, category: string): GarmentReference => ({
  id,
  category,
  slot: 'body',
  name: `اسم ${id}`,
  colorName: 'black',
})

const PERSON = 'data:image/png;base64,PERSON'
const img = (id: string) => `data:image/png;base64,${id}`

Deno.test('A · قطعتان بصورتيهما → وصفان وثلاث صور وترقيم صحيح', () => {
  const entries: ResolvedGarment[] = [
    { garment: garment('a', 'blouse'), image: img('A') },
    { garment: garment('b', 'jeans'), image: img('B') },
  ]

  const aligned = alignGarments(entries)!
  assertEquals(aligned.length, 2)

  const images = buildTryOnReferences(PERSON, aligned)
  assertEquals(images, [PERSON, img('A'), img('B')])

  const prompt = buildTryOnPrompt(aligned.map((entry) => entry.garment))
  assertStringIncludes(prompt, 'blouse — reference image 2')
  assertStringIncludes(prompt, 'jeans — reference image 3')

  // الرقم في النص يطابق الموضع في الصور فعلاً — لا بالقراءة بل بالفهرسة
  assertEquals(images[1], img('A'))
  assertEquals(images[2], img('B'))
})

Deno.test('B · صورة القطعة الأولى تعذّرت → لا انزياح، والتوليد لا يبدأ', () => {
  const entries: ResolvedGarment[] = [
    { garment: garment('a', 'blouse'), image: undefined },
    { garment: garment('b', 'jeans'), image: img('B') },
  ]

  assertEquals(alignGarments(entries), undefined)

  /*
    السلوك القديم: `usable` تصير [B] و`garments` تبقى [blouse, jeans]، فيقول
    النص «blouse — reference image 2» بينما الصورة ٢ هي الجينز. الاختبار
    يثبت أن هذا الطريق مقفول من أصله.
  */
})

Deno.test('C · صورة قطعة وسطى تعذّرت → ترقيم الباقي ما يُبنى على نقص', () => {
  const entries: ResolvedGarment[] = [
    { garment: garment('a', 'blouse'), image: img('A') },
    { garment: garment('b', 'skirt'), image: undefined },
    { garment: garment('c', 'coat'), image: img('C') },
  ]

  assertEquals(alignGarments(entries), undefined)
})

Deno.test('D · كل الصور تعذّرت → لا توليد', () => {
  const entries: ResolvedGarment[] = [
    { garment: garment('a', 'blouse'), image: undefined },
    { garment: garment('b', 'jeans'), image: undefined },
  ]

  assertEquals(alignGarments(entries), undefined)
  assertEquals(alignGarments([]), undefined, 'بلا قطع أصلاً — ما فيه ما يُلبَس')
})

Deno.test('E · القطعة بلا صورة لا تُوصف — فلا يخترعها النموذج من اسمها', () => {
  const entries: ResolvedGarment[] = [
    { garment: garment('a', 'blouse'), image: img('A') },
    { garment: garment('b', 'jeans'), image: undefined },
  ]

  const aligned = alignGarments(entries)
  assertEquals(aligned, undefined)

  // ولو سمحت سياسة أخرى بالمتابعة، الوصف يُبنى من المحاذى وحده لا من المدخل
  const partial = alignGarments(entries.slice(0, 1))!
  const prompt = buildTryOnPrompt(partial.map((entry) => entry.garment))
  /*
    الكلمة وحدها لا تكفي دليلاً: «jeans» ترد في قاعدة الفستان نفسها
    («remove the original top and the original pants, jeans or leggings»).
    فالمقصود غياب **وصف** القطعة ومرجعها ورقمها، لا غياب الحرف.
  */
  assertEquals(prompt.includes('jeans — reference image'), false)
  assertEquals(prompt.includes('اسم b'), false)
  assertEquals(prompt.includes('reference image 3'), false, 'ما فيه مرجع ثالث أصلاً')
})

Deno.test('F · شخص وقطعة ومحاولة سابقة → ترقيم ثابت وموضع السابقة مذكور', () => {
  const aligned = alignGarments([{ garment: garment('a', 'dress'), image: img('A') }])!

  const images = buildTryOnReferences(PERSON, aligned, img('PREV'))
  assertEquals(images, [PERSON, img('A'), img('PREV')])

  const prompt = buildRegeneratePrompt(
    aligned.map((entry) => entry.garment),
    true,
  )
  assertStringIncludes(prompt, 'dress — reference image 2')
  assertStringIncludes(prompt, 'reference image 3, the last reference image')

  // بلا محاولة سابقة ما فيه مرجع ثالث ولا ذكر له
  assertEquals(buildTryOnReferences(PERSON, aligned).length, 2)
  assertEquals(buildRegeneratePrompt(aligned.map((e) => e.garment), false).includes('previous attempt'), false)
})
