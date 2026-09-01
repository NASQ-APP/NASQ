/**
 * POST /images-generate
 *
 * توليد صور التجربة الافتراضية — **المكان الوحيد اللي يعرف المزوّدين ويملك
 * مفاتيحهم** (§17). المفاتيح في بيئة الدالة وما تنزل الفرونت-إند أبدًا:
 * متغيّر بالبادئة `VITE_` يُخبز في حزمة البناء ويقرأه أي زائر، والمفاتيح
 * مربوطة برصيد مدفوع فالكشف يعني استهلاك مال.
 *
 * **الواجهة ترسل معرّفات القطع، لا صورها ولا أوصافها.**
 *
 * كانت ترسل الصور مضمّنة، فصار على المتصفّح أن يجاوب سؤالاً ليس سؤاله: «وين
 * صورة هذي القطعة؟» — في تخزينه؟ في السلّة؟ عند المتجر؟ وكل جواب له عقباته:
 * البلوبات هاجرت للسلّة وبقيت القراءة تسأل التخزين القديم فصار كل شيء يُعرض
 * ولا شيء يُلبَس، وصور المتاجر لا يقدر المتصفّح يقرأ بكسلاتها أصلاً.
 *
 * والجواب هنا واحد لأن المصدر واحد: صفّ القطعة. منه الوصف، ومنه مسار صورتها.
 * فلا يختلف ما يصف النصُّ عمّا تُظهره الصورة، ولا تسافر ميغابايتات base64 من
 * المتصفح لشيء يملكه الخادم أصلاً.
 *
 * ويبقى **الشخص** من العميل: صورة المستخدمة قرار قديم ألا يكون لها سلّة —
 * تعيش في ذاكرة جلستها وحدها، والموديل الجاهز ملف مشحون مع التطبيق.
 *
 * ومَن يولّد فعلاً يقرّره `_shared/imageProviders` — Fal ثم Gemini احتياطًا،
 * بالتتابع ومحاولة واحدة لكل واحد. هذا الملف يبقى جاهلاً بهم.
 */
import { handlePreflight } from '../_shared/cors.ts'
import { HandledError, fail, ok } from '../_shared/response.ts'
import { optionalEnv } from '../_shared/env.ts'
import { readJson, requireUser, serviceClient } from '../_shared/supabase.ts'
import { withinRateLimit } from '../_shared/rateLimit.ts'
import { generateImage, providersForOperation } from '../_shared/imageProviders/index.ts'
import { encodeBase64 } from '../_shared/imageProviders/types.ts'
import {
  buildAdaptModelPrompt,
  buildRegeneratePrompt,
  buildRemoveGarmentPrompt,
  buildReplaceGarmentPrompt,
  buildTryOnPrompt,
  type BodyParameters,
  alignGarments,
  buildTryOnReferences,
  type GarmentReference,
} from '../_shared/tryonPrompts.ts'

/**
 * مهلة سخيّة: توليد الصور أبطأ من النص بكثير.
 *
 * تحت سقف تشغيل الدالة (١٥٠ ثانية) بهامش يكفي لبناء الرد — فالمهلة تنتهي
 * عندنا برسالة مفهومة بدل ما يُقطع الاتصال بلا تفسير.
 */
const TIMEOUT_MS = 120_000

/** كل عملية لها سقفها: التوليد أغلى من النص، والحد يحمي الرصيد من زر مضغوط. */
const MAX_PER_MINUTE = Number(optionalEnv('GENERATE_PER_MINUTE', '10'))

/** أكثر من هذا يعني طلبًا مصنوعًا بيد لا إطلالة حقيقية. */
const MAX_IMAGES = 8

/** سقف الصورة الواحدة بعد base64 — الواجهة تصغّرها لـ١٠٢٤px قبل الإرسال. */
const MAX_IMAGE_CHARS = 8 * 1024 * 1024

const BUCKET = 'items'

type Body = {
  operation?: string
  /** صورة الشخص — من العميل، فهي وحدها التي لا تعيش عندنا */
  personImage?: unknown
  baseImage?: unknown
  currentLook?: unknown
  previousLook?: unknown
  /** معرّفات القطع بترتيب التلبيس */
  garmentIds?: unknown
  /** القطعة المفردة في الاستبدال والإزالة */
  garmentId?: unknown
  /** ما يجب ألا يتغيّر */
  keepIds?: unknown
  bodyParameters?: unknown
  instruction?: unknown
  /** خاص بـadapt-model: «خصر أضيق شوي» — تُضاف لتعليمات التعديل */
  refinement?: unknown
}

