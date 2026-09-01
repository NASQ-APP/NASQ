/**
 * التحقق من رد الوكيل — خط الدفاع الأخير.
 *
 * الخادم يرسل للنموذج قائمة مغلقة أصلًا، لكننا **ما نثق بالمخرَج**: النموذج
 * يقدر يخترع معرّفًا، أو يعيد قطعة استُبعدت، أو يرجّع شكلًا غير متوقّع. كل
 * ذلك يُسقَط هنا قبل ما يوصل الشاشة.
 *
 * القاعدة: ما يُعرض على المستخدمة إلا معرّف **موجود في خزانتها** و**لا يخالف
 * قيودها**. وإذا ما بقي شي بعد التصفية، نقول إن الرد غير صالح ونرجع للقواعد
 * المحلية بدل ما نعرض إطلالة فاضية.
 */
import { violatesAvoid } from '@/domain/style/constraints'
import { CONTEXTUAL_NEEDS } from './types'
import type { AgentAnswer, AgentLook, ContextualNeed, RawAgentAnswer } from './types'
import type { AvoidRule } from '@/domain/style/types'
import type { WardrobeItem } from '@/domain/wardrobe'

const text = (value: unknown, max = 400): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''

/** المعرّفات المسموح بها: موجودة في الخزانة، وما تخالف القيود. */
export function allowedIds(items: WardrobeItem[], avoid: AvoidRule[]): Set<string> {
  return new Set(items.filter((item) => !violatesAvoid(item, avoid)).map((item) => item.id))
}

/** يُبقي المعرّفات المعروفة فقط، بترتيبها، بلا تكرار. */
const keepKnown = (value: unknown, allowed: Set<string>): string[] => {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const kept: string[] = []
  for (const entry of value) {
    if (typeof entry !== 'string') continue
    if (!allowed.has(entry) || seen.has(entry)) continue
    seen.add(entry)
    kept.push(entry)
  }
  return kept
}

const toLook = (value: unknown, allowed: Set<string>, index: number): AgentLook | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Record<string, unknown>
  const itemIds = keepKnown(raw.itemIds, allowed)
  // إطلالة بقطعة واحدة مب إطلالة — والفاضية أثر معرّفات مخترعة
  if (itemIds.length < 2) return undefined
  return {
    title: text(raw.title, 40) || `LOOK ${String(index + 1).padStart(2, '0')}`,
    reason: text(raw.reason),
    itemIds,
  }
}

const toNeed = (value: unknown): ContextualNeed | undefined =>
  CONTEXTUAL_NEEDS.includes(value as ContextualNeed) ? (value as ContextualNeed) : undefined

/**
 * يحوّل ردًّا خامًا إلى رد موثوق، أو `undefined` لو ما بقي فيه شي مفيد.
 *
 * `undefined` إشارة صريحة للمستدعي: **استعمل القواعد المحلية**.
 */
export function validateAgentAnswer(
  raw: RawAgentAnswer | undefined,
  items: WardrobeItem[],
  avoid: AvoidRule[],
  /** أسئلة سبق أن جاوبت عليها في هذا الخيط — ما نكرّرها */
  answeredNeeds: ContextualNeed[] = [],
): AgentAnswer | undefined {
  if (!raw || typeof raw !== 'object') return undefined

  const allowed = allowedIds(items, avoid)
  const looks = Array.isArray(raw.looks)
    ? raw.looks
        .map((look, index) => toLook(look, allowed, index))
        .filter((look): look is AgentLook => Boolean(look))
    : []
  const pieces = keepKnown(raw.pieces, allowed)

  const asked = toNeed(raw.need)
  const need = asked && !answeredNeeds.includes(asked) ? asked : undefined

  const message = text(raw.message)
  const gap = text(raw.gap) || undefined

  /* رد بلا إطلالة ولا قطعة ولا سؤال ولا فجوة ما يفيد المستخدمة بشيء. */
  if (looks.length === 0 && pieces.length === 0 && !need && !gap) return undefined
  if (!message && !need) return undefined

  return { message, looks, pieces, gap, need, source: 'agent' }
}
