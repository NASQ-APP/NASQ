/**
 * تركيب طلب جاهز للمزوّد: القطع ← زاوية الكاميرا ← الإكمال المحايد.
 * منطق نقي — ينفع يشتغل في المتصفح وفي الخادم بنفس النتيجة.
 */
import { chooseFraming } from './framing'
import { neutralCompletion, toGarment } from './completion'
import { TryOnFailure } from './errors'
import type { AiModel } from '@/domain/model/types'
import type { Gender, WardrobeItem } from '@/domain/wardrobe/types'
import type { TryOnGarment, TryOnSource, VirtualTryOnRequest } from './types'

export type BuildRequestInput = {
  items: WardrobeItem[]
  source: TryOnSource
  model?: AiModel
  personImageUrl?: string
  gender: Gender
}

export function buildTryOnRequest(input: BuildRequestInput): VirtualTryOnRequest {
  const garments: TryOnGarment[] = input.items.map(toGarment)
  const { framing } = chooseFraming(garments)

  if (input.source === 'model' && !input.model) {
    throw new TryOnFailure('provider-failure', 'ما فيه موديل محفوظ. أنشئي موديلك أول.')
  }
  if (input.source === 'photo' && !input.personImageUrl) {
    throw new TryOnFailure('invalid-image', 'ارفعي صورتك أول.')
  }

  return {
    source: input.source,
    personImageUrl: input.personImageUrl,
    modelId: input.model?.id,
    modelSeed: input.model?.seed,
    characteristics: input.model?.characteristics,
    selectedItems: garments,
    neutralFillers: neutralCompletion(garments, framing),
    gender: input.gender,
    framing,
    preserveIdentity: true,
  }
}
