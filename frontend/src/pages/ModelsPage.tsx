/**
 * موديلاتي (M-05) — تعديل، تعيين الافتراضي، حذف، وصورتي.
 *
 * البطاقة تعرض القوام كاملاً بنسبة ٣:٤ لا بارتفاع ثابت — الارتفاع الثابت يقصّ
 * القوام على الشاشات الضيقة، والقوام هو محتوى البطاقة كلها.
 *
 * الأفعال تتكيّف مع الجهاز: على الجوال تملأ العرض بأهداف لمس مريحة، ومن
 * `sm` تصير في سطر واحد. وأيقونة الحذف وحدها بلا نص لكنها تحمل `aria-label` —
 * زر بلا اسم لا يقرأه قارئ الشاشة.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Camera, Check, Pencil, Trash2, UserRound } from 'lucide-react'
import {
  Badge,
  Button,
  ButtonLink,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  toast,
} from '@/shared/components/ui'
import { Reveal, RevealItem } from '@/shared/components/motion'
import { PageContainer } from '@/shared/components/layout'
import { READY_MODELS } from '@/domain/model'
import { useAiModels } from '@/features/ai-model/store'
import { describeCharacteristics } from '@/features/ai-model/components/ModelBuilder'
import { cn, formatShortDate } from '@/shared/lib'

export function ModelsPage() {
  const { models, deleteModel, setDefault, photo, clearPhoto, readyModelId, setReadyModel } =
    useAiModels()
  const navigate = useNavigate()

  /*
    ما يُحذف يُسأل عنه أولًا — والحالة تحمل **ما سيُحذف** لا مجرد «مفتوحة».
    الموديل يحتاج اسمه في السؤال، فلو حفظنا رايةً وحدها ضاع الاسم.
  */
  const [confirm, setConfirm] = useState<{ modelId: string; name: string } | 'photo'>()

  return (
    <PageContainer width="content">
      <PageHeader
        eyebrow="My models"
        title="موديلاتي"
        description="موديل لكل تشكيلة. القطع النسائية تنعرض على الموديل النسائي، والرجالية على الرجالي."
        action={<ButtonLink to="/models/new">موديل جديد</ButtonLink>}
      />

      {/* ---------------- الموديلات الجاهزة ---------------- */}
      <section className="mb-12">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <div>
            <p className="eyebrow">Ready models</p>
            <h2 className="mt-1 text-[17px]">موديلات جاهزة</h2>
          </div>
          <p className="text-[11.5px] leading-6 text-faint">لقطة كاملة · خلفية بيضاء</p>
        </div>

        <Reveal className="grid gap-6 sm:grid-cols-2 sm:gap-7">
          {READY_MODELS.map((ready, index) => {
            const active = readyModelId === ready.id

            return (
              <RevealItem key={ready.id} index={index}>
                <button
                  onClick={() => {
                    setReadyModel(active ? undefined : ready.id)
                    if (!active) toast.ok(`${ready.name} صار المختار`)
                  }}
                  aria-pressed={active}
                  className={cn(
                    'lift group relative flex w-full flex-col overflow-hidden rounded-md border text-right transition-colors',
                    active ? 'border-ink' : 'border-line hover:border-line-strong',
                  )}
                >
                  {active && (
                    <span className="absolute end-3 top-3 z-10">
                      <Badge tone="dark">المختار</Badge>
                    </span>
                  )}

                  <span className="grid aspect-[4/5] w-full place-items-center overflow-hidden bg-surface">
                    <img
                      src={ready.imageUrl}
                      alt={ready.name}
                      className="h-full w-full object-contain transition-transform duration-[320ms] ease-soft group-hover:scale-[1.02]"
                    />
                  </span>

                  <span className="flex items-baseline justify-between gap-3 p-4 sm:p-5">
                    <span className="text-[14px]">{ready.name}</span>
                    <span className="text-[11px] text-faint">{ready.note}</span>
                  </span>
                </button>
              </RevealItem>
            )
          })}
        </Reveal>
      </section>

      {models.length > 0 && (
        <div className="mb-4">
          <p className="eyebrow">My measurements</p>
          <h2 className="mt-1 text-[17px]">موديلات بمقاساتي</h2>
        </div>
      )}

      {models.length === 0 ? (
        <EmptyState
          title="ما عندك موديل بمقاساتك."
          body="الموديلات الجاهزة فوق تكفي للتجربة، وتقدرين تنشئين موديلاً بمقاساتك لنتيجة أقرب."
          icon={<UserRound size={22} strokeWidth={1.2} />}
          action={<ButtonLink to="/models/new">أنشئي موديلك</ButtonLink>}
        />
      ) : (
        <Reveal className="grid gap-6 sm:grid-cols-2 sm:gap-7 xl:grid-cols-3">
          {models.map((model, index) => {
            const c = model.characteristics

            return (
              <RevealItem key={model.id} index={index}>
                <article className="lift flex h-full flex-col overflow-hidden rounded-md border border-line hover:border-line-strong">
                  {/* نسبة ثابتة بدل ارتفاع ثابت: القوام يظهر كاملاً على كل مقاس */}
                  <div className="relative grid aspect-[4/5] place-items-center overflow-hidden bg-surface">
                    <img
                      src={model.previewImageUrl}
                      alt={model.name}
                      className="h-full w-full object-contain p-4 mix-blend-multiply"
                    />
                    {model.isDefault && (
                      <span className="absolute end-3 top-3">
                        <Badge tone="dark">افتراضي</Badge>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate text-[14px]">{model.name}</p>
                      <span className="lat flex-none text-[10.5px] text-faint">
                        {formatShortDate(model.createdAt)}
                      </span>
                    </div>

                    {/* الملخّص من مصدر واحد — نفس النص في المعاينة وفي البطاقة */}
                    <p className="mt-1 text-[12px] leading-6 text-muted">
                      {c.gender === 'female' ? 'نسائي' : 'رجالي'} · {describeCharacteristics(c)}
                    </p>

                    {/* الأفعال تُدفع لأسفل البطاقة فتتحاذى بين البطاقات المتفاوتة */}
                    <div className="mt-auto flex flex-col gap-2 pt-4 sm:flex-row sm:items-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        block
                        className="sm:w-auto sm:flex-1"
                        onClick={() => navigate(`/models/${model.id}`)}
                      >
                        <Pencil size={13} strokeWidth={1.5} aria-hidden />
                        تعديل
                      </Button>

                      {!model.isDefault && (
                        <Button
                          size="sm"
                          variant="secondary"
                          block
                          className="sm:w-auto sm:flex-1"
                          onClick={() => {
                            setDefault(model.id)
                            toast.ok('صار الافتراضي')
                          }}
                        >
                          <Check size={13} strokeWidth={1.6} aria-hidden />
                          الافتراضي
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="danger"
                        aria-label={`حذف ${model.name}`}
                        title="حذف"
                        className="w-full sm:w-9 sm:flex-none sm:px-0"
                        onClick={() => setConfirm({ modelId: model.id, name: model.name })}
                      >
                        <Trash2 size={13} strokeWidth={1.5} aria-hidden />
                        <span className="sm:hidden">حذف</span>
                      </Button>
                    </div>
                  </div>
                </article>
              </RevealItem>
            )
          })}
        </Reveal>
      )}

      {/* ---------------- صورتي (§30) ---------------- */}
      <section className="mt-10 rounded-md border border-line p-5 sm:mt-12 sm:p-6">
        <div className="flex items-center gap-3">
          <Camera size={17} strokeWidth={1.4} aria-hidden className="text-muted" />
          <p className="text-[14px]">صورتي</p>
        </div>

        {photo ? (
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <img
              src={photo.url}
              alt="صورتك"
              className="h-[150px] w-[120px] flex-none rounded-md border border-line object-cover sm:h-[120px] sm:w-[96px]"
            />
            <div className="flex-1">
              <p className="text-[12.5px] leading-7 text-muted">
                محفوظة داخل متصفحك فقط لهذي الجلسة — ما انرفعت لأي خادم.
              </p>
              <Button
                variant="danger"
                size="sm"
                className="mt-3 w-full sm:w-auto"
                onClick={() => setConfirm('photo')}
              >
                <Trash2 size={13} strokeWidth={1.5} aria-hidden />
                حذف صورتي
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[12.5px] leading-7 text-muted">
            ما فيه صورة مرفوعة.{' '}
            <Link to="/studio" className="underline-offset-4 hover:underline">
              ارفعيها من الاستوديو
            </Link>
            .
          </p>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(undefined)}
        onConfirm={() => {
          if (confirm === 'photo') {
            clearPhoto()
            toast.ok('حذفنا صورتك')
          } else if (confirm) {
            deleteModel(confirm.modelId)
            toast.ok('حذفنا الموديل')
          }
          setConfirm(undefined)
        }}
        eyebrow="Delete"
        title={confirm === 'photo' ? 'حذف صورتك؟' : `حذف ${confirm ? confirm.name : ''}؟`}
        confirmLabel={confirm === 'photo' ? 'حذف الصورة' : 'حذف الموديل'}
      >
        {confirm === 'photo'
          ? 'الصورة تنمسح من متصفحك بلا رجعة. إطلالاتك المحفوظة تبقى كما هي.'
          : 'الموديل ينحذف بلا رجعة. إطلالاتك المحفوظة تبقى، بس ما عاد لها موديل تنعرض عليه.'}
      </ConfirmDialog>
    </PageContainer>
  )
}
