import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Sparkles } from 'lucide-react'
import { Button, ButtonLink, Card, EmptyState, SectionHeader } from '@/shared/components/ui'
import { PageContainer } from '@/shared/components/layout'
import { WardrobeCard } from '@/features/wardrobe/components/WardrobeCard'
import { LookCard } from '@/features/looks/components/LookCard'
import { useWardrobe } from '@/features/wardrobe/store'
import { useLooks } from '@/features/looks/store'
import { useProfile } from '@/features/profile/store'
import { useAiModels } from '@/features/ai-model/store'
import { DailySuggestions, QUICK_PROMPTS } from '@/features/stylist'
import { WeatherLine } from '@/features/weather'
import { useAppShell } from '@/app/layout'
import { APP, ROUTES } from '@/shared/config'

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'صباح الخير' : 'مساء الخير'
}

export function HomePage() {
  const { wardrobes, items } = useWardrobe()
  const looks = useLooks((s) => s.looks)
  const name = useProfile((s) => s.name)
  const model = useAiModels((s) => s.models[0])
  // المودالات المشتركة تعيش في القشرة — نفتحها من هنا بدل ما نكرّرها
  const { openAdd, openStylist } = useAppShell()

  const owned = items.filter((i) => i.source === 'wardrobe')

  return (
    <PageContainer>
      {/* ---------------- hero ---------------- */}
      <section className="mb-14 max-w-[760px]">
        <p className="eyebrow">
          {new Date().toLocaleDateString('ar-SA-u-nu-latn', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>

        {/* الجو سياق للقرار — والمنسّق يقرأ نفس القراءة لاحقًا */}
        <WeatherLine />

        <h1 className="mt-4 text-[36px] sm:text-[42px]">
          {greeting()}، {name}.
          <br />
          <span className="display text-[40px] sm:text-[48px]">وش ودك تلبسين اليوم؟</span>
        </h1>
        <p className="mt-4 text-[14px] text-muted">
          {owned.length > 0
            ? `خزانتك فيها ${owned.length} قطعة موزّعة على ${wardrobes.length} خزائن.`
            : 'خزانتك فاضية — صوّري أول قطعة من دولابك ونبدأ.'}
        </p>

        <button
          onClick={openStylist}
          aria-label={`اسألي ${APP.shortName} — نسّقي لي إطلالة لليوم`}
          className="lift mt-7 flex w-full items-center gap-3 rounded-md border border-line bg-surface px-6 py-5 text-right hover:border-line-strong"
        >
          <Sparkles size={17} strokeWidth={1.3} aria-hidden className="text-faint" />
          <span className="flex-1 text-[13.5px] text-faint">
            اسألي {APP.shortName}… نسّقي لي إطلالة لليوم
          </span>
          <span className="grid h-9 w-9 place-items-center rounded-md bg-ink-soft text-white">
            <ArrowLeft size={15} strokeWidth={1.5} aria-hidden />
          </span>
        </button>

        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_PROMPTS.slice(0, 4).map((p) => (
            <button
              key={p}
              onClick={openStylist}
              className="rounded-full border border-line px-4 py-2 text-[11.5px] text-muted transition-colors hover:border-line-strong hover:text-ink"
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      {/* ---------------- model nudge ---------------- */}
      {!model && (
        <Card as="section" className="mb-14 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="eyebrow">Your model</p>
            <p className="mt-2 text-[17px] font-light">أنشئي موديلك عشان تشوفين القطع عليك.</p>
            <p className="mt-1 text-[12.5px] text-muted">
              طولك ومقاسك ولون بشرتك — مرة وحدة، ونستخدمه في كل إطلالة.
            </p>
          </div>
          <ButtonLink to={ROUTES.newModel}>أنشئي موديلك</ButtonLink>
        </Card>
      )}

      {/* ---------------- اقتراحات اليوم ---------------- */}
      <DailySuggestions onAskStylist={openStylist} />

      {/* ---------------- wardrobes ---------------- */}
      <section className="mb-16">
        <SectionHeader
          eyebrow="My wardrobes"
          title="خزائني"
          action={
            <Link to="/wardrobes" className="text-[12px] text-muted hover:text-ink">
              عرض الكل
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">
          {wardrobes.slice(0, 4).map((w) => (
            <WardrobeCard key={w.id} wardrobe={w} />
          ))}
          <button
            onClick={openAdd}
            className="flex aspect-[4/4.5] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line-strong text-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <Plus size={20} strokeWidth={1.2} />
            <span className="text-[12px]">إضافة قطعة</span>
          </button>
        </div>
      </section>

      {/* ---------------- recent looks ---------------- */}
      <section>
        <SectionHeader
          eyebrow="Recent looks"
          title="آخر إطلالاتك"
          action={
            <Link to="/looks" className="text-[12px] text-muted hover:text-ink">
              عرض الكل
            </Link>
          }
        />
        {looks.length === 0 ? (
          <EmptyState
            title="ما فيه إطلالات بعد."
            body="ابدئي التنسيق من خزانتك واحفظي أول إطلالة."
            action={<Button onClick={openStylist}>اسألي دولابي</Button>}
          />
        ) : (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
            {looks.slice(0, 4).map((look) => (
              <LookCard key={look.id} look={look} />
            ))}
          </div>
        )}
      </section>

    </PageContainer>
  )
}
