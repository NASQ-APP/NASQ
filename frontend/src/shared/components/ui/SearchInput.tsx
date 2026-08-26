import { Search, X } from 'lucide-react'
import { cn } from '@/shared/lib'

/** حقل بحث موحّد — الشريط العلوي وشاشات الخزائن تستخدمه كلها. */
export function SearchInput({
  value,
  onChange,
  placeholder = 'ابحثي…',
  className,
  onSubmit,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  onSubmit?: () => void
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit?.()
      }}
      className={cn(
        'flex h-11 items-center gap-3 rounded-md border border-line px-3.5 transition-colors focus-within:border-ink',
        className,
      )}
    >
      <Search size={15} strokeWidth={1.4} aria-hidden className="flex-none text-faint" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-transparent text-[13px] outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="مسح البحث"
          className="flex-none text-faint transition-colors hover:text-ink"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      )}
    </form>
  )
}
