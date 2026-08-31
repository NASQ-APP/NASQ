/**
 * تفضيلات المستخدمة على الخادم — صفّها في `profiles`.
 *
 * ما يعيش هنا **صفة لها** لا كيان مستقل: ذوقها المصرَّح في التعارف، ومدينتها،
 * وجنس التشكيلة التي تُعرض لها. كلها إجابة عن «مَن أنتِ» فتسكن مع اسمها بدل
 * جدول لكل واحدة.
 *
 * وما لا يعيش هنا: حالة الشاشة (أي لوحة مفتوحة، أي قطعة مختارة). تلك **خيار
 * جهاز** — رفعها للخادم يعني أن تفتحي حاسبك فتقفز لك لوحة فتحتِها على جوالك.
 */
import { requireSupabase } from '@/infrastructure/supabase'
import type { DeclaredStyle } from '@/domain/style/types'
import type { Json } from '@/infrastructure/supabase'
import type { Gender } from '@/domain/shared/types'

export type ProfilePreferences = {
  declared?: DeclaredStyle
  city?: string
  gender?: Gender
}

async function currentUserId(): Promise<string> {
  const db = requireSupabase()
  const { data, error } = await db.auth.getUser()
  if (error || !data.user) throw new Error('no-session')
  return data.user.id
}

/**
 * تفضيلات المستخدمة كما حفظتها.
 *
 * `declared` تُقرأ كما كُتبت بلا تحقّق من شكلها: هي بيانات كتبها التطبيق نفسه
 * لا مدخل خارجي، والمجال يتحمّل الحقول الناقصة بقيمه الافتراضية.
 */
export async function fetchPreferences(): Promise<ProfilePreferences> {
  const db = requireSupabase()
  const { data, error } = await db
    .from('profiles')
    .select('declared_style, city, gender')
    .maybeSingle()
  if (error) throw error
  if (!data) return {}

  const declared = data.declared_style
  return {
    declared:
      declared && typeof declared === 'object' && !Array.isArray(declared)
        ? (declared as unknown as DeclaredStyle)
        : undefined,
    city: data.city ?? undefined,
    gender: data.gender as Gender,
  }
}

export async function saveDeclaredStyle(declared: DeclaredStyle): Promise<void> {
  const db = requireSupabase()
  const userId = await currentUserId()
  const { error } = await db
    .from('profiles')
    .update({
      // الذوق بنية من قيم بسيطة ومصفوفات، فينطبق على `Json` — لكن
      // المترجم ما يرى ذلك من نوع المجال، فنقوله صراحةً مرة واحدة هنا.
      declared_style: declared as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
  if (error) throw error
}

export async function saveCity(city: string): Promise<void> {
  const db = requireSupabase()
  const userId = await currentUserId()
  const { error } = await db
    .from('profiles')
    .update({ city, updated_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) throw error
}
