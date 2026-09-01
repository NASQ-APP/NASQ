/**
 * الإعدادات — صفحة واحدة تجيب عن «مَن أنا؟» ثم تُغلق بأفعال الحساب.
 *
 * الترتيب مقصود: بياناتك، ثم ذوقك، ثم صورتك، ثم ما جمعتِه في التطبيق. وتحت
 * الكل — بعيدًا عن يد تتصفّح — الحفظ والخروج وحذف الحساب.
 *
 * **كل ما في الصفحة مسوّدة**: الكتابة والاختيار ما يلمسان الخادم إلا بزر
 * «حفظ». وزر الحفظ يقول حالته بلونه — رصاصي ساكن ما دام ما تغيّر شيء، وأسود
 * ما إن يصير فيه ما يُحفظ.
 */
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, Shield, Trash2 } from 'lucide-react'
import {
  Button,
  ConfirmDialog,
  Field,
  PageHeader,
  TextInput,
  toast,
} from '@/shared/components/ui'
import { PageContainer } from '@/shared/components/layout'
import { ChoiceChip } from '@/features/onboarding/components/ChoiceChip'
import { useWardrobe } from '@/features/wardrobe/store'
import { useLooks } from '@/features/looks/store'
import { useTravel } from '@/features/travel/store'
import { useAiModels } from '@/features/ai-model/store'
import { useOnboarding } from '@/features/onboarding/store'
import { useAuth, syncsAcrossDevices } from '@/features/auth/store'
import {
  AVOID_OPTIONS,
  COLOR_OPTIONS,
  CONTEXT_OPTIONS,
  GENDER_OPTIONS,
  MAX_COLORS,
  MAX_NOTE,
  MAX_TAGS,
  TAG_OPTIONS,
  toggleIn,
} from '@/domain/style/onboarding'
import type { AvoidRule, DeclaredStyle } from '@/domain/style/types'
import type { ItemColor } from '@/domain/wardrobe'

/** ما ينتظر تأكيدًا — فعلٌ بلا رجعة، أو خروج يفقد ما لم يُحفظ. */
type Pending = 'signOut' | 'deleteAccount'

