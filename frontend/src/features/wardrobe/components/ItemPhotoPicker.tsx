/**
 * زر تغيير صورة قطعة موجودة.
 *
 * نفس مسار الإضافة: الصورة تُقصّ وتُصغّر في المتصفح ثم تُخزّن في IndexedDB
 * مربوطة بمعرّف القطعة، فتظهر فورًا في كل الشاشات.
 */
import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { toast } from '@/shared/components/ui'
import { ACCEPTED_PHOTO_TYPES, MAX_PHOTO_MB, preparePhoto } from '@/infrastructure/rendering'
import { useItemPhotos } from '../photos'
import { cn } from '@/shared/lib'

export function ItemPhotoPicker({ itemId, className }: { itemId: string; className?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const setPhoto = useItemPhotos((state) => state.set)
  const hasPhoto = useItemPhotos((state) => Boolean(state.urls[itemId]))
  const [busy, setBusy] = useState(false)

  const onFile = async (file?: File) => {
    if (!file) return
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      toast.error('حجم الصورة أكبر من ' + MAX_PHOTO_MB + ' ميجا.')
      return
    }
    setBusy(true)
    try {
      const prepared = await preparePhoto(file)
      await setPhoto(itemId, prepared.blob)
      toast.ok('حدّثنا صورة القطعة')
    } catch {
      toast.error('ما قدرنا نفتح هذي الصورة. جرّبي JPG أو PNG.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_PHOTO_TYPES}
        onChange={(event) => {
          void onFile(event.target.files?.[0])
          event.target.value = ''
        }}
        className="hidden"
      />
      <button
        onClick={() => input.current?.click()}
        disabled={busy}
        className={cn(
          'flex items-center gap-2 rounded-md border border-line bg-canvas/90 px-3 py-2 text-[11.5px]',
          'backdrop-blur-sm transition-colors duration-[320ms] ease-soft hover:border-line-strong disabled:opacity-50',
          className,
        )}
      >
        <Camera size={13} strokeWidth={1.5} aria-hidden />
        {busy ? 'نجهّز…' : hasPhoto ? 'غيّري الصورة' : 'صوّري القطعة'}
      </button>
    </>
  )
}
