/**
 * فحص القطع المستوردة قبل هذي الميزة.
 *
 * القطع القديمة ما عندها نتيجة فحص، فما نعرف هل صورتها عليها عارضة. نفحصها
 * مرة وحدة عند فتح صفحة قطع التجربة، ونحفظ النتيجة — فما تتكرر.
 *
 * ما نلمس قطعة اختارت المستخدمة صورتها بنفسها: قرارها يسبق الفحص.
 */
import { useEffect, useRef } from 'react'
import { useWardrobe } from '@/features/wardrobe/store'
import { pickBestImage } from './pick-image'
import type { WardrobeItem } from '@/domain/wardrobe'

const needsAudit = (item: WardrobeItem): boolean =>
  item.source === 'try' &&
  Boolean(item.imageUrl) &&
  !item.imageChosenByUser &&
  item.imageHasModel === undefined

export function useImportedImageAudit(): void {
  const items = useWardrobe((s) => s.items)
  const updateItem = useWardrobe((s) => s.updateItem)

  /*
   * القراءة قد تفشل، وحينها يبقى الوسم `undefined` — و`needsAudit` يبقى صحيحًا.
   * بلا هذا السجل يدور الأثر بلا نهاية: كل محاولة تحدّث القطعة، والتحديث يغيّر
   * `items` فيشغّل الأثر من جديد. نحاول مرة واحدة لكل قطعة في الجلسة، وتُعاد
   * المحاولة في جلسة قادمة عسى الوسيط يكون شغّالًا فيها.
   */
  const attempted = useRef(new Set<string>())

  useEffect(() => {
    const pending = items.filter((item) => needsAudit(item) && !attempted.current.has(item.id))
    if (pending.length === 0) return

    let cancelled = false
    void (async () => {
      for (const item of pending) {
        attempted.current.add(item.id)
        const images = item.images?.length ? item.images : [item.imageUrl as string]
        const picked = await pickBestImage(images)
        if (cancelled) return
        updateItem(item.id, {
          imageUrl: picked.best ?? item.imageUrl,
          imageHasModel: picked.readable ? !picked.foundProductOnly : undefined,
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [items, updateItem])
}
