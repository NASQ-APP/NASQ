/**
 * تسجيل الدخول.
 *
 * الموقع يُتصفَّح بلا حساب، فمن تصل هنا وصلت **بنيّة**: إما فعلٌ أوقفناه
 * (`SignInPrompt`)، أو صفحة لا تُفتح بلا صاحب (`RequireAuth`). وفي الحالتين
 * لها وجهة تنتظرها.
 */
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { Compartment, WardrobeFrame, shelfField } from '@/features/auth/components/WardrobeFrame'
import { useAuth } from '@/features/auth/store'
import { Button, TextInput, toast } from '@/shared/components/ui'
import { PasswordInput } from '@/shared/components/ui/PasswordInput'
import { signInSchema, type SignInValues } from '@/domain/auth'
import { ROUTES } from '@/shared/config'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
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

  /*
    ترجع للصفحة التي كانت عليها — لأنها ما جات تسجّل دخولاً، جات تكمل شيئًا.

    كانت الوجهة الرئيسية دائمًا، وكان ذلك صحيحًا يوم كان الحارس يطرد الناس من كل
    صفحة: العودة لصفحة طُردتِ منها تخلط جلسة بجلسة. أما الآن فالتصفّح مفتوح،
    والدخول لا يُطلب إلا عند فعل بعينه — «أضيفي قطعة» من الاستوديو مثلاً — فرمي
    صاحبته في الرئيسية يجعلها تعيد المشوار من أوله.

    والمعاملات تُحفظ مع المسار: `/share?url=…` تحمل القطعة في معاملها، فإسقاطها
    يعني إن اللي ضغطت رابط قطعة تلقى صفحة تقول «ما وصلنا رابط».

    وشرط الشرطة الواحدة يقصر القبول على مسارنا: `//evil.com` رابط خارجي في ثوب
    مسار داخلي، فبدونه يصير الحقل تحويلاً مفتوحًا يقذف من يسجّل دخوله لموقع غريب.
  */
  const from = (location.state as { from?: string } | null)?.from
  const internal = from?.startsWith('/') && !from.startsWith('//')
  const destination = internal ? (from as string) : ROUTES.home

  const onSubmit = handleSubmit(async (values) => {
    const failure = await signIn(values)
    if (failure) {
      toast.error(failure.message)
      return
    }
    toast.ok('أهلًا برجوعك')
    navigate(destination, { replace: true })
  })

  return (
    <AuthLayout
      eyebrow="Log in"
      title="أهلًا برجوعك"
      description="الدخول يرجّعك لدولابك."
      footer={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          ما عندك حساب؟
          <Link to={ROUTES.signUp} className="text-ink underline-offset-4 hover:underline">
            إنشاء حساب
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

      </form>
    </AuthLayout>
  )
}
