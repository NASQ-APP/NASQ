/**
 * تغيير صورة قطعة موجودة.
 *
 * يفتح مودالاً فيه `ImageUploader` بإزالة خلفية مفعّلة — نفس مسار الإضافة
 * بالضبط، بلا تكرار منطق المعالجة هنا.
 */
import { useState } from 'react'
import { Camera } from 'lucide-react'
import { ImageUploader } from '@/shared/components/media/ImageUploader'
import { Modal, toast } from '@/shared/components/ui'
import { prepareForStorage } from '@/infrastructure/images'
import { useItemPhotos } from '../photos'
import { useVoice } from '@/features/onboarding/voice'
import { cn } from '@/shared/lib'
import type { ImageCandidate } from '@/domain/images'

export function ItemPhotoPicker({ itemId, className }: { itemId: string; className?: string }) {
  const say = useVoice()
  const [open, setOpen] = useState(false)
  const setPhoto = useItemPhotos((state) => state.set)
  const hasPhoto = useItemPhotos((state) => Boolean(state.urls[itemId]))

  const save = async (candidate: ImageCandidate) => {
    try {
      const stored = await prepareForStorage(candidate.blob)
      await setPhoto(itemId, stored.blob)
      toast.ok('حدّثنا صورة القطعة')
      setOpen(false)
    } catch {
      toast.error(say('تعذّر حفظ الصورة. حاولي مرة أخرى.', 'تعذّر حفظ الصورة. حاول مرة أخرى.'))
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-2 rounded-md border border-line bg-canvas/90 px-3 py-2 text-[11.5px]',
          'backdrop-blur-sm transition-colors duration-[320ms] ease-soft hover:border-line-strong',
          className,
        )}
      >
        <Camera size={13} strokeWidth={1.5} aria-hidden />
        {hasPhoto ? say('غيّري الصورة', 'غيّر الصورة') : say('صوّري القطعة', 'صوّر القطعة')}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Photo"
        title="صورة القطعة"
        width="md"
      >
        <ImageUploader
          confirmLabel={say('احفظي الصورة', 'احفظ الصورة')}
          onConfirm={save}
          onCancel={() => setOpen(false)}
          onError={(error) => toast.error(error.message)}
        />
      </Modal>
    </>
  )
}
