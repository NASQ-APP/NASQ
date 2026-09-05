import { Images, LayoutGrid, Plane, Settings, Shirt, Tag, UserRound, Wand2 } from 'lucide-react'
import { ROUTES } from '@/shared/config'
import type { ComponentType } from 'react'

export type NavLinkItem = {
  to: string
  label: string
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
  end?: boolean
  /** لا يُعرض للزائرة — صفحة لا معنى لها بلا حساب */
  needsAccount?: boolean
}

export type NavGroup = {
  label: string
  links: NavLinkItem[]
}

/** خريطة التنقّل — مصدر واحد يقرأ منه الشريط الجانبي والقائمة المنسدلة. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Wardrobe',
    links: [
      { to: ROUTES.home, label: 'الرئيسية', icon: LayoutGrid, end: true },
      { to: ROUTES.wardrobes, label: 'خزائني', icon: Shirt },
      { to: ROUTES.looks, label: 'إطلالاتي', icon: Images },
    ],
  },
  {
    label: 'Styling',
    links: [
      { to: ROUTES.studio, label: 'استوديو التنسيق', icon: Wand2 },
      { to: ROUTES.travel, label: 'السفر', icon: Plane },
      { to: ROUTES.tryPieces, label: 'قطع للتجربة', icon: Tag },
    ],
  },
  {
    label: 'You',
    links: [
      { to: ROUTES.models, label: 'موديلي', icon: UserRound },
      /*
        الإعدادات تُخفى عن الزائرة لا تُحرَس وحدها: القائمة تَعِد بما وراءها،
        ورابطٌ كل ما يفعله أن يقذفها لصفحة دخول هو وعدٌ مكسور. وقاع الشريط
        الجانبي يعرض «تسجيل الدخول» أصلاً، فما ضاع عليها باب.
      */
      { to: ROUTES.settings, label: 'الإعدادات', icon: Settings, needsAccount: true },
    ],
  },
]
