/**
 * التعارف الأول — أربعة أسئلة وشاشة فهم.
 *
 * ما فيه صور ولا تحليل: **اختيار المستخدمة هو الملف المُصرَّح مباشرة**، بلا
 * استنتاج في الوسط. هذا يخلي ما نعرضه في شاشة الفهم مطابقًا تمامًا لما
 * سيستعمله الستايليست.
 *
 * وكل شاشة تحمل **سؤالًا واحدًا** بصيغة واحدة («وش…؟») — الألوان انفصلت عن
 * النبرة بعد ما كانت معها، لأن سؤالين في شاشة يخلّي الجواب مترددًا. كل خطوة
 * قابلة للتخطّي، والتخطّي يُقال بصراحة في النهاية بدل ما نتظاهر بفهم ما لم
 * نفهمه.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton, Button, ColorSwatch, toast } from '@/shared/components/ui'
import { StepShell } from '@/features/onboarding/components/StepShell'
import { ChoiceChip } from '@/features/onboarding/components/ChoiceChip'
import { useOnboarding } from '@/features/onboarding/store'
import {
  AVOID_OPTIONS,
  COLOR_OPTIONS,
  CONTEXT_OPTIONS,
  MAX_COLORS,
  GENDER_OPTIONS,
  MAX_NOTE,
  MAX_TAGS,
  MIN_TAGS,
  TAG_OPTIONS,
  confidenceOf,
} from '@/domain/style/onboarding'
import { occasionName } from '@/domain/wardrobe'
import { APP, ROUTES } from '@/shared/config'
import type { AvoidRule } from '@/domain/style/types'
import type { ItemColor } from '@/domain/wardrobe'

const TOTAL = 6
/** رقم شاشة الملخّص — بعد آخر سؤال */
const SUMMARY = TOTAL + 1

/** رابط نصّي صغير لـ«تخطّي» — خروج من التعارف، فما يزاحم زر التقدّم. */
const QUIET = 'text-[11.5px] text-faint transition-colors hover:text-ink'

