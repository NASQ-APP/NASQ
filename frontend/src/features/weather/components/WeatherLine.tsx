/**
 * سطر الجو تحت تاريخ اليوم.
 *
 * سطر واحد لا بطاقة: الجو سياق للقرار مو موضوع الصفحة. يعرض الدرجة والحالة
 * والمدينة، ومعها **ما يعنيه ذلك للّبس** — لأن «٣٧°» رقم، و«حار — قطن وكتان»
 * قرار.
 *
 * الأيقونات خطّية بلون النص، بلا ألوان طقس ولا إيموجي.
 */
import { useState } from 'react'
import {
  CloudDrizzle,
  CloudFog,
  CloudRain,
  CloudSnow,
  Cloud,
  Cloudy,
  MapPin,
  RefreshCw,
  Sun,
  Zap,
} from 'lucide-react'
import { CITIES, CONDITION_LABEL } from '@/domain/weather'
import { useWeather } from '../useWeather'
import { useWeatherCity } from '../store'
import { cn } from '@/shared/lib'
import type { LucideIcon } from 'lucide-react'
import type { WeatherCondition } from '@/domain/weather'

const ICONS: Record<WeatherCondition, LucideIcon> = {
  clear: Sun,
  cloudy: Cloud,
  overcast: Cloudy,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  thunder: Zap,
}

export function WeatherLine({ className }: { className?: string }) {
  const { city, now, brief, loading, error, disabled, refresh } = useWeather()
  const setCity = useWeatherCity((state) => state.setCity)
  const [picking, setPicking] = useState(false)

  if (disabled) return null

  const Icon = now ? ICONS[now.condition] : Cloud

  return (
    <div className={cn('mt-3 flex flex-wrap items-center gap-x-3 gap-y-2', className)}>
      {/* ---------------- القراءة ---------------- */}
      {loading ? (
        <span className="h-4 w-40 animate-pulse rounded-sm bg-surface" aria-label="نجيب حالة الجو" />
      ) : now ? (
        <span className="flex items-center gap-2 text-[12.5px]">
          <Icon size={15} strokeWidth={1.4} aria-hidden className="text-muted" />
          <span className="lat">{Math.round(now.temperature)}°</span>
          <span className="text-muted">{CONDITION_LABEL[now.condition]}</span>
          <span className="text-faint">
            · الصغرى <span className="lat">{Math.round(now.low)}°</span> والعظمى{' '}
            <span className="lat">{Math.round(now.high)}°</span>
          </span>
        </span>
      ) : (
        <span className="flex items-center gap-2 text-[12px] text-faint">
          {error ?? 'ما وصلنا لخدمة الطقس.'}
          <button
            onClick={refresh}
            className="flex items-center gap-1 text-muted transition-colors hover:text-ink"
          >
            <RefreshCw size={11} strokeWidth={1.5} aria-hidden />
            إعادة المحاولة
          </button>
        </span>
      )}

      {/* ---------------- المدينة ---------------- */}
      <span className="relative">
        <button
          onClick={() => setPicking((open) => !open)}
          aria-expanded={picking}
          aria-label={`المدينة: ${city.name} — تغيير`}
          className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-line-strong hover:text-ink"
        >
          <MapPin size={11} strokeWidth={1.5} aria-hidden />
          {city.name}
        </button>

        {picking && (
          <>
            {/* نقرة خارج القائمة تغلقها بلا حبس التمرير — القائمة صغيرة */}
            <span
              className="fixed inset-0 z-10"
              aria-hidden
              onClick={() => setPicking(false)}
            />
            <ul
              className="absolute top-8 z-20 max-h-[240px] w-[180px] overflow-y-auto rounded-md border border-line bg-canvas py-1"
              style={{ insetInlineStart: 0 }}
            >
              {CITIES.map((option) => (
                <li key={option.id}>
                  <button
                    onClick={() => {
                      setCity(option.id)
                      setPicking(false)
                    }}
                    aria-pressed={option.id === city.id}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-right text-[12px] transition-colors hover:bg-surface',
                      option.id === city.id ? 'text-ink' : 'text-muted',
                    )}
                  >
                    {option.name}
                    <span className="lat text-[9.5px] text-faint">{option.nameLatin}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </span>

      {/* ---------------- ما يعنيه للّبس ---------------- */}
      {brief && (
        <span className="w-full text-[11.5px] leading-6 text-faint sm:w-auto">
          {brief.headline}
          {brief.notes.length > 0 && ` · ${brief.notes[0]}`}
        </span>
      )}
    </div>
  )
}
