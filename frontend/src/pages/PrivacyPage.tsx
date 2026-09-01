/** شرح بلغة بسيطة لوش يصير للصور وللتوليدات (§17 · المبدأ ٥). */
import { Trash2 } from 'lucide-react'
import { Button, PageHeader, toast } from '@/shared/components/ui'
import { PageContainer } from '@/shared/components/layout'
import { useAiModels } from '@/features/ai-model/store'
import { useLooks } from '@/features/looks/store'

const POINTS = [
  {
    title: 'صورتك تبقى عندك',
    body: 'في هذي النسخة، الصورة اللي ترفعينها تنحفظ داخل متصفحك فقط ولا تنرفع لأي خادم. تنمسح تلقائيًا لما تسكّرين الصفحة.',
  },
  {
    title: 'ما نستخدم صورك للتدريب',
    body: 'صور المستخدمين ما تُستخدم لتدريب أي نموذج، لا الآن ولا بعد تفعيل خادم التوليد.',
  },
  {
    title: 'روابط خاصة',
    body: 'عند تفعيل التخزين على الخادم، تنحفظ الصور بروابط موقّعة ومحدودة المدة — مو روابط عامة يقدر أي أحد يفتحها.',
  },
  {
    title: 'تحكّم كامل',
    body: 'حذف صورتك أو أي إطلالة مولّدة متاح في أي وقت، وينحذف معها كل ما يرتبط فيها.',
  },
  {
    title: 'ما نحتفظ بالمؤقّت',
    body: 'الصور الوسيطة اللي تُنشأ أثناء المعالجة تُحذف بعد انتهاء العملية مباشرة.',
  },
]

export function PrivacyPage() {
  const { photo, clearPhoto } = useAiModels()
  const { looks } = useLooks()

  return (
    <PageContainer width="prose" className="py-12">
      <PageHeader
        eyebrow="Privacy"
        title="صورك وبياناتك"
        description="نوضّح بالضبط وش يصير للصور اللي ترفعينها وللإطلالات اللي نولّدها."
      />

      <div className="flex flex-col">
        {POINTS.map((p) => (
          <section key={p.title} className="border-b border-line py-6">
            <h2 className="text-[15px] font-normal">{p.title}</h2>
            <p className="mt-2 text-[13px] leading-8 text-muted">{p.body}</p>
          </section>
        ))}
      </div>

      <section className="mt-10 rounded-md border border-line p-6">
        <p className="eyebrow mb-4">بياناتك الحالية</p>
        <div className="flex flex-col gap-3 text-[13px]">
          <div className="flex items-center justify-between">
            <span className="text-muted">صورة مرفوعة</span>
            <span>{photo ? photo.fileName : 'لا يوجد'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">إطلالات محفوظة</span>
            <span className="font-latin">{looks.length}</span>
          </div>
        </div>
        {photo && (
          <Button
            variant="danger"
            size="sm"
            className="mt-5"
            onClick={() => {
              clearPhoto()
              toast.ok('حذفنا صورتك')
            }}
          >
            <Trash2 size={13} strokeWidth={1.5} />
            حذف صورتي
          </Button>
        )}
      </section>
    </PageContainer>
  )
}
