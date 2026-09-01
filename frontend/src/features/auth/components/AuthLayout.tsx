/**
 * قشرة صفحتي الحساب: لوحة علامة على جانب، ونموذج على الجانب الآخر.
 *
 * اللوحة حبريّة والنموذج على أرضية بيضاء — التباين وحده يحمل التصميم، بلا
 * تدرّجات ولا ظلال ولا صور (§18). والزخرفة مبنية من خطوط رفيعة توحي بقضيب
 * دولاب وعلاقات معلّقة، فتبقى في لغة النظام نفسها.
 *
 * على الجوال تختفي اللوحة ويبقى النموذج وحده مع العلامة فوقه.
 */
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Logo, LogoMark } from '@/shared/components/brand'
import { APP, ROUTES } from '@/shared/config'
import { motion as motionTokens } from '@/theme'

/** قضيب دولاب بعلاقات معلّقة — زخرفة خطّية، مو صورة. */
function RailMotif() {
  const hangers = [88, 168, 248, 328]
  return (
    <svg
      viewBox="0 0 420 260"
      fill="none"
      aria-hidden
      className="w-full max-w-[420px] text-white/25"
    >
      <path d="M20 40h380" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      {hangers.map((x, index) => (
        <g key={x} stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d={`M${x} 40v${34 + index * 12}`} />
          <path
            d={`M${x} ${74 + index * 12} ${x - 34} ${112 + index * 12}
               a6 6 0 0 0 4 10.5h60a6 6 0 0 0 4-10.5L${x} ${74 + index * 12}Z`}
            opacity={0.65}
          />
        </g>
      ))}
    </svg>
  )
}

export function AuthLayout({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      {/* ---------------- النموذج ---------------- */}
      <main className="order-2 flex flex-col justify-center px-6 py-12 sm:px-12 lg:order-1 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: motionTokens.slow, ease: motionTokens.easeArray }}
          className="mx-auto w-full max-w-[400px]"
        >
          <Link to={ROUTES.home} className="mb-12 inline-flex lg:hidden">
            <Logo size={26} />
          </Link>

          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-3 text-[30px] sm:text-[34px]">{title}</h1>
          <p className="mt-3 text-[13px] leading-8 text-muted">{description}</p>

          <div className="mt-9">{children}</div>

          <div className="mt-8 border-t border-line pt-6 text-[12.5px] text-muted">{footer}</div>
        </motion.div>
      </main>

      {/* ---------------- لوحة العلامة ---------------- */}
      <aside className="order-1 hidden flex-col justify-between bg-ink px-14 py-14 text-white lg:order-2 lg:flex">
        <Link to={ROUTES.home} className="inline-flex text-white">
          <Logo size={28} />
        </Link>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-col items-start gap-10"
        >
          <RailMotif />
          <div>
            <p className="display max-w-[380px] text-[30px] leading-[1.45] text-white">
              خزانتك كلها في مكان واحد، والقطعة تُعرض عليك قبل لبسها.
            </p>
            <p className="mt-5 max-w-[340px] text-[13px] leading-8 text-white/55">{APP.tagline}</p>
          </div>
        </motion.div>

        <p className="flex items-center gap-2.5 text-[11.5px] text-white/45">
          <LogoMark size={15} />
          صورك وخزانتك تبقى في جهازك — ما نرفعها لأي مكان.
        </p>
      </aside>
    </div>
  )
}