export function WelcomePage() {
  const navigate = useNavigate()
  const { declared, patch, complete, toggleTag, toggleColor, toggleContext, toggleAvoid } =
    useOnboarding()
  const [step, setStep] = useState(1)

  const leave = () => navigate(ROUTES.home)

  const save = () => {
    complete()
    toast.ok('عرفت ذوقك — نبدأ؟')
    navigate(ROUTES.home)
  }

  /* ---------------- ١ · الجنس ---------------- */
  if (step === 1) {
    const gender = declared.gender

    return (
      <Shell>
        <StepShell
          eyebrow="You"
          step={1}
          total={TOTAL}
          title="ما هو جنسك؟"
          footer={
            <>
              <Button disabled={!gender} onClick={() => setStep(2)}>
                تمام
              </Button>
              <button onClick={leave} className={QUIET}>
                تخطّي
              </button>
            </>
          }
        >
          <div className="flex flex-wrap gap-2">
            {GENDER_OPTIONS.map((option) => (
              <ChoiceChip
                key={option.id}
                label={option.name}
                active={gender === option.id}
                onClick={() => patch({ gender: option.id })}
              />
            ))}
          </div>
        </StepShell>
      </Shell>
    )
  }

  /* ---------------- ١ · النبرة ---------------- */
  if (step === 2) {
    const tags = declared.tags

    return (
      <Shell>
        <StepShell
          eyebrow="Style"
          step={2}
          total={TOTAL}
          title="وش يوصف ذوقك؟"
          hint="اختاري ثنتين أو ثلاث."
          footer={
            <>
              <Button disabled={tags.length < MIN_TAGS} onClick={() => setStep(3)}>
                تمام
              </Button>
              <button onClick={leave} className={QUIET}>
                تخطّي
              </button>
            </>
          }
        >
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map((tag) => (
              <ChoiceChip
                key={tag}
                label={tag}
                active={tags.includes(tag)}
                disabled={tags.length >= MAX_TAGS}
                onClick={() => toggleTag(tag, MAX_TAGS)}
              />
            ))}
          </div>
        </StepShell>
      </Shell>
    )
  }

  /* ---------------- ٢ · الألوان ---------------- */
  if (step === 3) {
    const colors = declared.colors

    return (
      <Shell>
        <StepShell
          eyebrow="Palette"
          step={3}
          total={TOTAL}
          title="وش الألوان اللي ترتاحين لها؟"
          hint="حتى أربعة ألوان — اختياري."
          footer={
            <>
              <Button onClick={() => setStep(4)}>تمام</Button>
              <BackButton onClick={() => setStep(2)} />
            </>
          }
        >
          <div className="flex flex-wrap gap-x-5 gap-y-4">
            {COLOR_OPTIONS.map((color) => {
              const active = colors.some((picked) => picked.name === color.name)
              return (
                <button
                  key={color.name}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleColor(color, MAX_COLORS)}
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
        </StepShell>
      </Shell>
    )
  }

  /* ---------------- ٣ · المناسبات ---------------- */
  if (step === 4) {
    const contexts = declared.contexts

    return (
      <Shell>
        <StepShell
          eyebrow="Occasions"
          step={4}
          total={TOTAL}
          title="وش المناسبات اللي تلبسين لها؟"
          hint="اختاري كل اللي يهمك."
          footer={
            <>
              <Button disabled={contexts.length === 0} onClick={() => setStep(5)}>
                تمام
              </Button>
              <BackButton onClick={() => setStep(3)} />
              <button onClick={leave} className={QUIET}>
                تخطّي
              </button>
            </>
          }
        >
          <div className="flex flex-wrap gap-2">
            {CONTEXT_OPTIONS.map((occasion) => (
              <ChoiceChip
                key={occasion.id}
                label={occasion.name}
                active={contexts.includes(occasion.id)}
                onClick={() => toggleContext(occasion.id)}
              />
            ))}
          </div>
        </StepShell>
      </Shell>
    )
  }

  /* ---------------- ٤ · القيود ---------------- */
  if (step === 5) {
    const avoid = declared.avoid
    const none = avoid.length === 0

    return (
      <Shell>
        <StepShell
          eyebrow="Limits"
          step={5}
          total={TOTAL}
          title="وش تحبين أتجنّبه؟"
          hint="بستبعده من كل اقتراح."
          footer={
            <>
              <Button onClick={() => setStep(6)}>تمام</Button>
              <BackButton onClick={() => setStep(4)} />
            </>
          }
        >
          <div className="flex flex-wrap gap-2">
            {AVOID_OPTIONS.map((rule) => (
              <ChoiceChip
                key={rule.id}
                label={rule.name}
                active={avoid.includes(rule.id)}
                onClick={() => toggleAvoid(rule.id)}
              />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
            <button
              type="button"
              onClick={() => patch({ avoid: [] })}
              aria-pressed={none}
              className={
                'text-[12px] underline underline-offset-[5px] transition-colors ' +
                (none ? 'text-muted decoration-ink' : 'text-faint decoration-line hover:text-ink')
              }
            >
              ما عندي قيود
            </button>
            <p className="text-[11px] leading-6 text-faint">
              إذا كانت تفاصيل قطعة غير معروفة، ما راح أفترضها من عندي.
            </p>
          </div>
        </StepShell>
      </Shell>
    )
  }

  /* ---------------- ٦ · ملاحظتها ---------------- */
  if (step === 6) {
    return (
      <Shell>
        <StepShell
          eyebrow="Note"
          step={6}
          total={TOTAL}
          title="فيه شيء ثاني ودّك أعرفه عن ذوقك؟"
          hint="اكتبي أي تفضيل أو ملاحظة تساعدني أفهم ستايلك أكثر."
          footer={
            <>
              <Button onClick={() => setStep(SUMMARY)}>تمام</Button>
              <BackButton onClick={() => setStep(5)} />
              <button onClick={() => setStep(SUMMARY)} className={QUIET}>
                تخطّي
              </button>
            </>
          }
        >
          <textarea
            value={declared.note ?? ''}
            onChange={(event) => patch({ note: event.target.value.slice(0, MAX_NOTE) })}
            rows={3}
            maxLength={MAX_NOTE}
            placeholder="مثلًا: أحب الأكمام الطويلة، وأتجنّب اللمعة في النهار…"
            className="w-full resize-none rounded-md border border-line bg-surface px-4 py-3 text-[12.5px] leading-7 outline-none transition-colors focus:border-ink placeholder:text-faint"
          />
          <p className="mt-1.5 text-[10.5px] text-faint">
            اختياري — وما تلغي القيود اللي اخترتيها قبل شوي.
          </p>
        </StepShell>
      </Shell>
    )
  }

  /* ---------------- شاشة الفهم ---------------- */
  return (
    <Shell>
      <section className="w-full max-w-[560px]">
        <div className="flex items-baseline justify-between">
          <p className="lat text-[8px] tracking-[0.34em] text-muted">Profile</p>
          <p className="lat text-[8px] tracking-[0.2em] text-faint">
            {Math.round(confidenceOf({ ...declared, completedAt: 'x' }) * 100)}%
          </p>
        </div>
        <div className="mt-2.5 h-px w-full bg-ink" />

        <h1 className="mt-7 text-[21px] leading-snug sm:text-[23px]">هذا اللي فهمته عن ذوقك</h1>
        <p className="mt-1.5 text-[12px] text-muted">عدّلي أي شي قبل ما أحفظه.</p>

        <dl className="mt-6 border-t border-line">
          <SummaryRow label="التخصيص" onEdit={() => setStep(1)}>
            {GENDER_OPTIONS.find((o) => o.id === declared.gender)?.name ?? 'ما حدّدتِ'}
          </SummaryRow>

          <SummaryRow label="الذوق" onEdit={() => setStep(2)}>
            {declared.tags.length > 0 ? declared.tags.join(' · ') : 'ما اخترتِ ذوقًا'}
          </SummaryRow>

          <SummaryRow label="الألوان" onEdit={() => setStep(3)}>
            {declared.colors.length > 0 ? (
              <span className="flex flex-wrap items-center gap-2">
                {declared.colors.map((color: ItemColor) => (
                  <span key={color.name} className="flex items-center gap-1.5">
                    <ColorSwatch hex={color.hex} label={color.name} size="sm" />
                    {color.name}
                  </span>
                ))}
              </span>
            ) : (
              'ما اخترتِ ألوانًا'
            )}
          </SummaryRow>

          <SummaryRow label="المناسبات" onEdit={() => setStep(4)}>
            {declared.contexts.length > 0
              ? declared.contexts.map((id: string) => occasionName(id)).join(' · ')
              : 'ما حدّدتِ مناسبة'}
          </SummaryRow>

          <SummaryRow label="أتجنّب" onEdit={() => setStep(5)}>
            {declared.avoid.length > 0 ? (
              declared.avoid
                .map((id: AvoidRule) => AVOID_OPTIONS.find((r) => r.id === id)?.name)
                .join(' · ')
            ) : (
              <span className="text-muted">ما عندك قيود، بقترح لك من كل شي</span>
            )}
          </SummaryRow>
          <SummaryRow label="ملاحظتك" onEdit={() => setStep(6)}>
            {declared.note?.trim() ? declared.note : <span className="text-muted">ما كتبتِ شي</span>}
          </SummaryRow>
        </dl>

        <div className="mt-6 flex items-center gap-4">
          <Button onClick={save}>احفظي وابدئي</Button>
          <button onClick={leave} className={QUIET}>
            تخطّي الحين
          </button>
        </div>
      </section>
    </Shell>
  )
}

/* ---------------- قطع مساعدة ---------------- */

/**
 * قشرة التعارف — مستقلة عن قشرة التطبيق.
 *
 * ما فيها لوح تنقّل ولا بحث، والسؤال موسّط رأسيًا عشان يبان كامله على شاشة
 * اللابتوب بلا تمرير. الخروج بقرار صريح («احفظي وابدئي» أو «تخطّي»).
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex items-baseline gap-2.5 px-5 py-5 lg:px-8">
        <span className="text-[17px]">{APP.name}</span>
        <span className="lat text-[8px] tracking-[0.34em] text-muted">{APP.latin}</span>
      </header>

      <div className="flex flex-1 items-center justify-center px-5 pb-14 lg:px-8">{children}</div>
    </div>
  )
}

function SummaryRow({
  label,
  onEdit,
  children,
}: {
  label: string
  onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-4 border-b border-line py-3.5">
      <dt className="w-[76px] flex-none pt-0.5 text-[9.5px] uppercase tracking-[0.18em] text-faint">
        {label}
      </dt>
      <dd className="flex-1 text-[12.5px] leading-6">{children}</dd>
      <button onClick={onEdit} className="text-[11px] text-faint transition-colors hover:text-ink">
        تعديل
      </button>
    </div>
  )
}
