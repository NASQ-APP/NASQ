/**
 * المزوّد المحلي — قواعد، ويقول ذلك عن نفسه.
 *
 * ما فيه نموذج ولا خادم: `suggest()` نفسها التي تعمل منذ البداية. نعلّم الرد
 * بـ`source: 'local'` فتعرض الواجهة «رد محلي» بدل ما تدّعي ذكاءً.
 */
import { suggest } from '@/features/stylist/suggest'
import type { AgentAnswer } from '@/domain/stylist/types'
import type { StylistProvider, StylistRequest } from './types'

export const answerLocally = ({
  question,
  wardrobe,
  selectedIds,
  style,
}: StylistRequest): AgentAnswer => {
  const answer = suggest(question, wardrobe, selectedIds, style)
  return { ...answer, source: 'local' }
}

export const localStylist: StylistProvider = {
  id: 'local-rules',
  answer: (request) => Promise.resolve(answerLocally(request)),
}
