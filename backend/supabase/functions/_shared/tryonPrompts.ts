/**
 * بناء البرومبت — **على الخادم**.
 *
 * نص واحد لكل عملية، مبني من الطلب نفسه لا ثابتًا: قميص وحده وإطلالة من خمس
 * قطع يطلبان أشياء مختلفة. المستخدمة ما تشوف شيئًا من هذا.
 *
 * كان في `frontend/src/domain/tryon/prompts.ts`، وانتقل هنا مع المفتاح: لو
 * بقي البناء في المتصفح لصارت الدالة وسيطًا يمرّر أي نص يوصله، وأي حساب
 * مسجَّل يقدر يولّد صورًا عشوائية على رصيد المشروع.
 *
 * والواجهة الآن ترسل **معرّفات القطع فقط**؛ أوصافها تُقرأ من الجدول هنا. فما
 * تقدر تصف قطعة بغير ما هي، ولا يختلف ما يقوله النص عمّا في الخزانة.
 *
 * ثلاث قواعد تحكم كل البرومبتات:
 *   ١. **الهوية أولًا** — يُذكر حفظ الشخص قبل أي شي، لأن أول ما يخطئ فيه
 *      النموذج هو استبدال الشخص.
 *   ٢. **القطعة كما هي** — النموذج ميّال لإعادة التصميم، فالمنع صريح ومكرّر.
 *   ٣. **الممنوعات في الآخر** — آخر ما يُقرأ أكثر أثرًا.
 *
 * نقي بالكامل: نصوص فقط، بلا شبكة ولا Deno — فيُختبر وحده.
 */

/**
 * قياسات تقريبية.
 *
 * **إرشاد بصري لا هندسة**: ما نحوّل السنتيمتر إلى بكسل، ولا ندّعي أن النتيجة
 * مقاس مضمون. الغاية تقريب التناسب لا قياسه.
 */
export type BodyParameters = {
  heightCm?: number
  weightKg?: number
  chestCm?: number
  waistCm?: number
  hipsCm?: number
  shoulderWidthCm?: number
  inseamCm?: number
}

/**
 * القطعة كما يحتاجها النص.
 *
 * بلا صورة: الصور تُحلّ في `images-generate` من مسار تخزين القطعة، والنص لا
 * يحتاج منها إلا الوصف. فصلهما يمنع تمرير صورة لا تخصّ القطعة الموصوفة.
 *
 * `slot` نصّ هنا لا اتحاد: الخادم يحقنه في جملة إنجليزية ولا يفرّع عليه، ونسخ
 * الاتحاد كاملاً يخلق مصدرًا ثانيًا للحقيقة يتفرّق عن الواجهة بصمت.
 */
export type GarmentReference = {
  id: string
  /** فئة القطعة كما يفهمها النموذج: shirt · trousers · blazer… */
  category: string
  slot: string
  /** اسم القطعة كما سمّتها المستخدمة — يدخل البرومبت لتوضيح المقصود */
  name: string
  colorName: string
}

/* ------------------------------ مشترك ------------------------------ */

const PRESERVE_PERSON = [
  "Preserve the person's:",
  '- identity',
  '- face and facial features',
  '- hairstyle',
  '- skin tone',
  '- pose and body orientation',
  '- body proportions',
  '- camera angle and framing',
  'Keep the full body visible.',
].join('\n')

const PRESERVE_GARMENTS = [
  "Preserve each garment's:",
  '- original colour',
  '- pattern',
  '- texture',
  '- silhouette',
  '- length and cut',
  '- major design details',
].join('\n')

const FORBIDDEN = [
  'Do not redesign the garments.',
  'Do not introduce random clothing that was not supplied.',
  'Do not keep or reuse the placeholder clothing the person was originally wearing.',
  'Do not invent extra garments beyond the supplied references.',
  'Do not change the colours of the supplied garments.',
  'Do not change the person’s identity.',
  'Do not alter the background or lighting.',
].join('\n')

const CLOSING = [
  'Make the garments fit naturally on the body while remaining faithful to the supplied clothing references.',
  'Generate a realistic, photorealistic fashion try-on result.',
].join('\n')

/**
 * القيم التي تعني «ما عرفنا» — لا لونًا.
 *
 * تُكتب في الجدول حين يفشل التعرّف على اللون، فتصل هنا كأنها اسم لون.
 */
const UNKNOWN_COLOR = /^(غير\s*محدد|غير\s*معروف|unknown|n\/?a|-)$/i

