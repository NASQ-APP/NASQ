/**
 * رفّ «قطع تحت التجربة».
 *
 * القطع **معلّقة على رفّ**، مب موضوعة في مربّعات: خيط أفقي بحاملين، وفوق كل
 * قطعة علّاقة صغيرة توصلها بالرفّ. الفرق عن `ItemGrid` مقصود — قطع التجربة
 * مؤقتة ومعلّقة، ما هي مستقرّة في خزانة.
 *
 * الشريط الأفقي هو الافتراضي، و«عرض الكل» يفرد القطع في شبكة.
 */
import { useState } from 'react'
import { cn } from '@/shared/lib'

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

/** العلّاقة: سلك صغير وحلقة — تربط القطعة بالرفّ فوقها. */
function Hook() {
  return (
    <span aria-hidden className="relative z-10 -mt-px flex flex-col items-center">
      <span className="h-4 w-px bg-line-strong" />
      <span className="h-1.5 w-1.5 rounded-full border border-line-strong" />
    </span>
  )
}

/** حامل الرفّ عند الطرف. */
function Bracket({ side }: { side: 'start' | 'end' }) {
  return (
    <span
      aria-hidden
      className={cn('absolute top-0 h-5 w-px bg-line-strong', side === 'start' ? 'start-0' : 'end-0')}
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
        className={cn(
          'relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-surface',
          'transition-[transform,box-shadow] duration-[420ms] ease-soft',
          'group-hover:-translate-y-1 group-hover:shadow-[0_20px_38px_-24px_rgba(10,10,10,0.45)]',
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
          <span className="absolute inset-0 grid place-items-center text-[11px] text-faint">
            بلا صورة
          </span>
        )}

        {piece.badge && (
          <span className="lat absolute end-2 top-2 text-[8px] uppercase tracking-[0.18em] text-faint">
            {piece.badge}
          </span>
        )}
      </div>

      {/* خيط ينفتح تحت القطعة عند المرور */}
      <span
        aria-hidden
        className="mt-2.5 h-px w-0 self-start bg-ink transition-[width] duration-[420ms] ease-soft group-hover:w-full"
      />

      <div className="mt-2 w-full">
        <p className="line-clamp-2 text-[12px] leading-6 text-ink">{piece.name}</p>
        {piece.meta && <p className="mt-1 text-[10.5px] text-faint">{piece.meta}</p>}
      </div>
    </article>
  )
}

export function TryPiecesRail({
  pieces,
  empty = 'الرفّ فاضي.',
  onSelect,
  className,
}: {
  pieces: RailPiece[]
  empty?: string
  /** يُنادى عند الضغط على قطعة — اختياري */
  onSelect?: (id: string) => void
  className?: string
}) {
  const [showAll, setShowAll] = useState(false)

  /* `overflow-x` يقصّ رأسيًا كمان، والبطاقة ترتفع ولها ظل — فالحشوة ضرورية. */
  const track =
    'flex gap-5 overflow-x-auto overscroll-x-contain pb-4 pt-1 md:gap-7 snap-x snap-mandatory [scrollbar-width:thin]'
  const grid = 'grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-4 md:gap-x-7 xl:grid-cols-6'
  const cell = showAll ? undefined : 'w-[46%] flex-none snap-start sm:w-[200px] xl:w-[220px]'

  return (
    <section className={className}>
      {pieces.length > 0 && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setShowAll((open) => !open)}
            className="h-9 shrink-0 rounded-md border border-line bg-surface px-3.5 text-[11.5px] transition-colors duration-[320ms] hover:border-line-strong hover:bg-surface-warm"
          >
            {showAll ? 'اعرضي أقل' : 'عرض الكل'}
          </button>
        </div>
      )}

      <div className="relative pt-px">
        {/* الرفّ نفسه */}
        <div className="relative h-px w-full bg-line-strong">
          <Bracket side="start" />
          <Bracket side="end" />
        </div>

        {pieces.length === 0 ? (
          <p className="pt-8 text-[12.5px] text-faint">{empty}</p>
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
