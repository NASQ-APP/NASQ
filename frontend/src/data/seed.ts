/**
 * خزائن البداية.
 *
 * التطبيق يبدأ **بلا قطع**: خمس خزائن فاضية جاهزة للترتيب، والقطع تدخل لما
 * تصوّرها المستخدمة بنفسها. ما نحشو خزانتها بقطع ما تملكها — الخزانة اللي
 * تشوفينها هي خزانتك أنتِ (المبدأ ١).
 *
 * الخزائن نفسها تبقى لأنها تنظيم مو ملابس، وحذفها من الإعدادات متاح.
 */
import type { Wardrobe, WardrobeItem } from '@/domain/wardrobe/types'

const now = '2026-08-01T09:00:00.000Z'

export const SEED_WARDROBES: Wardrobe[] = [
  { id: 'w-summer', name: 'الصيف', nameLatin: 'Summer', createdAt: now, updatedAt: now },
  { id: 'w-winter', name: 'الشتاء', nameLatin: 'Winter', createdAt: now, updatedAt: now },
  { id: 'w-work', name: 'العمل والجامعة', nameLatin: 'Work', createdAt: now, updatedAt: now },
  { id: 'w-events', name: 'المناسبات', nameLatin: 'Occasions', createdAt: now, updatedAt: now },
  { id: 'w-travel', name: 'السفر', nameLatin: 'Travel', createdAt: now, updatedAt: now },
]

export const SEED_ITEMS: WardrobeItem[] = []
