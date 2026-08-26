/**
 * حساب قناع الخلفية — خوارزمية محلية بلا خادم ولا مفتاح.
 *
 * الفكرة: صور الملابس اللي تصوّرها المستخدمة تكون على سطح شبه موحّد (جدار،
 * سرير، طاولة). نقرأ لون الحواف كمرجع، ثم ننتشر منها للداخل.
 *
 * الانتشار **بخطوة محلية**: البكسل ينضم لو كان قريبًا من جاره المضموم أصلاً،
 * مو من مرجع عام واحد. هذا اللي يخلي الخلفية المتدرّجة تنشال كاملة — الإضاءة
 * تتغيّر تدريجيًا فكل خطوة صغيرة، بينما حدّ القطعة قفزة كبيرة توقف الانتشار.
 * ومعه سياج عام واسع يمنع الانتشار من الهروب داخل القطعة.
 *
 * والظل له مرحلة ثانية: الظل يحتفظ بدرجة لون الخلفية ويخسر لمعانها فقط، لكن
 * القطعة الغامقة تفعل نفس الشي — فالفصل بينهما مكاني لا لوني. نسمح للظل
 * بالانتشار من حدّ الخلفية بعمق محدود، فتنشال الهالة وتبقى القطعة.
 *
 * المسافة تُقاس في فضاء Lab لأن المسافة في RGB تخدع.
 *
 * منطق نقي: يشتغل على مصفوفة بكسلات، بلا DOM ولا canvas — فيُختبر وحده.
 */

export type MaskOptions = {
  /** الخطوة المحلية المسموحة بين بكسل وجاره. أكبر = ينتشر أبعد. */
  step?: number
  /** السياج العام عن لون الخلفية — يمنع ابتلاع القطعة. */
  bound?: number
  /** نعومة الحافة بالبكسل — تمنع الحواف المسنّنة. */
  feather?: number
  /** أقصى عتمة يُقبل معها الظل — أغمق منها يعني قطعة. */
  shadowDrop?: number
  /** أدنى عتمة يُقبل معها الظل — أفتح منها يعني قطعة فاتحة. */
  shadowMinDrop?: number
  /** عمق ابتلاع الظل كنسبة من أصغر ضلع — يمنع أكل قطعة غامقة. */
  shadowReach?: number
}

export type MaskResult = {
  /** ٢٥٥ = خلفية · ٠ = قطعة */
  mask: Uint8Array
  /** نسبة البكسلات اللي اعتُبرت خلفية */
  backgroundRatio: number
}

const DEFAULT_STEP = 6
const DEFAULT_BOUND = 26
const DEFAULT_FEATHER = 3
const DEFAULT_SHADOW_DROP = 42
/**
 * الظل المصبوب يعتّم بقوة (٢٠ درجة فأكثر). القطعة الفاتحة اللي لونها قريب من
 * الخلفية تفرق أقل من ذلك — فالحدّ الأدنى هو اللي يمنع ابتلاعها. والظل الخفيف
 * اللي ينزل تحت هذا الحد خفيف أصلاً، فبقاؤه أهون من أكل القطعة.
 */
const DEFAULT_SHADOW_MIN_DROP = 20
/**
 * ٣٫٥٪ من أصغر ضلع: يكفي لهالة الظل المعتادة ويقصر بكثير عن ابتلاع قطعة.
 * على صورة ٩٠٠ بكسل يعني ٣١ بكسل — والقطعة عادةً مئات البكسلات.
 */
const DEFAULT_SHADOW_REACH = 0.035
/** أقصى فرق في درجة اللون يُسمح به للظل — الظل يغيّر اللمعان لا الدرجة. */
const SHADOW_CHROMA = 7

/**
 * جدول sRGB → خطّي. المدخلات ٢٥٦ قيمة فقط، فحسابها مرة يوفّر مئات آلاف
 * النداءات على صورة كاملة.
 */