/**
 * سطر لكل قطعة: رقمها ومرجعها ولونها وموضعها، ثم اسمها كما سمّتها المستخدمة.
 *
 * **اللون المجهول يُحذف ولا يُقال.** كان النص يحقن ما يصله حرفيًا، فقطعة لم
 * نتعرّف على لونها تصل النموذج على هيئة «غير محدد dress» — كلامٌ بلا معنى
 * يقرأه على أنه لون، فيضيع منه أن الفستان أبيض ويلوّنه من عنده. والصمت عن
 * اللون أصدق من ادّعائه: الصورة المرفقة تقوله.
 *
 * **والاسم يدخل النص.** كان يُمرَّر ويُهمَل، مع أنه أغنى ما نملك: «فستان أبيض
 * طول الأرض بقصة ميرمايد بأكمام طويلة» تصف القَصّة والطول والأكمام في سطر —
 * وهي بالضبط ما يخطئ فيه النموذج حين يقرأ صورة وحدها.
 */
const describe = (garment: GarmentReference, index: number): string => {
  const colour = UNKNOWN_COLOR.test(garment.colorName?.trim() ?? '')
    ? ''
    : `${garment.colorName.trim()} `

  const named = garment.name?.trim()
    ? `\n   The owner describes it as: ${garment.name.trim()}`
    : ''

  return `${index + 1}. ${colour}${garment.category} — reference image ${index + 2}, worn on the ${garment.slot}${named}`
}

/* --------------------------- التجربة الكاملة --------------------------- */

export function buildTryOnPrompt(
  garments: GarmentReference[],
  bodyParameters?: BodyParameters,
  instruction?: string,
): string {
  const parts = [
    'Create a photorealistic virtual try-on image.',
    'Reference image 1 is the person. Use it as the primary identity reference.',
    'Dress the person using ONLY the supplied garment reference images.',
    /*
      **الأهم**: صورة الموديل الأساسية شخصٌ يلبس أصلاً (تيشيرت أسود ولقنز).
      وبلا هذي القاعدة يفهم النموذج «ألبسيه هذي» إضافةً لا استبدالاً، فيركّب
      القطع فوق ملابسه — فتطلع الكامي فوق تيشيرت أسود لم تختره المستخدمة.

      واستثناء الطبقات الخارجية ضروري: جاكيت مختار **يجب** أن يُلبس فوق قميص
      مختار. بلا الاستثناء تُفهم القاعدة «اخلعي كل شيء عدا الأخير» فتضيع
      الطبقات المقصودة.

      وتنطبق على `try-on` و`regenerate` وحدهما — `replace` و`remove` يبنيان
      على الإطلالة الحالية ويجب أن يحفظا بقيتها.
    */
    [
      'The clothing visible on the base person image is PLACEHOLDER clothing only.',
      'Completely replace the original visible outfit with the selected garment references.',
      'Do not layer selected garments on top of the original clothing unless a selected garment is explicitly an outerwear or layering item.',
      'No part of the original shirt, top, pants, leggings, dress or other placeholder clothing may remain visible in the final image unless physically necessary.',
      'The selected garment references define the final outfit.',
    ].join('\n'),
    /*
      صور المتاجر أغلبها على عارضة. وبلا هذي الجملة يرى النموذج شخصين ويحتار
      أيّهما يُبقي — فيمزج الوجهين أو يستبدل الشخص بعارضة المتجر.
    */
    'A garment reference image may show a model wearing the garment. Take ONLY the garment from it — never the model, their face, body, pose or background.',
    PRESERVE_PERSON,
    PRESERVE_GARMENTS,
    `Garments to put on, in layering order:\n${garments.map(describe).join('\n')}`,
  ]

  const body = describeBody(bodyParameters)
  if (body) parts.push(body)
  if (instruction?.trim()) parts.push(`Additional request: ${instruction.trim()}`)

  parts.push(FORBIDDEN, CLOSING)
  return parts.join('\n\n')
}

/* ---------------------------- تعديل الجسم ---------------------------- */

/**
 * القياسات **إرشاد بصري**.
 *
 * نقولها للنموذج صراحة: قرّب التناسب، ولا تعامل الأرقام كقياس هندسي — وإلا
 * حاول رسم مسطرة بدل جسم.
 */
