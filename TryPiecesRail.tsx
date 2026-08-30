/**
 * رفّ «قطع تحت التجربة» — مكوّن مستقل.
 *
 * مصمَّم عشان يُركَّب على أي تصميم موجود بلا ما يجرّ معه شيئًا:
 *
 * - **بلا اعتماديات** غير React وTailwind. ما فيه راوتر ولا متجر حالة ولا
 *   أيقونات ولا نظام ألوان — كل لون مكتوب صريحًا، فيشتغل من أول لصقة.
 * - **بلا مودل ولا استوديو** — يستقبل القطع كـprops وخلاص.
 * - **بلا خلفية داكنة** — البطاقة على ورق فاتح.
 *
 * الفكرة البصرية: القطع **معلّقة على رفّ**، مب موضوعة في مربّعات. خيط نحاسي
 * أفقي بحاملين، وفوق كل قطعة علّاقة صغيرة توصلها بالرفّ.
 *
 * الألوان مكتوبة كقيم مباشرة عن قصد. لو عندك نظام ألوان، بدّليها بأسمائك:
 *   #B08A57 النحاس · #E2D9CC الخط · #FBF8F3 سطح البطاقة
 *   #1A1613 الحبر · #7D7166 الباهت · #A89C8F الأخفت
 */
import { useState } from 'react'

/** القطعة كما يعرضها الرفّ — أقل ما يحتاجه، بلا فئة ولا مقاس ولا مصدر. */
export type RailPiece = {
  id: string
  name: string
  /** صورة القطعة. غيابها ما يكسر شيئًا — نعرض مكانها لوحًا فاتحًا. */
  imageUrl?: string
  /** سطر صغير تحت الاسم: «فساتين · ١٧٥ ر.س» مثلًا */
  meta?: string
  /** تسمية صغيرة أعلى الصورة: اسم المتجر مثلًا */
  badge?: string
}

const join = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ')

/* ---------------------------------------------------------------- */

/** العلّاقة: سلك صغير وحلقة — تربط القطعة بالرفّ فوقها. */
function Hook() {
  return (
    <span aria-hidden className="relative z-10 -mt-px flex flex-col items-center">
      <span className="h-4 w-px bg-[#B08A57]/55" />
      <span className="h-1.5 w-1.5 rounded-full border border-[#B08A57]/60" />
    </span>
  )
}

/** حامل الرفّ عند الطرف. */
function Bracket({ side }: { side: 'start' | 'end' }) {
  return (
    <span
      aria-hidden
      className={join('absolute top-0 h-5 w-px bg-[#B08A57]/45', side === 'start' ? 'start-0' : 'end-0')}
    />
  )
}

function Piece({ piece, onSelect }: { piece: RailPiece; onSelect?: (id: string) => void }) {
  const clickable = Boolean(onSelect)

  return (
    <article className="group flex flex-col items-center">
      <Hook />

      <div
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={() => onSelect?.(piece.id)}
        onKeyDown={(event) => {
          if (clickable && (event.key === 'Enter' || event.key === ' ')) onSelect?.(piece.id)
        }}
        className={join(
          'relative aspect-[3/4] w-full overflow-hidden rounded-[3px] bg-[#FBF8F3]',
          'transition-[transform,box-shadow] duration-[420ms] ease-[cubic-bezier(.22,.61,.36,1)]',
          'group-hover:-translate-y-1 group-hover:shadow-[0_20px_38px_-24px_rgba(26,22,19,0.5)]',
          clickable && 'cursor-pointer',
        )}
      >
        {piece.imageUrl ? (
          <img
            src={piece.imageUrl}
            alt={piece.name}
            loading="lazy"
            className="h-full w-full object-contain p-4"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-[11px] text-[#A89C8F]">
            بلا صورة
          </span>
        )}

        {piece.badge && (
          <span className="absolute end-2 top-2 text-[8px] uppercase tracking-[0.18em] text-[#B08A57]">
            {piece.badge}
          </span>
        )}
      </div>

      {/* خيط نحاسي ينفتح تحت القطعة عند المرور */}
      <span
        aria-hidden
        className="mt-2.5 h-px w-0 self-start bg-[#B08A57]/70 transition-[width] duration-[420ms] ease-[cubic-bezier(.22,.61,.36,1)] group-hover:w-full"
      />

      <div className="mt-2 w-full">
        <p className="line-clamp-2 text-[12px] leading-6 text-[#1A1613]">{piece.name}</p>
        {piece.meta && <p className="mt-1 text-[10.5px] text-[#A89C8F]">{piece.meta}</p>}
      </div>
    </article>
  )
}

/* ---------------------------------------------------------------- */

export function TryPiecesRail({
  title = 'قطع تحت التجربة',
  latin,
  pieces,
  empty = 'الرفّ فاضي.',
  onSelect,
  className,
}: {
  title?: string
  /** تسمية لاتينية صغيرة بجانب العدد */
  latin?: string
  pieces: RailPiece[]
  empty?: string
  /** يُنادى عند الضغط على قطعة — اختياري */
  onSelect?: (id: string) => void
  className?: string
}) {
  /* الشريط الأفقي هو الافتراضي؛ «عرض الكل» يفرد القطع في شبكة. */
  const [showAll, setShowAll] = useState(false)

  /* `overflow-x` يقصّ رأسيًا كمان، والبطاقة ترتفع ولها ظل — فالحشوة ضرورية. */
  const track =
    'flex gap-5 overflow-x-auto overscroll-x-contain pb-4 pt-1 md:gap-7 snap-x snap-mandatory [scrollbar-width:thin]'
  const grid = 'grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-4 md:gap-x-7 xl:grid-cols-6'
  const cell = showAll ? undefined : 'w-[46%] flex-none snap-start sm:w-[200px] xl:w-[220px]'

  return (
    <section dir="rtl" className={join('mb-16', className)}>
      <div className="mb-3 flex items-end justify-between gap-4">
        <h2 className="flex items-baseline gap-3 text-[19px] text-[#1A1613]">
          {title}
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#B08A57]">
            {latin ? `${pieces.length} · ${latin}` : pieces.length}
          </span>
        </h2>

        {pieces.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((open) => !open)}
            className="h-9 shrink-0 rounded-md border border-[#E2D9CC] bg-[#FBF8F3] px-3.5 text-[11.5px] font-medium text-[#2B241E] transition-colors duration-[320ms] hover:border-[#D3C7B6] hover:bg-[#EFE8DD]"
          >
            {showAll ? 'اعرضي أقل' : 'عرض الكل'}
          </button>
        )}
      </div>

      <div className="relative pt-px">
        {/* الرفّ نفسه */}
        <div className="relative h-px w-full bg-[#B08A57]/45">
          <Bracket side="start" />
          <Bracket side="end" />
        </div>

        {pieces.length === 0 ? (
          <p className="pt-8 text-[12.5px] text-[#A89C8F]">{empty}</p>
        ) : (
          <div className={showAll ? grid : track}>
            {pieces.map((piece) => (
              <div key={piece.id} className={cell}>
                <Piece piece={piece} onSelect={onSelect} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
