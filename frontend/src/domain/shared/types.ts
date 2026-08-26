/** أنواع مشتركة بين كل مجالات التطبيق. */

export type Gender = 'male' | 'female'

/** المنطقة التي تشغلها القطعة من الجسم — تحكم الطبقات وزاوية الكاميرا. */
export type BodySlot =
  | 'top'
  | 'bottom'
  /** فستان · عباية · ثوب — يغطي الجذع والساقين معًا */
  | 'full'
  | 'outer'
  | 'shoes'
  | 'bag'
  | 'accessory'