/** صفّ القطعة كما نحتاجه: وصفها، ومن أين تُقرأ صورتها. */
type ItemRow = {
  id: string
  name: string | null
  category_id: string
  color_name: string | null
  photo_path: string | null
  image_url: string | null
  /** مضمّنة من جدول الفئات — هي مصدر الموضع والاسم الإنجليزي */
  categories: { slot: string; name_latin: string | null } | null
}

/**
 * صفّ الاستعلام كما تصفه أنواع Supabase المولّدة.
 *
 * `items.category_id → categories.id` علاقة **كثير-إلى-واحد**، فPostgREST
 * يرجّع كائنًا واحدًا للفئة. لكن مولّد الأنواع يصف كل تضمين مصفوفةً لأنه لا
 * يميّز الاتجاه، فينشأ تعارض بين ما يقوله النوع وما يصل فعلاً.
 *
 * كان الحل تحويلاً قسريًا (`as ItemRow[]`) يُسكِت المصرّف ولا يفحص حقلاً واحدًا.
 * فلو تغيّر الاستعلام — حقل يُحذف أو يُعاد تسميته — يمرّ الخطأ صامتًا ويظهر
 * وقت التشغيل. هنا يُفحص كل حقل باسمه.
 */
type ItemQueryRow = Omit<ItemRow, 'categories'> & {
  categories: ItemRow['categories'] | NonNullable<ItemRow['categories']>[]
}

/** يوحّد شكل الفئة: الكائن كما يصل، والمصفوفة — لو وصفها النوع — أول عنصر. */
const toItemRow = (row: ItemQueryRow): ItemRow => ({
  id: row.id,
  name: row.name,
  category_id: row.category_id,
  color_name: row.color_name,
  photo_path: row.photo_path,
  image_url: row.image_url,
  categories: Array.isArray(row.categories) ? (row.categories[0] ?? null) : row.categories,
})

/**
 * الموضع كعبارة لا ككلمة.
 *
 * `full` وحدها لا تقول شيئًا للنموذج، و«on the body» أسوأ: تُفهَم قطعةً سفليّة
 * فيصير الفستان تنورة. الجملة الكاملة تحسم المقصود.
 */
const WORN_ON: Record<string, string> = {
  top: 'upper body',
  bottom: 'lower body',
  full: 'full body — this is a one-piece garment covering torso and legs together, not a separate top or skirt',
  outer: 'upper body, layered over the other garments',
  shoes: 'feet',
  bag: 'carried in hand or on the shoulder',
  accessory: 'as an accessory',
}

/* ------------------------------ تحقّق ------------------------------ */

/** صورة صالحة = نص `data:` أو `https:`. أي شي غيره ما يُمرَّر للمزوّد. */
function image(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new HandledError('invalid-image', 'ما وصلتنا إحدى الصور.', 400)
  }
  if (!/^(data:image\/|https:\/\/)/.test(value)) {
    throw new HandledError('invalid-image', 'صيغة الصورة غير مدعومة.', 415)
  }
  if (value.length > MAX_IMAGE_CHARS) {
    throw new HandledError('invalid-image', 'حجم الصورة كبير.', 413)
  }
  return value
}

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined

/** قائمة معرّفات — بلا تكرار وبحدّ، والترتيب يُحفظ لأنه ترتيب التلبيس. */
function ids(value: unknown, required: boolean): string[] {
  if (!Array.isArray(value)) {
    if (required) throw new HandledError('missing-garments', 'ما وصلتنا قطع.', 400)
    return []
  }
  const out: string[] = []
  for (const entry of value) {
    const id = text(entry)
    if (id && !out.includes(id)) out.push(id)
  }
  if (required && out.length === 0) {
    throw new HandledError('missing-garments', 'ما وصلتنا قطع.', 400)
  }
  return out
}

/** القياسات أرقام موجبة معقولة — القيمة الشاذة تُسقَط بدل ما تشوّه النص. */
function bodyParameters(value: unknown): BodyParameters | undefined {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Record<string, unknown>
  const keys: (keyof BodyParameters)[] = [
    'heightCm', 'weightKg', 'chestCm', 'waistCm', 'hipsCm', 'shoulderWidthCm', 'inseamCm',
  ]

  const result: BodyParameters = {}
  for (const key of keys) {
    const number = raw[key]
    if (typeof number === 'number' && Number.isFinite(number) && number > 0 && number < 400) {
      result[key] = number
    }
  }
  return Object.keys(result).length > 0 ? result : undefined
}

/** طلب المستخدمة الحر — يُقصّ فما يبتلع البرومبت ولا يعيد توجيه النموذج. */
const instruction = (value: unknown): string | undefined => text(value)?.slice(0, 400)

/* --------------------------- قراءة القطع --------------------------- */

