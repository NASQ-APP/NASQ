/** موديلاتي (M-05) — تعديل، إعادة توليد، حذف، تعيين الافتراضي. */
import { Link, useNavigate } from 'react-router-dom'
import { Camera, Check, Pencil, Trash2 } from 'lucide-react'
import { Button, ButtonLink, EmptyState, toast, Badge, PageHeader } from '@/shared/components/ui'
import { useAiModels } from '@/features/ai-model/store'
import { SKIN_TONES } from '@/infrastructure/rendering'
import { formatShortDate } from '@/shared/lib'

const SHAPE_LABEL: Record<string, string> = {
  slim: 'نحيف',
  straight: 'مستقيم',
  athletic: 'رياضي',
  curvy: 'ممتلئ متناسق',
  plus: 'مقاسات أكبر',
}

export function ModelsPage() {
  const { models, deleteModel, setDefault, photo, clearPhoto } = useAiModels()
  const navigate = useNavigate()

  return (
    <div>
      <PageHeader
        eyebrow="My models"
        title="موديلاتي"
        description="موديل لكل تشكيلة. القطع النسائية تنعرض على الموديل النسائي، والرجالية على الرجالي."
        action={<ButtonLink to="/models/new">موديل جديد</ButtonLink>}
      />

      {models.length === 0 ? (
        <EmptyState
          title="ما عندك موديل بعد."
          body="أنشئي موديلك مرة وحدة، ونستخدمه في كل تجربة."
          action={<ButtonLink to="/models/new">أنشئي موديلك</ButtonLink>}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {models.map((model) => {
            const c = model.characteristics
            const tone = SKIN_TONES.find((t) => t.id === c.skinToneId)
            return (
              <article key={model.id} className="overflow-hidden rounded-md border border-line">
                <div className="relative grid h-[300px] place-items-center bg-surface">
                  <img src={model.previewImageUrl} alt={model.name} className="h-full object-contain py-4" />
                  {model.isDefault && (
                    <span className="absolute right-3 top-3">
                      <Badge tone="dark">افتراضي</Badge>
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[14px]">{model.name}</p>
                    <span className="text-[11px] text-faint">{formatShortDate(model.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-[12px] text-muted">
                    {c.gender === 'female' ? 'نسائي' : 'رجالي'} · {c.heightCm} سم
                    {c.weightKg ? ` · ${c.weightKg} كجم` : ''} · {SHAPE_LABEL[c.bodyShape]}
                    {tone ? ` · بشرة ${tone.name}` : ''}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/models/${model.id}`)}>
                      <Pencil size={13} strokeWidth={1.5} />
                      تعديل
                    </Button>
                    {!model.isDefault && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setDefault(model.id)
                          toast.ok('صار الافتراضي')
                        }}
                      >
                        <Check size={13} strokeWidth={1.6} />
                        اجعليه افتراضي
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        deleteModel(model.id)
                        toast.ok('حذفنا الموديل')
                      }}
                    >
                      <Trash2 size={13} strokeWidth={1.5} />
                    </Button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* user photo (§30) */}
      <section className="mt-12 rounded-md border border-line p-6">
        <div className="flex items-center gap-3">
          <Camera size={17} strokeWidth={1.4} className="text-muted" />
          <p className="text-[14px]">صورتي</p>
        </div>
        {photo ? (
          <div className="mt-4 flex flex-wrap items-center gap-5">
            <img
              src={photo.url}
              alt="صورتك"
              className="h-[120px] w-[96px] rounded-md border border-line object-cover"
            />
            <div className="flex-1">
              <p className="text-[12.5px] text-muted">
                محفوظة داخل متصفحك فقط لهذي الجلسة — ما انرفعت لأي خادم.
              </p>
              <Button
                variant="danger"
                size="sm"
                className="mt-3"
                onClick={() => {
                  clearPhoto()
                  toast.ok('حذفنا صورتك')
                }}
              >
                <Trash2 size={13} strokeWidth={1.5} />
                حذف صورتي
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[12.5px] text-muted">
            ما فيه صورة مرفوعة.{' '}
            <Link to="/studio" className="underline-offset-4 hover:underline">
              ارفعيها من الاستوديو
            </Link>
            .
          </p>
        )}
      </section>
    </div>
  )
}
