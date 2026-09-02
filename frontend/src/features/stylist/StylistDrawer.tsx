/**
 * الستايليست. كل اقتراح مبني على قطع تملكها المستخدمة فعلاً —
 * ولو خزانتك ما تكفي، يقول لك وش الناقص بدل ما يخترع (المبدأ ٢).
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Sparkles, X } from 'lucide-react'
import { Drawer, Button, toast } from '@/shared/components/ui'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { supabaseStylistIntentProvider } from '@/infrastructure/ai/SupabaseStylistIntentProvider'
import { itemById, useWardrobe } from '@/features/wardrobe/store'
import { useStudio } from '@/features/studio/store'
import { useStyleProfile } from '@/features/try-pieces/taste'
import { QUICK_PROMPTS } from './suggest'
import { type RichAnswer } from './answer'
import { respond } from './respond'
import { EMPTY_SESSION, type StylistSession } from './session/session'
import { useOnboarding } from '@/features/onboarding/store'
import { cn, uid } from '@/shared/lib'
import { APP } from '@/shared/config'
import { useVoice } from '@/features/onboarding/voice'

type Turn = { id: string; question: string; answer?: RichAnswer }

export function StylistDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const say = useVoice()
  const items = useWardrobe((s) => s.items)
  const wardrobes = useWardrobe((s) => s.wardrobes)
  const studio = useStudio()
  // ذوقها من «إلهامي» يرجّح ألوان الاقتراح — بلا إلهام يبقى السلوك كما هو
  const style = useStyleProfile()
  // ما صرّحت به في التعارف — ألوانها وقيودها ومناسباتها، وكانت محفوظة بلا قارئ
  const declared = useOnboarding((state) => state.declared)
  const navigate = useNavigate()
  const [turns, setTurns] = useState<Turn[]>([])
  const [term, setTerm] = useState('')
  const [thinking, setThinking] = useState(false)
  /** ما يجري الآن — يُقال كما هو، بلا نسبة مئوية مخترعة */
  const [stage, setStage] = useState<'understanding' | 'searching'>('understanding')

  /*
    الجلسة تبدأ من اختيار الاستوديو **مرة واحدة** ثم تستقلّ عنه.

    كانت المرساة تُقرأ من `studio.selection` في كل رسالة، وهي حالة محفوظة في
    التخزين — فالقطعة التي فُتح بها الاستوديو تبقى مثبَّتة مهما قالت المستخدمة.
    الآن الاختيار يبدأ المحادثة، وكلامها هو الذي يحكمها بعدها.
  */
  const [session, setSession] = useState<StylistSession>(() => ({
    ...EMPTY_SESSION,
    anchorItemId: studio.selection[0] ?? null,
  }))

  const anchor = items.find((item) => item.id === session.anchorItemId)
  const bottom = useRef<HTMLDivElement>(null)

  // ننزل لآخر المحادثة مع كل دور جديد، وكذلك لما يظهر مؤشّر التفكير
  useEffect(() => {
    if (thinking || turns.length > 0) bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, thinking])

  /*
    الانتظار صار حقيقيًا فسقط التأخير المصطنع.

    كان `setTimeout(620)` يمثّل «المساعدة تقرأ خزانتك»، والقراءة كانت فورية.
    الآن فيه نداء شبكة فعلي لفهم الكلام، فالانتظار يقول ما يجري لا ما نتظاهر به.
  */
  const ask = async (question: string) => {
    const q = question.trim()
    if (!q || thinking) return
    setTerm('')
    const id = uid('turn')
    setTurns((t) => [...t, { id, question: q }])
    setThinking(true)
    setStage('understanding')

    try {
      /*
        المسار: رسالة ← نيّة (نموذج أو محلّي) ← جلسة ← وضع التنسيق ← محرّك.

        الرسالة أولاً لا المرساة — فالأحدث يغلب ما استقرّ قبله.
      */
      const reply = await respond({
        message: q,
        session,
        wardrobe: items,
        closets: wardrobes,
        intentProvider: supabaseStylistIntentProvider,
        declared,
        observed: style,
      })
      setSession(reply.session)
      const answer: RichAnswer = reply.answer
      setTurns((t) => t.map((turn) => (turn.id === id ? { ...turn, answer } : turn)))
    } finally {
      setThinking(false)
      setStage('understanding')
    }
  }

  const wearLook = (itemIds: string[]) => {
    studio.replaceAll(itemIds)
    onClose()
    navigate('/studio')
    toast.ok('جهّزنا الإطلالة في الاستوديو')
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow="Stylist"
      title="مساعدة التنسيق"
      footer={
        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask(term)
          }}
          className="flex items-center gap-2 rounded-md border border-line px-4 focus-within:border-ink"
        >
          <Sparkles size={16} strokeWidth={1.3} className="text-faint" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={`${say('اسألي', 'اسأل')} ${APP.shortName}…`}
            className="h-11 w-full bg-transparent text-[13px] outline-none placeholder:text-faint"
          />
          <Button type="submit" size="sm" disabled={!term.trim() || thinking}>
            <Send size={13} strokeWidth={1.5} />
          </Button>
        </form>
      }
    >
      <div className="flex flex-col gap-6">
        {/*
          المرساة تُرى وتُنزَع.

          حالةٌ خفيّة تحكم كل جواب هي ما جعل العطل محيّرًا: المستخدمة ما كانت
          تعرف أن الفستان مثبَّت، فتقرأ أجوبةً عنه ولا تفهم من أين جاء. وعرضها
          يجعل ما يحكم الجواب مرئيًّا، والزرّ يجعله قابلاً للنقض بلا كلام.
        */}
        {anchor && (
          <div className="flex items-center gap-3 rounded-md border border-line bg-surface p-2.5">
            <ItemImage item={anchor} className="h-[46px] w-[38px] rounded bg-canvas p-1" />
            <div className="min-w-0 flex-1">
              <p className="lat text-[9.5px] text-faint">Styling around</p>
              <p className="mt-0.5 truncate text-[12px]">{anchor.name}</p>
            </div>
            <button
              onClick={() => setSession((current) => ({ ...current, anchorItemId: null }))}
              aria-label="إلغاء تثبيت القطعة"
              className="grid h-7 w-7 flex-none place-items-center rounded-md text-muted transition-colors hover:bg-canvas hover:text-ink"
            >
              <X size={14} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        )}

        {turns.length === 0 && (
          <div>
            <p className="text-[13px] leading-8 text-muted">
              أنا أنسّق من خزانتك أنتِ فقط — ما أقترح شي تشترينه.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => ask(p)}
                  className="rounded-full border border-line px-4 py-2 text-[11.5px] text-muted transition-colors hover:border-line-strong hover:text-ink"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn) => (
          <div key={turn.id} className="flex flex-col gap-4">
            <p className="self-start rounded-md bg-ink px-4 py-2.5 text-[13px] text-white">
              {turn.question}
            </p>

            {turn.answer && (
              <div className="flex flex-col gap-4">
                <p className="text-[13.5px] leading-8">{turn.answer.message}</p>

                {turn.answer.unenforcedNote && (
                  <p className="text-[11.5px] leading-6 text-faint">
                    {turn.answer.unenforcedNote}
                  </p>
                )}

                {turn.answer.gap && (
                  <p className="rounded-md border border-line bg-surface px-4 py-3 text-[12px] leading-7 text-muted">
                    {turn.answer.gap}
                  </p>
                )}

                {turn.answer.pieces.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {turn.answer.pieces.map((id) => {
                      const item = itemById(id)
                      if (!item) return null
                      return (
                        <li
                          key={id}
                          className="flex items-center gap-3 rounded-md border border-line p-2.5 transition-colors hover:border-line-strong"
                        >
                          <ItemImage item={item} className="h-[54px] w-[44px] rounded bg-surface p-1" />
                          <span className="min-w-0 flex-1 truncate text-[12.5px]">{item.name}</span>
                          <Button size="sm" variant="secondary" onClick={() => studio.add(id)}>
                            {say('جرّبيها', 'جرّبها')}
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {turn.answer.looks.map((look) => (
                  <article key={look.title} className="overflow-hidden rounded-md border border-line">
                    <div className="flex gap-3 p-3">
                      {look.itemIds.map((id) => {
                        const item = itemById(id)
                        return item ? (
                          <ItemImage
                            key={id}
                            item={item}
                            className="h-[74px] w-[58px] rounded bg-surface p-1"
                          />
                        ) : null
                      })}
                    </div>
                    <div className="border-t border-line px-4 py-3">
                      <p className="text-[12.5px]">{look.title}</p>

                      {/*
                        اللوحة تُعرض دوائر لا نصًّا: اللون يُرى ولا يُقرأ، وثلاث
                        دوائر تقول ما تقوله فقرة كاملة عن التناسق.
                      */}
                      {look.palette && (
                        <div className="mt-2.5 flex items-center gap-2">
                          {[look.palette.dominant, look.palette.secondary, look.palette.accent]
                            .filter((hex): hex is string => Boolean(hex))
                            .map((hex) => (
                              <span
                                key={hex}
                                className="h-3.5 w-3.5 rounded-full border border-line"
                                style={{ background: hex }}
                                aria-hidden
                              />
                            ))}
                          <span className="lat text-[9.5px] text-faint">
                            {look.palette.names.join(' · ')}
                          </span>
                        </div>
                      )}

                      <p className="mt-2.5 text-[12px] leading-7 text-muted">{look.reason}</p>

                      {look.gapNote && (
                        <p className="mt-2 text-[11.5px] leading-6 text-faint">{look.gapNote}</p>
                      )}
                    </div>
                    <button
                      onClick={() => wearLook(look.itemIds)}
                      className="w-full border-t border-line py-3 text-[12px] transition-colors hover:bg-surface"
                    >
                      {say('جرّبيها على موديلك', 'جرّبها على موديلك')}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        ))}

        {thinking && (
          <div className="flex items-center gap-3 py-1" role="status" aria-live="polite">
            <span className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={cn('h-1.5 w-1.5 animate-pulse rounded-full bg-faint')}
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </span>
            {/* ما يجري يُقال بكلمة — لا نسبة ولا شريط يمتلئ بلا قياس */}
            <span className="text-[11.5px] text-faint">
              {stage === 'understanding' ? 'أفهم طلبك…' : 'أدوّر في خزانتك…'}
            </span>
          </div>
        )}
        <div ref={bottom} />
      </div>
    </Drawer>
  )
}
