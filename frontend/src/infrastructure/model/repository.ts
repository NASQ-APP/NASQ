/**
 * موديلات المستخدمة على الخادم.
 *
 * القياسات تُحفظ في `measurements` (jsonb) لا في أعمدة مفردة: المجال يضيف
 * قياسًا ويشيل آخر حسب ما تتطوّر شاشة الإنشاء، وعمود لكل قياس يعني هجرة مع
 * كل تعديل. `height_cm` وحده له عمود لأنه الوحيد الذي تفرزه القاعدة.
 *
 * **الصورة رابط لا ملف**: معاينة الموديل صورة أساس مشحونة مع التطبيق
 * (`/models/female-base.png`) لا صورة مولّدة، فما فيه ما يُرفع.
 */
import { requireSupabase } from '@/infrastructure/supabase'
import type { AiModel, ModelCharacteristics } from '@/domain/model'
import type { Gender } from '@/domain/shared/types'
import type { Tables } from '@/infrastructure/supabase'

type ModelRow = Tables<'models'>

async function currentUserId(): Promise<string> {
  const db = requireSupabase()
  const { data, error } = await db.auth.getUser()
  if (error || !data.user) throw new Error('no-session')
  return data.user.id
}

/** القياسات المحفوظة — نقرأ المعروف منها فقط ونتجاهل الباقي. */
function measurementsOf(value: ModelRow['measurements']): Partial<ModelCharacteristics> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const raw = value as Record<string, unknown>
  const num = (key: string) => (typeof raw[key] === 'number' ? (raw[key] as number) : undefined)

  return {
    weightKg: num('weightKg'),
    chestCm: num('chestCm'),
    waistCm: num('waistCm'),
    hipsCm: num('hipsCm'),
    shoulderWidthCm: num('shoulderWidthCm'),
    inseamCm: num('inseamCm'),
  }
}

const toModel = (row: ModelRow): AiModel => ({
  id: row.id,
  name: row.name,
  characteristics: {
    gender: row.gender as Gender,
    heightCm: row.height_cm ?? undefined,
    ...measurementsOf(row.measurements),
    refinement: row.refinement ?? undefined,
  },
  seed: row.seed,
  previewImageUrl: row.preview_image_url ?? '',
  isDefault: row.is_default,
  createdAt: row.created_at,
})

const toRow = (model: AiModel, userId: string) => {
  const { gender, heightCm, refinement, ...measurements } = model.characteristics
  return {
    id: model.id,
    user_id: userId,
    name: model.name,
    gender,
    height_cm: heightCm ?? null,
    measurements,
    refinement: refinement ?? null,
    seed: model.seed,
    preview_image_url: model.previewImageUrl || null,
    is_default: model.isDefault,
    created_at: model.createdAt,
  }
}

export async function fetchModels(): Promise<AiModel[]> {
  const db = requireSupabase()
  const { data, error } = await db.from('models').select('*').order('created_at')
  if (error) throw error
  return data.map(toModel)
}

export async function insertModel(model: AiModel): Promise<void> {
  const db = requireSupabase()
  const userId = await currentUserId()
  const { error } = await db.from('models').insert(toRow(model, userId))
  if (error) throw error
}

export async function updateModel(model: AiModel): Promise<void> {
  const db = requireSupabase()
  const userId = await currentUserId()
  const { error } = await db
    .from('models')
    .update({ ...toRow(model, userId), updated_at: new Date().toISOString() })
    .eq('id', model.id)
  if (error) throw error
}

export async function deleteModel(id: string): Promise<void> {
  const db = requireSupabase()
  const { error } = await db.from('models').delete().eq('id', id)
  if (error) throw error
}

/**
 * الافتراضي واحد لكل جنس.
 *
 * نرفع العلم عن إخوته ثم نضعه عليه، في طلبين لا واحد: `update` واحد ما يقدر
 * يعطي قيمتين مختلفتين لصفوف مختلفة.
 */
export async function setDefaultModel(id: string, gender: Gender): Promise<void> {
  const db = requireSupabase()
  const userId = await currentUserId()

  const { error: clearError } = await db
    .from('models')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('gender', gender)
  if (clearError) throw clearError

  const { error } = await db.from('models').update({ is_default: true }).eq('id', id)
  if (error) throw error
}
