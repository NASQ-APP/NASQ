/**
 * جسر الإضافة + سؤال الفئة.
 *
 * أغلب المتاجر تنشر ما يكفي لنعرف فئة القطعة من اسمها. **بنترست لا**: اسم
 * الـPin تعليق غالبًا («outfit inspo») مب اسم منتج، فالتخمين منه يسقط على
 * أول فئة في القائمة بلا سبب.
 *
 * فبدل ما نخمّن، نسأل: القطعة تنتظر هنا، والمستخدمة تختار فئتها قبل ما تدخل
 * «قطع تحت التجربة». وتقدر تتجاهلها — وقتها ما نحفظ منها شيئًا.
 */
import { useState } from 'react'
import { Button, Modal, Select } from '@/shared/components/ui'
import { CATEGORIES } from '@/domain/wardrobe'
import { useOnboarding } from '@/features/onboarding/store'
import { useStoreBridge } from './bridge'

export function StoreBridge() {
  const { pending, waiting, choose, dismiss } = useStoreBridge()

  /* نعرض فئات جنسها كما اختارته في التعارف — وبلا اختيار نعرض الكل. */
  const gender = useOnboarding((state) => state.declared.gender)
  const options = gender ? CATEGORIES.filter((c) => c.gender === gender) : CATEGORIES

  const [categoryId, setCategoryId] = useState('')
  const selected = categoryId || options[0]?.id || ''

  if (!pending) return null

  return (
    <Modal
      open
      onClose={dismiss}
      eyebrow="Pinterest"
      title="وش نوع هذي القطعة؟"
      footer={
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              choose(selected)
              setCategoryId('')
            }}
          >
            أضيفيها
          </Button>
          <button
            onClick={dismiss}
            className="text-[11.5px] text-faint transition-colors hover:text-ink"
          >
            تجاهليها
          </button>
          {waiting > 1 && (
            <span className="lat me-0 ms-auto text-[9.5px] text-faint">
              {waiting - 1} more
            </span>
          )}
        </div>
      }
    >
      <div className="flex items-start gap-4">
        {pending.product.imageUrl && (
          <img
            src={pending.product.imageUrl}
            alt=""
            className="h-28 w-20 flex-none rounded-md object-cover"
          />
        )}

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[12.5px] leading-6">{pending.product.name}</p>
          <p className="mt-1 text-[11px] leading-6 text-muted">
            بنترست ما تعطينا نوع القطعة، فما نخمّنه — اختاريه أنتِ.
          </p>

          <Select
            value={selected}
            onChange={(event) => setCategoryId(event.target.value)}
            className="mt-3"
          >
            {options.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </Modal>
  )
}
