/**
 * هوية التطبيق ونصوصه الثابتة — مكان واحد يمنع تناثر الاسم في الشيفرة.
 */
export const APP = {
  /** الاسم الظاهر في الواجهة */
  name: 'نَسَق',
  /** الاسم المختصر للمساحات الضيقة */
  shortName: 'نَسَق',
  /** التسمية اللاتينية للتسميات الصغيرة والـtitle */
  latin: 'NASAQ',
  tagline: 'من خزانتك، نصنع طَلّتك',
  /** بادئة مفاتيح التخزين المحلي */
  storagePrefix: 'nasaq',
  /** المفاتيح القديمة قبل تغيير الاسم — تُهاجَر مرة واحدة عند أول فتح */
  legacyStoragePrefix: 'dulabi',
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
  welcome: '/welcome',
  models: '/models',
  newModel: '/models/new',
  editModel: (id: string) => `/models/${id}`,
  settings: '/settings',
  privacy: '/privacy',
  /** مقصد «مشاركة» من نظام التشغيل — يطابق `share_target.action` في البيان */
  share: '/share',
  login: '/login',
  signUp: '/signup',
} as const
