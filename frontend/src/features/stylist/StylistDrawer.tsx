/**
 * الستايليست. كل اقتراح مبني على قطع تملكها المستخدمة فعلاً —
 * ولو خزانتك ما تكفي، يقول لك وش الناقص بدل ما يخترع (المبدأ ٢).
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Sparkles } from 'lucide-react'
import { Drawer, Button, toast } from '@/shared/components/ui'
import { ItemImage } from '@/shared/components/media/ItemImage'
import { itemById, useWardrobe } from '@/features/wardrobe/store'
import { useStudio } from '@/features/studio/store'
import { useStyleProfile } from '@/features/try-pieces/taste'
import { QUICK_PROMPTS, suggest, type StylistAnswer } from './suggest'
import { cn, uid } from '@/shared/lib'
import { APP } from '@/shared/config'

type Turn = { id: string; question: string; answer?: StylistAnswer }

export function StylistDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const items = useWardrobe((s) => s.items)
  const studio = useStudio()
  // ذوقها من «إلهامي» يرجّح ألوان الاقتراح — بلا إلهام يبقى السلوك كما هو
  const style = useStyleProfile()
  const navigate = useNavigate()
  const [turns, setTurns] = useState<Turn[]>([])
  const [term, setTerm] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)

  // ننزل لآخر المحادثة مع كل دور جديد، وكذلك لما يظهر مؤشّر التفكير
  useEffect(() => {
    if (thinking || turns.length > 0) bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, thinking])

  const ask = (question: string) => {
    const q = question.trim()
    if (!q || thinking) return
    setTerm('')
    const id = uid('turn')
    setTurns((t) => [...t, { id, question: q }])
    setThinking(true)
    // the delay is the stylist reading the wardrobe, not a fake progress bar
    setTimeout(() => {
      const answer = suggest(q, items, studio.selection, style)
      setTurns((t) => t.map((turn) => (turn.id === id ? { ...turn, answer } : turn)))
      setThinking(false)
    }, 620)
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
            placeholder={`اسألي ${APP.shortName}…`}
            className="h-11 w-full bg-transparent text-[13px] outline-none placeholder:text-faint"
          />
          <Button type="submit" size="sm" disabled={!term.trim() || thinking}>
            <Send size={13} strokeWidth={1.5} />
          </Button>
        </form>
      }
    >
      <div className="flex flex-col gap-6">
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
                            جرّبيها
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
                      <p className="lat text-[9.5px] text-faint">{look.title}</p>
                      <p className="mt-1.5 text-[12px] leading-7 text-muted">{look.reason}</p>
                    </div>
                    <button
                      onClick={() => wearLook(look.itemIds)}
                      className="w-full border-t border-line py-3 text-[12px] transition-colors hover:bg-surface"
                    >
                      جرّبيها على موديلك
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        ))}

        {thinking && (
          <div className="flex gap-1.5 py-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn('h-1.5 w-1.5 animate-pulse rounded-full bg-faint')}
                style={{ animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </div>
        )}
        <div ref={bottom} />
      </div>
    </Drawer>
  )
}
