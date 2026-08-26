import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SERVICE_ROLE_KEY, SUPABASE_URL } from './env.ts'
import { HandledError } from './response.ts'

/**
 * عميل بمفتاح الخدمة — يتجاوز RLS، فيُستعمل **بعد** التحقق من هوية المستخدمة
 * وحصر كل استعلام بمعرّفها. لا يُمرَّر للعميل بأي شكل.
 */
export const serviceClient = (): SupabaseClient =>
  createClient(SUPABASE_URL(), SERVICE_ROLE_KEY(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })

/** يستخرج المستخدمة من رمز الجلسة في رأس authorization. */
export async function requireUser(request: Request): Promise<{ id: string }> {
  const header = request.headers.get('authorization') ?? ''
  const token = header.replace(/^Bearer\s+/i, '')
  if (!token) throw new HandledError('unauthorized', 'سجّلي الدخول أول.', 401)

  const { data, error } = await serviceClient().auth.getUser(token)
  if (error || !data.user) throw new HandledError('unauthorized', 'الجلسة منتهية.', 401)

  return { id: data.user.id }
}

/** قراءة جسم الطلب كـJSON مع خطأ واضح لو كان غير صالح. */
export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new HandledError('invalid-request', 'الطلب غير صالح.')
  }
}