/**
 * صفوف القطع المطلوبة — **مقيّدة بمالكتها**.
 *
 * العميل بمفتاح الخدمة يتجاوز RLS، فبلا شرط `user_id` يصير تمرير معرّف قطعة
 * غريبة كافيًا لقراءة صورتها. والشرط هنا هو الحارس كله.
 *
 * وأي معرّف لا يقابله صفّ يُرفض الطلب من أجله بدل أن يُتجاهَل بصمت: المستخدمة
 * اختارت قطعة، وإطلالة ناقصة قطعةً ليست ما طلبته.
 */
async function fetchItems(userId: string, wanted: string[]): Promise<ItemRow[]> {
  if (wanted.length === 0) return []

  /*
    الفئة تُضمَّن لا تُشتقّ من المُعرِّف.

    `category_id` نصّ مثل `women-dresses`، وقصّ بادئته يعطي اسمًا مقبولاً لكنه
    لا يعطي **الموضع** — وهو ما يحسم أن الفستان قطعة واحدة لا تنورة. والموضع
    في جدول الفئات، فنقرؤه من مالكه.
  */
  const { data, error } = await serviceClient()
    .from('items')
    .select('id, name, category_id, color_name, photo_path, image_url, categories(slot, name_latin)')
    .eq('user_id', userId)
    .in('id', wanted)

  if (error) {
    console.error('items read failed')
    throw new HandledError('provider-failure', 'ما قدرنا نقرأ قطعك.', 502)
  }

  const rows = (data ?? []).map(toItemRow)
  const byId = new Map(rows.map((row) => [row.id, row]))

  // الترتيب ترتيب الطلب لا ترتيب القاعدة: البرومبت يرقّم القطع بالتسلسل
  return wanted.map((id) => {
    const row = byId.get(id)
    if (!row) throw new HandledError('not-found', 'ما لقينا إحدى القطع في خزانتك.', 404)
    return row
  })
}

/** الوصف الذي يدخل النص — من الصفّ نفسه، فلا يختلف عمّا في الخزانة. */
const toReference = (row: ItemRow): GarmentReference => ({
  id: row.id,
  // الاسم الإنجليزي من جدول الفئات، وقصّ البادئة احتياطٌ لو غابت الفئة
  category: (row.categories?.name_latin ?? row.category_id.replace(/^(women|men)-/, '')).toLowerCase(),
  slot: WORN_ON[row.categories?.slot ?? ''] ?? 'body',
  name: row.name ?? '',
  colorName: row.color_name ?? '',
})

/**
 * صورة القطعة كـ`data:` URL.
 *
 * المحفوظة في سلّتنا أولًا — هي ما تملكه المستخدمة فعلاً. وإن لم تكن (قطعة
 * مستوردة لم تُنسخ صورتها بعد) فرابط المتجر يُمرَّر كما هو: Fal يسحبه بنفسه،
 * وهذا أضعف لكنه أفضل من قطعة بلا صورة.
 */
async function resolveImage(row: ItemRow): Promise<string | undefined> {
  if (row.photo_path) {
    const { data, error } = await serviceClient().storage.from(BUCKET).download(row.photo_path)
    if (!error && data) {
      const bytes = new Uint8Array(await data.arrayBuffer())
      const type = data.type || 'image/jpeg'
      return `data:${type};base64,${encodeBase64(bytes)}`
    }
    console.error('item photo download failed', { item: row.id })
  }

  return row.image_url?.startsWith('https://') ? row.image_url : undefined
}

/* ------------------------- بناء الطلب لكل عملية ------------------------- */

type Plan = { images: string[]; prompt: string }

