/**
 * عميل Supabase للمتصفّح.
 *
 * بمفتاح `anon` وحده — مصمَّم ليُنشر مع الواجهة، والحماية على القاعدة نفسها
 * بـ RLS: كل جدول يسمح للمستخدمة بصفوفها فقط. مفتاح `service_role` ومفاتيح
 * مزوّدي الذكاء ما تنزل هنا أبدًا؛ مكانها بيئة Edge Functions (§17).
 *
 * العميل **قد لا يوجد**: لو ما انضبطت متغيّرات البيئة يرجّع `null` بدل ما
 * يرمي عند التحميل. الاستدعاء يفحص `requireSupabase()` فيعطي خطأ مفهومًا في
 * مكانه بدل شاشة بيضاء عند الإقلاع.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, hasBackend } from '@/shared/config'
import type { Database } from './database.types'

export type Db = SupabaseClient<Database>

export const supabase: Db | null = hasBackend()
  ? createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        // الجلسة تبقى بعد إغلاق التبويب، وتتجدّد وحدها قبل انتهائها
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

/** يرجّع العميل أو يرمي برسالة تقول السبب — تُلتقط وتُترجم عند حدود الواجهة. */
export function requireSupabase(): Db {
  if (!supabase) {
    throw new Error('supabase-not-configured')
  }
  return supabase
}
