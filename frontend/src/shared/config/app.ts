/**
 * هوية التطبيق ونصوصه الثابتة — مكان واحد يمنع تناثر الاسم في الشيفرة.
 */
export const APP = {
  /** الاسم الظاهر في الواجهة */
  name: 'دولابي الذكي',
  /** الاسم المختصر للمساحات الضيقة */
  shortName: 'دولابي',
  /** التسمية اللاتينية للتسميات الصغيرة والـtitle */
  latin: 'Dulabi',
  tagline: 'خزانتك الرقمية — شوفي القطعة عليكِ قبل ما تلبسينها',
  /** بادئة مفاتيح التخزين المحلي */
  storagePrefix: 'dulabi',
  /** المفاتيح القديمة قبل تغيير الاسم — تُهاجَر مرة واحدة عند أول فتح */
  legacyStoragePrefix: 'kiswa',
} as const

/** مسارات التطبيق — تُقرأ من الراوتر والروابط معًا، فما ينكسر رابط بصمت. */
export const ROUTES = {
  home: '/',
  wardrobes: '/wardrobes',
  wardrobe: (id: string) => `/wardrobe/${id}`,
  item: (id: string) => `/item/${id}`,
  studio: '/studio',
  looks: '/looks',
  travel: '/travel',
  trip: (id: string) => `/travel/${id}`,
  tryPieces: '/try',
  inspiration: '/inspiration',
  models: '/models',
  newModel: '/models/new',
  editModel: (id: string) => `/models/${id}`,
  settings: '/settings',
  privacy: '/privacy',
  login: '/login',
  signUp: '/signup',
} as const
