/**
 * النافذة التي تشرح لماذا وقف الفعل.
 *
 * تُعرض حين تمدّ زائرة يدها لفعلٍ يُكتب. تقول السبب بعينه («عشان تضيفين قطعة
 * لخزانتك») لأن الفعل هو ما بدأته، لا تسجيل الدخول — والزائرة التي تُقذف لصفحة
 * دخول بلا سياق تسأل: ليش الحين؟
 *
 * ومعها **«أكمل التصفّح»**: الرفض لا يطرد أحدًا من الموقع، فالباب الذي دخلت منه
 * يبقى مفتوحًا خلفها.
 *
 * والوجهة تُحفظ بمسارها ومعاملاتها، فترجع بعد دخولها للصفحة التي كانت عليها.
 */
import { useLocation, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { Button, Modal } from '@/shared/components/ui'
import { useVoice } from '@/features/onboarding/voice'
import { ROUTES } from '@/shared/config'
import { useSignInPrompt } from './prompt'

export function SignInPrompt() {
  const reason = useSignInPrompt((state) => state.reason)
  const close = useSignInPrompt((state) => state.close)
  const navigate = useNavigate()
  const location = useLocation()
  const say = useVoice()

  const go = (to: string) => {
    close()
    navigate(to, { state: { from: `${location.pathname}${location.search}` } })
  }

  return (
    <Modal
      open={Boolean(reason)}
      onClose={close}
      width="sm"
      eyebrow="Account"
      title={say('تحتاجين حسابًا لهذي الخطوة', 'تحتاج حسابًا لهذي الخطوة')}
      footer={
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => go(ROUTES.login)}>
            <LogIn size={14} strokeWidth={1.6} aria-hidden />
            تسجيل الدخول
          </Button>
          <Button variant="secondary" onClick={() => go(ROUTES.signUp)}>
            إنشاء حساب
          </Button>
          <button
            onClick={close}
            className="text-[11.5px] text-faint transition-colors hover:text-ink"
          >
            {say('أكملي التصفّح', 'أكمل التصفّح')}
          </button>
        </div>
      }
    >
      <p className="text-[13px] leading-8 text-muted">
        {/*
          السبب أولًا لأنه سؤالها، ثم التطمين: التصفّح ما وقف، ووقف هذا الفعل
          وحده. و«تبقى لك» تقول ما يشتريه الحساب فعلاً — لا شرطًا نفرضه.
        */}
        {reason} — {say('لأن خزانتك تُحفظ باسمك وحدك، وتبقى لك على أي جهاز تفتحينه.', 'لأن خزانتك تُحفظ باسمك وحدك، وتبقى لك على أي جهاز تفتحه.')}
      </p>
      <p className="mt-3 text-[11.5px] leading-7 text-faint">
        {say(
          'وبقيّة الموقع مفتوحة لك بلا حساب — تجوّلي كيف ما تحبين.',
          'وبقيّة الموقع مفتوحة لك بلا حساب — تجوّل كيف ما تحب.',
        )}
      </p>
    </Modal>
  )
}
