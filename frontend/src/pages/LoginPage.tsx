/**
 * تسجيل الدخول.
 *
 * مثل صفحة الإنشاء: الحساب اختياري، والمستخدمة تقدر تدخل دولابها بدونه.
 */
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { Compartment, WardrobeFrame, shelfField } from '@/features/auth/components/WardrobeFrame'
import { useAuth } from '@/features/auth/store'
import { Button, TextInput, toast } from '@/shared/components/ui'
import { PasswordInput } from '@/shared/components/ui/PasswordInput'
import { signInSchema, type SignInValues } from '@/domain/auth'
import { ROUTES } from '@/shared/config'

export function LoginPage() {
  const navigate = useNavigate()
  const signIn = useAuth((state) => state.signIn)
  const busy = useAuth((state) => state.busy)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    const failure = await signIn(values)
    if (failure) {
      toast.error(failure.message)
      return
    }
    toast.ok('أهلًا برجوعك')
    navigate(ROUTES.home)
  })

  return (
    <AuthLayout
      eyebrow="Log in"
      title="أهلًا برجوعك"
      description="سجّلي دخولك وارجعي لدولابك."
      footer={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          ما عندك حساب؟
          <Link to={ROUTES.signUp} className="text-ink underline-offset-4 hover:underline">
            أنشئي واحدًا
          </Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <WardrobeFrame>
          <Compartment
            label="البريد الإلكتروني"
            shelfLabel="رفّ الإيميل"
            error={errors.email?.message}
          >
            <TextInput
              autoFocus
              type="email"
              inputMode="email"
              autoComplete="email"
              dir="ltr"
              className={`${shelfField} text-left`}
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
            />
          </Compartment>

          <Compartment
            label="كلمة المرور"
            shelfLabel="رفّ كلمة المرور"
            error={errors.password?.message}
            last
          >
            <PasswordInput
              autoComplete="current-password"
              dir="ltr"
              className={`${shelfField} pl-11! text-left`}
              placeholder="••••••••"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
          </Compartment>
        </WardrobeFrame>

        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? 'ندخّلك…' : 'تسجيل الدخول'}
        </Button>

        <Link
          to={ROUTES.home}
          className="inline-flex items-center gap-1.5 self-start text-[12px] text-muted transition-colors hover:text-ink"
        >
          أكمل بدون حساب
          <ArrowLeft size={13} strokeWidth={1.6} aria-hidden />
        </Link>
      </form>
    </AuthLayout>
  )
}