export function SettingsPage() {
  const { wardrobes, items } = useWardrobe()
  const looks = useLooks((s) => s.looks)
  const trips = useTravel((s) => s.trips)
  const { models, photo, clearPhoto } = useAiModels()

  const user = useAuth((state) => state.user)
  const busy = useAuth((state) => state.busy)
  const signOut = useAuth((state) => state.signOut)
  const updateName = useAuth((state) => state.updateName)
  const deleteAccount = useAuth((state) => state.deleteAccount)

  const declared = useOnboarding((state) => state.declared)
  const saveStyle = useOnboarding((state) => state.save)

  const [pending, setPending] = useState<Pending>()
  const [confirmPhoto, setConfirmPhoto] = useState(false)
  const [saving, setSaving] = useState(false)

  // الحقول مسوّدة محلية: الكتابة ما تلمس الجلسة إلا بعد «حفظ» — وإلا صار كل
  // حرف طلبَ خادم. والبداية من اسم الجلسة تكفي: `RequireAuth` ما يعرض هذي
  // الصفحة إلا وفيه مستخدمة، والخروج يفكّها من الشجرة.
  const [name, setName] = useState(user?.name ?? '')

  /*
    مسوّدة الذوق **لا تُنسخ** عند أول رسم — تبقى فارغة لين تلمس المستخدمة شيئًا.

    ذوقها يوصل من الخادم بعد ما تُرسم الصفحة أحيانًا. فلو أخذنا نسخة عند الرسم
    الأول، تجمّدت الصفحة على «ما جاوبتِ بعد» ولو وصلت إجاباتها بعدها بلحظة.
    وبمسوّدة تبدأ فاضية، المعروض هو المخزون لين تعدّل — وبعدها تعديلها هو
    الحقيقة، فما يمسحه ردّ متأخّر تحت يدها.
  */
  const [draft, setDraft] = useState<DeclaredStyle>()
  const style = draft ?? declared

  const edit = (patch: Partial<DeclaredStyle>) => setDraft({ ...style, ...patch })

  const joined = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('ar-SA-u-nu-latn', {
        year: 'numeric',
        month: 'long',
      })
    : undefined

  const nameChanged = name.trim() !== (user?.name ?? '')
  const styleChanged = Boolean(draft) && JSON.stringify(style) !== JSON.stringify(declared)
  const dirty = nameChanged || styleChanged
  const answered = Boolean(declared.completedAt)
  const ownedCount = items.filter((i) => i.source === 'wardrobe').length

  const save = async () => {
    const clean = name.trim()
    if (!clean) return toast.error('الاسم ما ينفع يكون فاضيًا.')

    setSaving(true)
    try {
      if (nameChanged) {
        const failure = await updateName(clean)
        if (failure) return toast.error(failure.message)
      }
      if (styleChanged) await saveStyle(style)
      setDraft(undefined)
      toast.ok('حفظنا تعديلاتك')
    } catch {
      // الفشل يُقال: «حفظنا» بلا حفظ أسوأ من خطأ صريح
      toast.error('ما قدرنا نحفظ. تحقّقي من اتصالك وحاولي مرة ثانية.')
    } finally {
      setSaving(false)
    }
  }

  const stats = [
    { label: 'الخزائن', value: wardrobes.length },
    { label: 'القطع', value: ownedCount },
    { label: 'الإطلالات', value: looks.length },
    { label: 'الرحلات', value: trips.length },
    { label: 'الموديلات', value: models.length },
  ]

  return (
    <PageContainer width="prose">
      <PageHeader eyebrow="Settings" title="الإعدادات" />

      {/* ---------------- بياناتي ---------------- */}
      <section className="mb-14">
        <p className="eyebrow mb-4">بياناتي</p>
        <div className="flex flex-col gap-4">
          <Field label="الاسم" hint="هو اللي يناديك فيه دولابك في الصفحة الرئيسية">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="البريد الإلكتروني" hint="بريد دخولك — ما يتغيّر من هنا">
            <TextInput dir="ltr" value={user?.email ?? ''} readOnly disabled />
          </Field>
          <p className="text-[12px] text-muted">
            {joined && <>عضوة منذ {joined} · </>}
            {syncsAcrossDevices
              ? 'حسابك على الخادم — بياناتك تتبعك على أي جهاز تدخلين منه.'
              : 'ملف على هذا الجهاز فقط — ما يزامن بين الأجهزة.'}
          </p>
        </div>
      </section>

      {/* ---------------- ذوقي ---------------- */}
      <section className="mb-14">
        <p className="eyebrow mb-1">ذوقي</p>
        <p className="mb-7 text-[12px] leading-7 text-muted">
          {answered
            ? 'هذي إجاباتك من أول لقاء — عدّليها متى ما تغيّر ذوقك، ونَسّق يمشي عليها.'
            : 'ما جاوبتِ أسئلة التعارف بعد. جاوبيها من هنا، وتبدأ الاقتراحات تعرفك.'}
        </p>

        <div className="flex flex-col gap-8">
          <Question title="ما هو جنسك؟">
            <div className="flex flex-wrap gap-2">
              {GENDER_OPTIONS.map((option) => (
                <ChoiceChip
                  key={option.id}
                  label={option.name}
                  active={style.gender === option.id}
                  onClick={() =>
                    edit({ gender: style.gender === option.id ? undefined : option.id })
                  }
                />
              ))}
            </div>
          </Question>

          <Question title="وش يوصف ذوقك؟" hint="اختاري ثنتين أو ثلاث.">
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => (
                <ChoiceChip
                  key={tag}
                  label={tag}
                  active={style.tags.includes(tag)}
                  disabled={style.tags.length >= MAX_TAGS}
                  onClick={() =>
                    edit({ tags: toggleIn(style.tags, tag, (a, b) => a === b, MAX_TAGS) })
                  }
                />
              ))}
            </div>
          </Question>

          <Question title="وش الألوان اللي ترتاحين لها؟" hint="حتى أربعة ألوان — اختياري.">
            <div className="flex flex-wrap gap-x-5 gap-y-4">
              {COLOR_OPTIONS.map((color) => {
                const active = style.colors.some((picked) => picked.name === color.name)
                return (
                  <button
                    key={color.name}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      edit({
                        colors: toggleIn<ItemColor>(
                          style.colors,
                          color,
                          (a, b) => a.name === b.name,
                          MAX_COLORS,
                        ),
                      })
                    }
                    className="flex flex-col items-center gap-2"
                  >
                    <span
                      style={{ background: color.hex }}
                      className={
                        'h-9 w-9 rounded-full border border-[rgba(26,22,19,0.12)] transition-all duration-[320ms] ease-out ' +
                        (active ? 'ring-1 ring-ink ring-offset-[3px] ring-offset-canvas' : '')
                      }
                    />
                    <span className={active ? 'text-[10.5px] text-ink' : 'text-[10.5px] text-faint'}>
                      {color.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </Question>

          <Question title="وش المناسبات اللي تلبسين لها؟" hint="اختاري كل اللي يهمك.">
            <div className="flex flex-wrap gap-2">
              {CONTEXT_OPTIONS.map((occasion) => (
                <ChoiceChip
                  key={occasion.id}
                  label={occasion.name}
                  active={style.contexts.includes(occasion.id)}
                  onClick={() =>
                    edit({ contexts: toggleIn(style.contexts, occasion.id, (a, b) => a === b) })
                  }
                />
              ))}
            </div>
          </Question>

          <Question title="وش تحبين نَسّق يتجنّبه؟" hint="يستبعده من كل اقتراح.">
            <div className="flex flex-wrap gap-2">
              {AVOID_OPTIONS.map((rule) => (
                <ChoiceChip
                  key={rule.id}
                  label={rule.name}
                  active={style.avoid.includes(rule.id)}
                  onClick={() =>
                    edit({ avoid: toggleIn<AvoidRule>(style.avoid, rule.id, (a, b) => a === b) })
                  }
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => edit({ avoid: [] })}
              aria-pressed={style.avoid.length === 0}
              className={
                'mt-4 text-[12px] underline underline-offset-[5px] transition-colors ' +
                (style.avoid.length === 0
                  ? 'text-muted decoration-ink'
                  : 'text-faint decoration-line hover:text-ink')
              }
            >
              ما عندي قيود
            </button>
          </Question>

          <Question title="فيه شيء ثاني ودّك نَسّق يعرفه عن ذوقك؟">
            <textarea
              value={style.note ?? ''}
              onChange={(event) => edit({ note: event.target.value.slice(0, MAX_NOTE) })}
              rows={3}
              maxLength={MAX_NOTE}
              placeholder="مثلًا: أحب الأكمام الطويلة، وأتجنّب اللمعة في النهار…"
              className="w-full resize-none rounded-md border border-line bg-surface px-4 py-3 text-[12.5px] leading-7 outline-none transition-colors focus:border-ink placeholder:text-faint"
            />
          </Question>
        </div>
      </section>

      {/* ---------------- صورتي ---------------- */}
      <section className="mb-14">
        <p className="eyebrow mb-4">صورتي</p>
        {photo ? (
          <div className="flex flex-wrap items-center gap-5 rounded-md border border-line p-5">
            <img
              src={photo.url}
              alt="صورتك"
              className="h-[110px] w-[88px] rounded-md border border-line object-cover"
            />
            <div className="flex-1">
              <p className="text-[12.5px] leading-7 text-muted">
                محفوظة داخل متصفحك فقط لهذي الجلسة — ما انرفعت لأي خادم.
              </p>
              <Button
                variant="danger"
                size="sm"
                className="mt-3"
                onClick={() => setConfirmPhoto(true)}
              >
                <Trash2 size={13} strokeWidth={1.5} />
                حذف صورتي
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-muted">
            ما فيه صورة مرفوعة.{' '}
            <Link to="/studio" className="underline-offset-4 hover:underline">
              ارفعيها من الاستوديو
            </Link>
            .
          </p>
        )}
        <Link
          to="/privacy"
          className="mt-4 inline-flex items-center gap-2 text-[12.5px] text-muted hover:text-ink"
        >
          <Shield size={14} strokeWidth={1.4} />
          كيف نتعامل مع صورك
        </Link>
      </section>

      {/* ---------------- دولابك بالأرقام ---------------- */}
      <section className="mb-14">
        <p className="eyebrow mb-4">دولابك بالأرقام</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-md border border-line px-4 py-5">
              <p className="lat text-[22px] font-light">{s.value}</p>
              <p className="mt-1 text-[11.5px] text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- الأفعال ---------------- */}
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-8">
        {/*
          اللون يقول الحالة: رصاصي ما دام ما فيه ما يُحفظ، وأسود لحظة ما يصير.
          فما تضغط زرًّا بارزًا ليردّ عليها «ما فيه تغيير».
        */}
        <Button
          variant={dirty ? 'primary' : 'secondary'}
          onClick={save}
          disabled={!dirty || saving || busy}
        >
          {saving ? 'نحفظ…' : 'حفظ'}
        </Button>
        <Button variant="secondary" onClick={() => setPending('signOut')}>
          <LogOut size={13} strokeWidth={1.5} />
          خروج
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-md border border-line p-5">
        <div>
          <p className="text-[13.5px]">حذف الحساب</p>
          <p className="mt-0.5 text-[12px] leading-6 text-muted">
            يمسح حسابك وخزائنك وقطعك وإطلالاتك ورحلاتك. ما فيه رجعة.
          </p>
        </div>
        <Button variant="danger" size="sm" onClick={() => setPending('deleteAccount')}>
          <Trash2 size={13} strokeWidth={1.5} />
          حذف الحساب
        </Button>
      </div>

      <ConfirmDialog
        open={confirmPhoto}
        onClose={() => setConfirmPhoto(false)}
        onConfirm={() => {
          clearPhoto()
          setConfirmPhoto(false)
          toast.ok('حذفنا صورتك')
        }}
        eyebrow="Delete"
        title="حذف صورتك؟"
        confirmLabel="حذف الصورة"
      >
        الصورة تنمسح من متصفحك بلا رجعة. إطلالاتك المحفوظة تبقى كما هي.
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(undefined)}
        onConfirm={async () => {
          const action = pending
          setPending(undefined)
          if (action === 'signOut') {
            await signOut()
            toast.ok('سجّلنا خروجك')
            return
          }
          const failure = await deleteAccount()
          if (failure) return toast.error(failure.message)
          toast.ok('حذفنا حسابك')
        }}
        eyebrow="Confirm"
        destructive={pending === 'deleteAccount'}
        title={pending === 'deleteAccount' ? 'حذف حسابك نهائيًا؟' : 'تسجيل الخروج؟'}
        confirmLabel={pending === 'deleteAccount' ? 'احذفي حسابي' : 'خروج'}
      >
        {pending === 'deleteAccount'
          ? `راح ينحذف حسابك ومعه ${ownedCount} قطعة و${wardrobes.length} خزانة و${looks.length} إطلالة. ما نقدر نرجّعها.`
          : dirty
            ? 'عندك تعديلات ما انحفظت — الخروج يفقدها.'
            : 'راح ترجعين لصفحة الدخول. بياناتك تبقى مكانها.'}
      </ConfirmDialog>
    </PageContainer>
  )
}

/** سؤال واحد من التعارف معروضًا للتعديل — نفس نصوصه، بلا شاشة لكل واحد. */
function Question({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div>
      <p className="text-[13.5px]">{title}</p>
      {hint && <p className="mt-0.5 text-[11.5px] text-faint">{hint}</p>}
      <div className="mt-3">{children}</div>
    </div>
  )
}
