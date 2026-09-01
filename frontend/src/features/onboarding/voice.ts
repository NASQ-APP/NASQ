/**
 * صيغة المخاطبة في الواجهة.
 *
 * التطبيق كُتب كلّه بصيغة المؤنث. وهذا صحيح لأغلب من يستعمله، وخاطئ لمن ليس
 * منهم: من صرّح أنه ذكر يُخاطَب بصيغة ليست صيغته في كل شاشة يفتحها.
 *
 * فالنصّ يُكتب مرتين ويُختار عند العرض:
 *
 *     const say = useVoice()
 *     <Button>{say('احفظي', 'احفظ')}</Button>
 *
 * **الجنس يُقرأ من ذوقها المُصرَّح لا من الحساب**: هو أول سؤال في التعارف،
 * ويُحفظ مع بقيّة الملف. والحساب لا يحمله — إنشاؤه لا يسأل عنه.
 *
 * والمؤنث افتراضي عند جهل الجنس: من أنشأ حسابه قبل هذا السؤال لا جواب له، وترك
 * ما كان يقرؤه أهدأ من تحويله فجأة إلى صيغة أخرى.
 *
 * وما يُترجَم هنا **الخطاب وحده**. أسماء الأشياء («خزانة»، «إطلالة») لا تتغيّر
 * بتغيّر قارئها، فتبقى نصًّا واحدًا.
 */
import { useCallback } from 'react'
import { forGender } from '@/domain/shared'
import { useOnboarding } from './store'

export type Say = (feminine: string, masculine: string) => string

export function useVoice(): Say {
  const gender = useOnboarding((state) => state.declared.gender)

  // ثابتة ما دام الجنس ثابتًا، فما تكسر ذاكرة المكوّنات التي تستقبلها
  return useCallback(
    (feminine: string, masculine: string) => forGender(gender, feminine, masculine),
    [gender],
  )
}
