/**
 * المزوّد المرفق مع هذي النسخة — بلا خادم وبلا مفاتيح.
 *
 * يركّب اللقطة محليًا من هندسة الموديل ومن مراجع القطع النظيفة، **وصادق في
 * وصف نفسه**: كل نتيجة معلّمة `simulated` ومعها سبب واضح، وأعلام القدرات
 * تقول للواجهة وش ما تعرضه (المبدأ ٤).
 *
 * المزوّد الحقيقي ينفّذ نفس النوع `VirtualTryOnProvider` مقابل Edge Function،
 * وهي المكان الوحيد اللي يعيش فيه مفتاح أي مزوّد ذكاء. ولا مكوّن واجهة يتغيّر.
 */
import { NEUTRAL_SHAPE, TryOnFailure, buildTryOnPrompt } from '@/domain/outfit'
import { modelImageUrl } from '@/infrastructure/rendering'
import { garmentCutout } from '@/infrastructure/rendering/cutout'
import { renderTheme } from '@/theme'
import type { RenderGarment } from '@/infrastructure/rendering'
import type {
  TryOnStageId,
  VirtualTryOnProvider,
  VirtualTryOnRequest,
  VirtualTryOnResult,
} from '@/domain/outfit'

const STAGES: TryOnStageId[] = ['analyze', 'prepare', 'apply', 'compose', 'finalize']

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new TryOnFailure('provider-failure', 'أُلغيت العملية.'))
    })
  })

const isFillableSlot = (slot: string): slot is keyof typeof NEUTRAL_SHAPE =>
  slot === 'top' || slot === 'bottom' || slot === 'shoes'

/** الطبقات اللي تُقصّ فيها صورة القطعة. البقية تبقى على اللون والشكل. */
const PHOTO_SLOTS = new Set(['top', 'bottom', 'full', 'outer'])

/**
 * يجهّز القطع للراسم.
 *
 * القطعة اللي لها صورة حقيقية تُقصّ من خلفيتها وتتحوّل لرابط بيانات، لأن
 * الـSVG ما يقدر يجلب صورة خارجية. لو فشل التجهيز — صورة ما تُقرأ، خلفية مب
 * سادة — ترجع القطعة للتعبئة باللون بدل ما تختفي.
 */
async function toRenderGarments(request: VirtualTryOnRequest): Promise<RenderGarment[]> {
  const fillers: RenderGarment[] = request.neutralFillers.map((filler) => ({
    slot: filler.slot,
    colorHex: filler.colorHex,
    shape: isFillableSlot(filler.slot) ? NEUTRAL_SHAPE[filler.slot] : undefined,
    neutral: true,
  }))

  const selected: RenderGarment[] = await Promise.all(
    request.selectedItems.map(async (garment) => {
      const cutout =
        garment.imageUrl && PHOTO_SLOTS.has(garment.slot)
          ? await garmentCutout(garment.imageUrl)
          : undefined
      return {
        slot: garment.slot,
        shape: garment.shape,
        // لون القطعة من صورتها أدقّ من اللون المستنتج من اسمها عند المتجر
        colorHex: cutout?.tint ?? garment.colorHex,
        imageUrl: cutout?.url,
      }
    }),
  )

  return [...fillers, ...selected]
}

export const localTryOnProvider: VirtualTryOnProvider = {
  id: 'local-composite',
  label: 'معاينة محلية',
  capabilities: {
    savedModel: true,
    // التلبيس على صورة شخصية مع حفظ الملامح يحتاج مزوّدًا في الخادم
    userPhoto: false,
    multiGarment: true,
    identityPreservation: false,
  },

  async generateTryOn(request, onStage, signal): Promise<VirtualTryOnResult> {
    // البرومبت يُبنى حتى هنا عشان يبقى العقد مُختبَرًا من الطرف للطرف
    void buildTryOnPrompt(request)

    for (const stage of STAGES) {
      onStage?.(stage)
      await wait(320 + Math.random() * 220, signal)
    }

    const createdAt = new Date().toISOString()
    const id = `gen_${Date.now().toString(36)}`

    if (request.source === 'photo') {
      if (!request.personImageUrl) {
        throw new TryOnFailure('invalid-image', 'ما وصلتنا صورة صالحة. جرّبي ترفعينها مرة ثانية.')
      }
      // ما نزيّف تركيبًا على الوجه: نرجّع الصورة ونقول وش هذا بالضبط.
      return {
        id,
        resultImageUrl: request.personImageUrl,
        framing: request.framing,
        simulated: true,
        notice:
          'هذي معاينة ترتيب: صورتك مع القطع المختارة جنبها. تركيب الملابس على صورتك نفسها يحتاج مزوّد التوليد في الخادم، وما نبي نطلع لك نتيجة مزيّفة.',
        createdAt,
      }
    }

    if (!request.characteristics) {
      throw new TryOnFailure('provider-failure', 'ما قدرنا نقرأ مواصفات الموديل. جرّبي مرة ثانية.')
    }

    return {
      id,
      resultImageUrl: modelImageUrl({
        characteristics: request.characteristics,
        garments: await toRenderGarments(request),
        framing: request.framing,
        background: renderTheme.background,
      }),
      framing: request.framing,
      simulated: true,
      notice: 'معاينة مركّبة محليًا من مقاسات موديلك وقطع خزانتك.',
      createdAt,
    }
  },
}
