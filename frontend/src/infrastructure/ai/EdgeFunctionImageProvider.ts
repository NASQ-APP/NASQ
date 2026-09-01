/**
 * توليد الصور عبر دالة الحافة — **المتصفح لا يعرف أي مزوّد ولا يملك أي مفتاح**.
 *
 * كان هنا نداء مباشر لـOpenRouter بمفتاح `VITE_`. وأي متغيّر بهذي البادئة
 * يُخبز في حزمة البناء ويقرأه أي زائر يفتح أدوات المطوّر — والمفتاح مربوط
 * برصيد مدفوع، فالكشف يعني استهلاك مال صاحبة المشروع حتى ينفد (§17).
 *
 * الآن النداء يذهب إلى `images-generate`: هي التي تتحقق من الجلسة، ومن ملكية
 * القطع، وتقرأ صورها من التخزين، وتبني التعليمات، وتختار المزوّد.
 *
 * **ونرسل معرّفات القطع لا صورها.** هذا عقد الدالة، وهو الأصحّ: صورة القطعة
 * تعيش عند الخادم أصلًا، فرفعها إليه base64 يرسل ميغابايتات لشيء يملكه —
 * ويطرح على المتصفح سؤالاً ليس سؤاله: «وين صورة هذي القطعة؟». صورة الشخص
 * وحدها تُرسل، لأنها الوحيدة التي لا تعيش عندنا.
 */
import { requireSupabase } from '@/infrastructure/supabase'
import { failure } from '@/domain/tryon'
import type {
  AIImageProvider,
  AdaptModelInput,
  ImageResult,
  OnStage,
  RegenerateLookInput,
  RemoveGarmentInput,
  ReplaceGarmentInput,
  TryOnInput,
  TryOnErrorCode,
} from '@/domain/tryon'

type Operation = 'try-on' | 'regenerate' | 'adapt-model' | 'replace-garment' | 'remove-garment'

/** جسم الطلب كما تقرأه الدالة — الأسماء أسماؤها، بلا طبقة ترجمة. */
type Body = {
  operation: Operation
  personImage?: string
  baseImage?: string
  currentLook?: string
  previousLook?: string
  garmentIds?: string[]
  garmentId?: string
  keepIds?: string[]
  bodyParameters?: unknown
  instruction?: string
  refinement?: string
}

/**
 * رمز الخطأ من الدالة → رمز المجال.
 *
 * الدالة ترجّع رمزًا مفهومًا بالفعل، فنمرّره كما هو متى ما عرفناه. وما لا
 * نعرفه يصير فشل مزوّد — لا نخترع له رسالة أدق مما نملك.
 */
const KNOWN: TryOnErrorCode[] = [
  'not-configured',
  'invalid-key',
  'missing-person',
  'missing-garments',
  'invalid-image',
  'blocked',
  'rate-limited',
  'no-credit',
  'timeout',
  'provider-failure',
]

function toFailure(error: unknown): never {
  const raw = error as { context?: { code?: string }; message?: string } | null
  const code = raw?.context?.code ?? raw?.message ?? ''
  const known = KNOWN.find((candidate) => code.includes(candidate))
  throw failure(known ?? 'provider-failure')
}

async function call(body: Body, onStage?: OnStage): Promise<ImageResult> {
  const db = requireSupabase()

  onStage?.('compose')
  const { data, error } = await db.functions.invoke('images-generate', { body })
  if (error) toFailure(error)

  const result = data as { image?: string; createdAt?: string } | null
  if (!result?.image) throw failure('provider-failure')

  onStage?.('finalize')
  return { image: result.image, createdAt: result.createdAt ?? new Date().toISOString() }
}

export const edgeFunctionImageProvider: AIImageProvider = {
  id: 'images-generate',

  async generateTryOn(input: TryOnInput, onStage?: OnStage) {
    if (!input.personImage) throw failure('missing-person')
    if (input.garments.length === 0) throw failure('missing-garments')

    onStage?.('model')
    onStage?.('garments')
    return call(
      {
        operation: 'try-on',
        personImage: input.personImage,
        garmentIds: input.garments.map((garment) => garment.id),
        bodyParameters: input.bodyParameters,
        instruction: input.instruction,
      },
      onStage,
    )
  },

  async regenerateLook(input: RegenerateLookInput, onStage?: OnStage) {
    if (!input.personImage) throw failure('missing-person')
    if (input.garments.length === 0) throw failure('missing-garments')

    return call(
      {
        operation: 'regenerate',
        personImage: input.personImage,
        garmentIds: input.garments.map((garment) => garment.id),
        previousLook: input.previousLook,
        bodyParameters: input.bodyParameters,
        instruction: input.instruction,
      },
      onStage,
    )
  },

  async adaptModel(input: AdaptModelInput, onStage?: OnStage) {
    onStage?.('model')
    return call(
      {
        operation: 'adapt-model',
        baseImage: input.baseImage,
        bodyParameters: input.bodyParameters,
        refinement: input.refinement,
      },
      onStage,
    )
  },

  async replaceGarment(input: ReplaceGarmentInput, onStage?: OnStage) {
    return call(
      {
        operation: 'replace-garment',
        currentLook: input.currentLook,
        garmentId: input.garment.id,
        keepIds: input.keep.map((garment) => garment.id),
      },
      onStage,
    )
  },

  async removeGarment(input: RemoveGarmentInput, onStage?: OnStage) {
    return call(
      {
        operation: 'remove-garment',
        currentLook: input.currentLook,
        garmentId: input.garment.id,
        keepIds: input.keep.map((garment) => garment.id),
      },
      onStage,
    )
  },
}
