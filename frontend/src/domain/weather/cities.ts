/** مدن جاهزة بإحداثياتها. المستخدمة تختار مدينتها مرة وتُحفظ. */
import type { City } from './types'

export const CITIES: City[] = [
  { id: 'riyadh', name: 'الرياض', nameLatin: 'Riyadh', latitude: 24.7136, longitude: 46.6753 },
  { id: 'jeddah', name: 'جدة', nameLatin: 'Jeddah', latitude: 21.4858, longitude: 39.1925 },
  { id: 'makkah', name: 'مكة المكرمة', nameLatin: 'Makkah', latitude: 21.3891, longitude: 39.8579 },
  { id: 'madinah', name: 'المدينة المنورة', nameLatin: 'Madinah', latitude: 24.5247, longitude: 39.5692 },
  { id: 'dammam', name: 'الدمام', nameLatin: 'Dammam', latitude: 26.4207, longitude: 50.0888 },
  { id: 'khobar', name: 'الخبر', nameLatin: 'Khobar', latitude: 26.2794, longitude: 50.208 },
  { id: 'ahsa', name: 'الأحساء', nameLatin: 'Al Ahsa', latitude: 25.3833, longitude: 49.5833 },
  { id: 'buraydah', name: 'بريدة', nameLatin: 'Buraydah', latitude: 26.326, longitude: 43.975 },
  { id: 'hail', name: 'حائل', nameLatin: 'Hail', latitude: 27.5219, longitude: 41.6907 },
  { id: 'tabuk', name: 'تبوك', nameLatin: 'Tabuk', latitude: 28.3835, longitude: 36.5662 },
  { id: 'abha', name: 'أبها', nameLatin: 'Abha', latitude: 18.2164, longitude: 42.5053 },
  { id: 'taif', name: 'الطائف', nameLatin: 'Taif', latitude: 21.2854, longitude: 40.4183 },
  { id: 'jazan', name: 'جازان', nameLatin: 'Jazan', latitude: 16.8892, longitude: 42.5706 },
  { id: 'najran', name: 'نجران', nameLatin: 'Najran', latitude: 17.4917, longitude: 44.1322 },
  { id: 'neom', name: 'نيوم', nameLatin: 'NEOM', latitude: 27.9654, longitude: 35.4917 },
]

export const DEFAULT_CITY_ID = 'riyadh'

export const cityById = (id: string): City =>
  CITIES.find((city) => city.id === id) ?? CITIES[0]