/** ترتيب الصور يطابق ترقيم البرومبت — الاثنان يُبنيان معًا فما يتفرّقان. */
async function plan(userId: string, body: Body): Promise<Plan> {
  switch (body.operation) {
    case 'try-on':
    case 'regenerate': {
      const person = image(body.personImage)
      const rows = await fetchItems(userId, ids(body.garmentIds, true))

      /*
        القطعة وصورتها **زوجٌ واحد لا قائمتان متوازيتان**.

        كان الوصف يُبنى من كل الصفوف والصور تُصفّى وحدها، فقطعة تعذّرت صورتها
        تسقط من الصور وتبقى في النص. والنص يرقّم بالموضع («٢. jeans — reference
        image 3»)، فينزاح الرقم ويشير لصورة قطعة أخرى: يلبس النموذج القطعة
        الغلط، أو يخترع من الاسم قطعةً لا صورة لها.

        الربط قبل التصفية يجعل الانزياح مستحيلاً بالبنية، لا بانضباط من يعدّل
        السطرين معًا.
      */
      const resolved = await Promise.all(
        rows.map(async (row) => ({ garment: toReference(row), image: await resolveImage(row) })),
      )

      const aligned = alignGarments(resolved)
      if (!aligned) {
        throw new HandledError(
          'missing-garments',
          'تعذّر استخدام صورة إحدى القطع. جرّبي تحديث القطعة أو اختيار قطعة ثانية.',
          422,
        )
      }

      const garments = aligned.map((entry) => entry.garment)
      const previous = body.previousLook == null ? undefined : image(body.previousLook)
      const images = buildTryOnReferences(person, aligned, previous)

      return body.operation === 'try-on'
        ? {
            images,
            prompt: buildTryOnPrompt(
              garments,
              bodyParameters(body.bodyParameters),
              instruction(body.instruction),
            ),
          }
        : {
            images,
            prompt: buildRegeneratePrompt(
              garments,
              Boolean(previous),
              bodyParameters(body.bodyParameters),
              instruction(body.instruction),
            ),
          }
    }

    case 'adapt-model': {
      const base = image(body.baseImage)
      return {
        images: [base],
        prompt: buildAdaptModelPrompt(
          bodyParameters(body.bodyParameters) ?? {},
          instruction(body.refinement),
        ),
      }
    }

    case 'replace-garment': {
      const look = image(body.currentLook)
      const id = text(body.garmentId)
      if (!id) throw new HandledError('missing-garments', 'ما وصلتنا القطعة البديلة.', 400)

      const [incoming] = await fetchItems(userId, [id])
      const picture = await resolveImage(incoming)
      if (!picture) throw new HandledError('missing-garments', 'القطعة ما لها صورة.', 422)

      const keep = (await fetchItems(userId, ids(body.keepIds, false))).map(toReference)

      // الإطلالة الحالية أولًا ثم القطعة الجديدة — البرومبت يشير إليهما بالرقم
      return {
        images: [look, picture],
        prompt: buildReplaceGarmentPrompt(toReference(incoming), keep),
      }
    }

    case 'remove-garment': {
      const look = image(body.currentLook)
      const id = text(body.garmentId)
      if (!id) throw new HandledError('missing-garments', 'ما وصلتنا القطعة.', 400)

      const [going] = await fetchItems(userId, [id])
      const keep = (await fetchItems(userId, ids(body.keepIds, false))).map(toReference)

      // الإزالة تُقال بالاسم ولا تحتاج صورة القطعة: هي أصلاً داخل الإطلالة
      return {
        images: [look],
        prompt: buildRemoveGarmentPrompt(toReference(going), keep),
      }
    }

    default:
      throw new HandledError('invalid-request', 'عملية غير معروفة.', 400)
  }
}

Deno.serve(async (request) => {
  const preflight = handlePreflight(request)
  if (preflight) return preflight

  try {
    if (request.method !== 'POST') {
      throw new HandledError('method-not-allowed', 'الطلب غير مدعوم.', 405)
    }

    const user = await requireUser(request)

    if (!withinRateLimit('generate:' + user.id, MAX_PER_MINUTE)) {
      throw new HandledError('rate-limited', 'طلبات كثيرة بوقت قصير.', 429)
    }

    /*
      الجسم يُرفع لمتغيّر لأن `operation` تلزم مرتين: مرة لبناء البرومبت والصور،
      ومرة لاختيار المزوّدين. كانت تُستهلك داخل `plan` وتُرمى، فيصل التوليد بلا
      علم بالعملية التي يخدمها — وهذا سبب مرور الاستوديو على مزوّد ممنوع منه.
    */
    const body = await readJson<Body>(request)
    const { images, prompt } = await plan(user.id, body)
    if (images.length > MAX_IMAGES) {
      throw new HandledError('invalid-request', 'عدد الصور أكثر من اللازم.', 413)
    }

    /*
      المهلة تحكم المحاولتين معًا لا كل واحدة على حدة.

      مهلة لكل مزوّد تعني في الأسوأ ضِعف الانتظار، فيُقطع الاتصال من فوق قبل
      ما نرجّع خطأً مفهومًا — والمستخدمة تشوف شاشة معلّقة بلا سبب.
    */
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const result = await generateImage(
        { prompt, images, signal: controller.signal },
        providersForOperation(body.operation),
      )
      return ok({ image: result.image, createdAt: new Date().toISOString() }, request)
    } catch (error) {
      if (controller.signal.aborted) {
        throw new HandledError('timeout', 'أخذت وقتًا أطول من المتوقع.', 504)
      }
      throw error
    } finally {
      clearTimeout(timer)
    }
  } catch (error) {
    return fail(error, request)
  }
})