const LINEAR = new Float32Array(256)
for (let i = 0; i < 256; i++) {
  const c = i / 255
  LINEAR[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/**
 * يحوّل كل البكسلات لـLab مرة وحدة — أرخص من التحويل داخل الانتشار.
 *
 * الحساب مكتوب هنا مباشرة بدل مناداة `rgbToLab` لكل بكسل: النداء يخصّص كائنًا
 * ومصفوفة لكل بكسل، وعلى صورة كبيرة هذا مئات آلاف التخصيصات.
 */
function toLabPlanes(pixels: Uint8ClampedArray, count: number) {
  const l = new Float32Array(count)
  const a = new Float32Array(count)
  const b = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const p = i * 4
    const lr = LINEAR[pixels[p]]
    const lg = LINEAR[pixels[p + 1]]
    const lb = LINEAR[pixels[p + 2]]

    const x = (lr * 0.4124 + lg * 0.3576 + lb * 0.1805) / 0.95047
    const y = lr * 0.2126 + lg * 0.7152 + lb * 0.0722
    const z = (lr * 0.0193 + lg * 0.1192 + lb * 0.9505) / 1.08883

    const fx = x > 0.008856 ? Math.cbrt(x) : 7.787 * x + 16 / 116
    const fy = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116
    const fz = z > 0.008856 ? Math.cbrt(z) : 7.787 * z + 16 / 116

    l[i] = 116 * fy - 16
    a[i] = 500 * (fx - fy)
    b[i] = 200 * (fy - fz)
  }

  return { l, a, b }
}

/** وسيط — أمتن من المتوسط لما تكون فيه بكسلات شاذّة على الحافة. */
function median(values: Float32Array): number {
  const sorted = values.toSorted()
  const middle = sorted.length >> 1
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

/**
 * يقدّر لون الخلفية من إطار الصورة الخارجي.
 * التشتّت يوسّع السياج: خلفية متدرّجة تحتاج مساحة أكبر.
 */
export function estimateBackground(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  planes = toLabPlanes(pixels, width * height),
) {
  const border = Math.max(1, Math.round(Math.min(width, height) * 0.02))
  const indices: number[] = []

  // نمشي على أشرطة الحافة فقط — مسح الصورة كاملة لتجميع ٢٪ منها هدر
  for (let y = 0; y < border; y++) {
    for (let x = 0; x < width; x++) {
      indices.push(y * width + x, (height - 1 - y) * width + x)
    }
  }
  for (let y = border; y < height - border; y++) {
    for (let x = 0; x < border; x++) {
      indices.push(y * width + x, y * width + (width - 1 - x))
    }
  }

  const pick = (plane: Float32Array) => {
    const values = new Float32Array(indices.length)
    for (let i = 0; i < indices.length; i++) values[i] = plane[indices[i]]
    return median(values)
  }

  const reference = { l: pick(planes.l), a: pick(planes.a), b: pick(planes.b) }

  const distances = new Float32Array(indices.length)
  for (let i = 0; i < indices.length; i++) {
    const index = indices[i]
    const dl = planes.l[index] - reference.l
    const da = planes.a[index] - reference.a
    const db = planes.b[index] - reference.b
    distances[i] = Math.sqrt(dl * dl + da * da + db * db)
  }

  return { reference, spread: median(distances), planes, border }
}

/**
 * ينتشر من الحواف للداخل بخطوة محلية داخل سياج عام.
 *
 * الانتشار (مو فحص لوني مستقل لكل بكسل) مهم: لو القطعة نفسها فيها لون يشبه
 * الخلفية، ما ينشال لأنه غير متصل بالحافة.
 */
export function buildBackgroundMask(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  {
    step = DEFAULT_STEP,
    bound = DEFAULT_BOUND,
    feather = DEFAULT_FEATHER,
    shadowDrop = DEFAULT_SHADOW_DROP,
    shadowMinDrop = DEFAULT_SHADOW_MIN_DROP,
    shadowReach = DEFAULT_SHADOW_REACH,
  }: MaskOptions = {},
): MaskResult {
  const count = width * height
  const { reference, spread, planes } = estimateBackground(pixels, width, height)

  const { l, a, b } = planes
  const stepSquared = (step + spread) ** 2
  const boundSquared = (bound + spread * 2) ** 2

  const mask = new Uint8Array(count)
  const queue = new Int32Array(count)
  let head = 0
  let tail = 0

  /** بُعد البكسل عن لون الخلفية المرجعي — مربّعًا، بلا جذر. */
  const fromReference = (index: number) => {
    const dl = l[index] - reference.l
    const da = a[index] - reference.a
    const db = b[index] - reference.b
    return dl * dl + da * da + db * db
  }

  /** الظل: نفس درجة اللون تقريبًا، وأغمق ضمن نطاق محدّد. */
  const isShadow = (index: number) => {
    const dl = l[index] - reference.l
    if (dl > -shadowMinDrop || dl < -shadowDrop) return false
    return (
      Math.abs(a[index] - reference.a) <= SHADOW_CHROMA &&
      Math.abs(b[index] - reference.b) <= SHADOW_CHROMA
    )
  }

  const accept = (index: number) => {
    if (mask[index] === 255) return
    mask[index] = 255
    queue[tail++] = index
  }

  /** بذور الحافة: قريبة من لون الخلفية. */
  const seed = (index: number) => {
    if (fromReference(index) <= boundSquared) accept(index)
  }

  for (let x = 0; x < width; x++) {
    seed(x)
    seed((height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    seed(y * width)
    seed(y * width + width - 1)
  }

  /** الجار ينضم لو الخطوة عنه صغيرة، وهو داخل السياج. */
  const grow = (from: number, to: number) => {
    if (mask[to] === 255) return
    const dl = l[to] - l[from]
    const da = a[to] - a[from]
    const db = b[to] - b[from]
    if (dl * dl + da * da + db * db > stepSquared) return
    if (fromReference(to) > boundSquared) return
    accept(to)
  }

  while (head < tail) {
    const index = queue[head++]
    const x = index % width
    const y = (index / width) | 0
    if (x > 0) grow(index, index - 1)
    if (x < width - 1) grow(index, index + 1)
    if (y > 0) grow(index, index - width)
    if (y < height - 1) grow(index, index + width)
  }

  /*
   * مرحلة الظل.
   *
   * الظل والقطعة الغامقة ما ينفصلان بفحص بكسل واحد: كلاهما أغمق من الخلفية
   * بنفس درجة اللون. الفرق الوحيد المعوَّل عليه **مكاني** — هالة الظل شريط
   * رفيع ملاصق للخلفية، والقطعة كتلة عريضة. فنسمح للظل بالانتشار من حدّ
   * الخلفية بعمق محدود بنسبة من أصغر ضلع، وبعدها يتوقف.
   */
  const reach = Math.max(2, Math.round(Math.min(width, height) * shadowReach))
  if (reach > 0) {
    const depth = new Uint8Array(count)
    let shadowHead = 0
    const shadowQueue = new Int32Array(count)
    let shadowTail = 0

    for (let i = 0; i < count; i++) if (mask[i] === 255) shadowQueue[shadowTail++] = i

    while (shadowHead < shadowTail) {
      const index = shadowQueue[shadowHead++]
      const next = depth[index] + 1
      if (next > reach) continue

      const x = index % width
      const y = (index / width) | 0
      const visit = (to: number) => {
        if (mask[to] === 255 || !isShadow(to)) return
        mask[to] = 255
        depth[to] = next
        shadowQueue[shadowTail++] = to
      }
      if (x > 0) visit(index - 1)
      if (x < width - 1) visit(index + 1)
      if (y > 0) visit(index - width)
      if (y < height - 1) visit(index + width)
    }
  }

  let background = 0
  for (let i = 0; i < count; i++) if (mask[i] === 255) background++

  return {
    mask: feather > 0 ? featherMask(mask, width, height, feather) : mask,
    backgroundRatio: background / count,
  }
}

/**
 * يلطّف حدّ القناع بمرشّح صندوقي على محورين.
 * بدونه تطلع الحافة مسنّنة وتبان القطعة مقصوصة بالمقص.
 */
export function featherMask(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number,
): Uint8Array {
  const horizontal = new Uint8Array(mask.length)
  const output = new Uint8Array(mask.length)
  const window = radius * 2 + 1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      for (let k = -radius; k <= radius; k++) {
        const sx = Math.min(width - 1, Math.max(0, x + k))
        sum += mask[y * width + sx]
      }
      horizontal[y * width + x] = sum / window
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      for (let k = -radius; k <= radius; k++) {
        const sy = Math.min(height - 1, Math.max(0, y + k))
        sum += horizontal[sy * width + x]
      }
      output[y * width + x] = sum / window
    }
  }

  return output
}
