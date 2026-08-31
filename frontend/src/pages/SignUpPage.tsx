/**
 * إنشاء حساب.
 *
 * الحساب طبقة فوق التطبيق مو بوّابة أمامه — تقدر المستخدمة تتخطّاه وتدخل
 * دولابها مباشرة. والصفحة تصرّح بما يفعله الحساب فعلاً في هذي المرحلة بدل
 * ما توهم بمزامنة غير موجودة (المبدأ ٤).
 */
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Info } from 'lucide-react'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { Compartment, WardrobeFrame, shelfField } from '@/features/auth/components/WardrobeFrame'
import { useAuth, syncsAcrossDevices } from '@/features/auth/store'
import { Button, TextInput, toast } from '@/shared/components/ui'
import { PasswordInput, PasswordMeter } from '@/shared/components/ui/PasswordInput'
import { passwordStrength, signUpSchema, type SignUpValues } from '@/domain/auth'
import { ROUTES } from '@/shared/config'

export function SignUpPage() {
  const navigate = useNavigate()
  const signUp = useAuth((state) => state.signUp)
  const busy = useAuth((state) => state.busy)

  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '' },
  })

  // useWatch اشتراكي — watch() يرجّع دالة جديدة كل رسم فتتعطّل الذاكرة المؤقتة
  const password = useWatch({ control, name: 'password' })
  const strength = passwordStrength(password ?? '')

  const onSubmit = handleSubmit(async (values) => {
    const failure = await signUp(values)
    if (failure) {
      // خطأ البريد يُعرض تحت حقله؛ الباقي تنبيه عام
      if (failure.code === 'email-taken') setError('email', { message: failure.message })
      else toast.error(failure.message)
      return
    }
    toast.ok('أهلًا فيك — جهّزنا دولابك')
    navigate(ROUTES.welcome)
  })

  return (
    <AuthLayout
      eyebrow="Create account"
      title="أنشئي حسابك"
      description="اسمك وبريدك، وتبدئين تصوّرين قطعك."
      footer={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          عندك حساب؟
          <Link to={ROUTES.login} className="text-ink underline-offset-4 hover:underline">
            سجّلي دخولك
          </Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <WardrobeFrame>
          <Compartment label="الاسم" shelfLabel="رفّ الاسم" error={errors.name?.message}>
            <TextInput
              autoFocus
              autoComplete="name"
              className={shelfField}
              placeholder="روان"
              aria-invalid={Boolean(errors.name)}
              {...register('name')}
            />
          </Compartment>

          <Compartment
            label="البريد الإلكتروني"
            shelfLabel="رفّ الإيميل"
            error={errors.email?.message}
          >
            <TextInput
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
              autoComplete="new-password"
              dir="ltr"
              className={`${shelfField} pl-11! text-left`}
              placeholder="••••••••"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
            <span className="mt-3 block">
              <PasswordMeter score={strength.score} label={strength.label} />
            </span>
          </Compartment>
        </WardrobeFrame>

        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? 'ننشئ حسابك…' : 'أنشئي الحساب'}
        </Button>

        {!syncsAcrossDevices && (
          <p className="flex items-start gap-2.5 rounded-md border border-line bg-surface px-4 py-3 text-[11.5px] leading-6 text-muted">
            <Info size={13} strokeWidth={1.5} aria-hidden className="mt-1 flex-none text-faint" />
            في هذي النسخة الحساب يميّز دولابك على هذا الجهاز فقط — خزانتك وصورك
            تبقى في متصفّحك. المزامنة بين الأجهزة تجي مع الخادم.
          </p>
        )}

      </form>
    </AuthLayout>
  )
}
