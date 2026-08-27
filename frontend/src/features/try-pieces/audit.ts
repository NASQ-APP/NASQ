/**
 * فحص القطع المستوردة قبل هذي الميزة.
 *
 * القطع القديمة ما عندها نتيجة فحص، فما نعرف هل صورتها عليها عارضة. نفحصها
 * مرة وحدة عند فتح صفحة قطع التجربة، ونحفظ النتيجة — فما تتكرر.
 *
 * ما نلمس قطعة اختارت المستخدمة صورتها بنفسها: قرارها يسبق الفحص.
 */
import { useEffect } from 'react'
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

  useEffect(() => {
    const pending = items.filter(needsAudit)
    if (pending.length === 0) return

    let cancelled = false
    void (async () => {
      for (const item of pending) {
        const images = item.images?.length ? item.images : [item.imageUrl as string]
        const picked = await pickBestImage(images)
        if (cancelled) return
        updateItem(item.id, {
          imageUrl: picked.best ?? item.imageUrl,
          imageHasModel: !picked.foundProductOnly,
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [items, updateItem])
}
