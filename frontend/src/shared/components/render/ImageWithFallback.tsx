/**
 * صورة لا تنكسر ولا تُقفز التخطيط.
 *
 * ثلاث حالات: هيكل أثناء التحميل، وظهور متدرّج عند الوصول، وبديل هادئ عند
 * الفشل. وأيقونة الصورة المكسورة في المتصفّح تُفسد صفحة أزياء كاملة.
 *
 * **المساحة محجوزة قبل الوصول**: الغلاف يأخذ نسبة ثابتة، فالصورة تحلّ محلّ
 * الهيكل بلا أن يزحف ما تحتها — وهذا ما يجعل الشبكة تبدو ثابتة لا مرتجفة.
 */
import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/shared/lib'

export function ImageWithFallback({
  src,
  alt,
  className,
  imageClassName,
  fallback,
  loading = 'lazy',
}: {
  src?: string
  alt: string
  /** يُطبَّق على الغلاف — ضعي فيه النسبة والاستدارة */
  className?: string
  imageClassName?: string
  /** بديل خاص بالسياق (كتلة لون القطعة مثلاً) بدل البديل العام */
  fallback?: React.ReactNode
  loading?: 'lazy' | 'eager'
}) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>(
    src ? 'loading' : 'failed',
  )

  const showFallback = !src || state === 'failed'

  return (
    <span className={cn('relative block overflow-hidden', className)}>
      {state === 'loading' && <span className="skeleton absolute inset-0" aria-hidden />}

      {showFallback
        ? (fallback ?? (
            <span className="absolute inset-0 grid place-items-center bg-surface text-faint">
              <ImageOff size={18} strokeWidth={1.2} aria-hidden />
              <span className="sr-only">تعذّر تحميل الصورة.</span>
            </span>
          ))
        : (
            <img
              src={src}
              alt={alt}
              loading={loading}
              onLoad={() => setState('ready')}
              onError={() => setState('failed')}
              className={cn(
                'h-full w-full object-contain transition-opacity duration-200 ease-soft',
                state === 'ready' ? 'opacity-100' : 'opacity-0',
                imageClassName,
              )}
            />
          )}
    </span>
  )
}
