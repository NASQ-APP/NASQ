/**
 * عقود التجربة الافتراضية.
 *
 * التطبيق يتكلم مع `VirtualTryOnProvider` فقط — ما يلمس SDK أي مزوّد — فيصير
 * تبديل المزوّد بمتغيّر بيئة واحد وبدون تعديل أي مكوّن واجهة (A-01).
 */
import type { BodySlot, GarmentShape, Gender } from '@/domain/wardrobe/types'
import type { ModelCharacteristics } from '@/domain/model/types'

/** على وش نلبّس: موديل محفوظ، أو صورة المستخدمة الشخصية. */
export type TryOnSource = 'model' | 'photo'

/** قصّة الكاميرا — تُشتق من مواضع القطع المختارة (A-03). */
export type Framing = 'full' | 'upper' | 'lower' | 'detail'

export type TryOnGarment = {
  itemId: string
  categoryId: string
  slot: BodySlot
  colorHex: string
  shape: GarmentShape
  name: string
  /**
   * صورة القطعة الحقيقية عند المتجر، لو وُجدت.
   * وجودها يعني إن التلبيس يعرض القماش نفسه بدل شكل مملوء باللون.
   */
  imageUrl?: string
}

/**
 * قطعة محايدة يضيفها النظام عشان القطعة الواحدة ما تُعرض على جسم نصف عارٍ.
 * ما هي أبدًا من قطع المستخدمة، ويُصرّح بذلك في الواجهة (A-02).
 */
export type NeutralFiller = {
  slot: BodySlot
  colorHex: string
  reason: string
}

export type VirtualTryOnRequest = {
  source: TryOnSource
  /** رابط الصورة عند المصدر `photo` */
  personImageUrl?: string
  /** الهوية المقفولة عند المصدر `model` */
  modelId?: string
  modelSeed?: number
  characteristics?: ModelCharacteristics

  selectedItems: TryOnGarment[]
  neutralFillers: NeutralFiller[]

  gender: Gender
  framing: Framing
  preserveIdentity: boolean
}

/** رموز الخطأ السبعة (A-05) — كل واحد له رسالة وسبب وتلميح. */
export type TryOnErrorCode =
  | 'invalid-image'
  | 'poor-source-image'
  | 'unsupported-item'
  | 'provider-timeout'
  | 'provider-failure'
  | 'limit-reached'
  | 'not-supported-by-provider'

export type TryOnError = {
  code: TryOnErrorCode
  /** رسالة بلغة بشر — الخطأ الخام ما يوصل الواجهة أبدًا */
  message: string
  hint?: string
}

export type VirtualTryOnResult = {
  id: string
  resultImageUrl: string
  framing: Framing
  /** true = تركيب محلي مو صورة مولّدة. ما نزيّف نتيجة (المبدأ ٤). */
  simulated: boolean
  /** وش سوّى المزوّد فعلاً — يُعرض ولا يُخفى */
  notice?: string
  createdAt: string
}

/** حالات التوليد السبع — تُقرأ من `render_jobs` عبر Realtime عند ربط الخادم. */
export type TryOnStatus =
  | 'idle'
  | 'uploading'
  | 'validating'
  | 'processing'
  | 'generating'
  | 'completed'
  | 'failed'

/** المراحل الخمس المعلنة في الاستوديو (S-03). */
export type TryOnStageId = 'analyze' | 'prepare' | 'apply' | 'compose' | 'finalize'

export type VirtualTryOnProvider = {
  readonly id: string
  readonly label: string
  /** أعلام القدرات — الواجهة ما تعرض ميزة المزوّد ما يقدر عليها */
  readonly capabilities: {
    savedModel: boolean
    userPhoto: boolean
    multiGarment: boolean
    identityPreservation: boolean
  }
  generateTryOn(
    request: VirtualTryOnRequest,
    onStage?: (stage: TryOnStageId) => void,
    signal?: AbortSignal,
  ): Promise<VirtualTryOnResult>
}

/** إطلالة محفوظة: الصورة المولّدة مع معرّفات القطع اللي صنعتها فعليًا (S-06). */
export type SavedLook = {
  id: string
  number: number
  name: string
  occasion: string
  resultImageUrl: string
  source: TryOnSource
  modelId?: string
  itemIds: string[]
  framing: Framing
  simulated: boolean
  notes?: string
  createdAt: string
}