export function describeBody(parameters?: BodyParameters): string {
  if (!parameters) return ''

  const lines: string[] = []
  const add = (label: string, value?: number, unit = 'cm') => {
    if (value != null) lines.push(`- ${label}: about ${value} ${unit}`)
  }

  add('height', parameters.heightCm)
  add('weight', parameters.weightKg, 'kg')
  add('chest/bust', parameters.chestCm)
  add('waist', parameters.waistCm)
  add('hips', parameters.hipsCm)
  add('shoulder width', parameters.shoulderWidthCm)
  add('inseam', parameters.inseamCm)

  if (lines.length === 0) return ''

  return [
    'Approximate body proportions to aim for:',
    ...lines,
    'Treat these as visual guidance for proportion only, not as exact measurements.',
  ].join('\n')
}

export function buildAdaptModelPrompt(
  bodyParameters: BodyParameters,
  refinement?: string,
): string {
  const parts = [
    'Adjust the body proportions of the person in the supplied image.',
    PRESERVE_PERSON,
    'Change ONLY the body proportions. Everything else must stay identical: same face, same hair, same clothing, same pose, same background, same lighting, same framing.',
  ]

  const body = describeBody(bodyParameters)
  if (body) parts.push(body)
  if (refinement?.trim()) parts.push(`Refinement requested: ${refinement.trim()}`)

  parts.push(
    'Do not change the person’s identity or face.\nDo not change the clothing.\nDo not crop the body.',
    'Produce a photorealistic result that still clearly looks like the same person.',
  )
  return parts.join('\n\n')
}

/* --------------------------- استبدال قطعة --------------------------- */

/**
 * التعديل يبني على الإطلالة المولّدة لا على الموديل الأصلي.
 *
 * إعادة التوليد من الصفر تغيّر الشخص والوقفة والإضاءة كلها لأجل جاكيت واحد —
 * فنعطي النموذج الصورة الحالية ونطلب تغيير قطعة واحدة بالاسم، ونعدّد ما يجب
 * أن يبقى صراحة.
 */
export function buildReplaceGarmentPrompt(
  garment: GarmentReference,
  keep: GarmentReference[],
): string {
  const kept =
    keep.length > 0
      ? keep.map((item) => `- the ${item.category}`).join('\n')
      : '- every other garment already worn'

  return [
    'Reference image 1 is the current look. Reference image 2 is a new garment.',
    `Replace ONLY the ${garment.category} in the current look with the ${garment.category} from reference image 2.`,
    `The new garment: ${describe(garment, 0)}`,
    'Reference image 2 may show a model wearing the garment. Take ONLY the garment from it.',
    'Keep everything else exactly as it is:',
    [
      '- same person and identity',
      '- same face and hairstyle',
      '- same pose and body proportions',
      '- same background and lighting',
      '- same camera angle and framing',
      kept,
    ].join('\n'),
    PRESERVE_GARMENTS,
    'Do not restyle the rest of the outfit.\nDo not change the person.\nDo not alter garments that were not named.',
    'Produce a photorealistic result that differs from the original only in the replaced garment.',
  ].join('\n\n')
}

export function buildRemoveGarmentPrompt(
  garment: GarmentReference,
  keep: GarmentReference[],
): string {
  const kept =
    keep.length > 0
      ? keep.map((item) => `- the ${item.category}`).join('\n')
      : '- every other garment already worn'

  return [
    'Reference image 1 is the current look.',
    `Remove ONLY the ${garment.category} from the look.`,
    'Keep everything else exactly as it is:',
    ['- same person and identity', '- same pose', '- same background and lighting', kept].join('\n'),
    'Reveal whatever is naturally underneath — do not invent a replacement garment.',
    'Do not restyle the rest of the outfit.\nDo not change the person.',
    'Produce a photorealistic result.',
  ].join('\n\n')
}

/* --------------------------- إعادة التوليد --------------------------- */

/**
 * إعادة المحاولة تستعمل المحاولة السابقة مرجعًا للهوية — وإلا صار كل ضغط على
 * «أعيدي» شخصًا جديدًا، والمستخدمة تبي نتيجة أفضل لا شخصًا آخر.
 */
export function buildRegeneratePrompt(
  garments: GarmentReference[],
  hasPrevious: boolean,
  bodyParameters?: BodyParameters,
  instruction?: string,
): string {
  const base = buildTryOnPrompt(garments, bodyParameters, instruction)
  if (!hasPrevious) return base

  return [
    'A previous attempt is supplied as the last reference image.',
    'Keep the same person, pose, framing and background as that attempt, but improve how the garments sit on the body.',
    base,
  ].join('\n\n')
}
