/**
 * إنشاء موديلك: الجنس ← المواصفات ← معاينة ← حفظ (M-01).
 * الموديل المحفوظ هو الهوية اللي يُعاد استخدامها في كل توليد بعدها (المبدأ ٣).
 */
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button, toast } from '@/shared/components/ui'
import { PageContainer } from '@/shared/components/layout'
import {
  CharacteristicsForm,
  GenderStep,
  ModelPreview,
  defaultCharacteristics,
} from '@/features/ai-model/components/ModelBuilder'
import { useAiModels } from '@/features/ai-model/store'
import { ROUTES } from '@/shared/config'
import type { AiModel, ModelCharacteristics } from '@/domain/model'
import type { Gender } from '@/domain/wardrobe'

export function CreateModelPage() {
  const { id } = useParams()
  const editing = useAiModels((state) => state.models.find((model) => model.id === id))

  // المفتاح يعيد تركيب النموذج عند تبديل الموديل — أنظف من مزامنة الحالة بـeffect
  return <ModelForm key={id ?? 'new'} editing={editing} />
}

function ModelForm({ editing }: { editing?: AiModel }) {
  const navigate = useNavigate()
  const saveModel = useAiModels((state) => state.saveModel)
  const updateModel = useAiModels((state) => state.updateModel)

  const [step, setStep] = useState<1 | 2>(editing ? 2 : 1)
  const [characteristics, setCharacteristics] = useState<ModelCharacteristics>(
    editing?.characteristics ?? defaultCharacteristics('female'),
  )
  const [name, setName] = useState(editing?.name ?? '')
  const [busy, setBusy] = useState(false)

  const pickGender = (gender: Gender) => {
    setCharacteristics(defaultCharacteristics(gender))
    setStep(2)
  }

  const regenerate = () => {
    setBusy(true)
    setTimeout(() => setBusy(false), 650)
  }

  const save = () => {
    setBusy(true)
    setTimeout(() => {
      if (editing) {
        updateModel(editing.id, characteristics)
        toast.ok('حدّثنا موديلك')
      } else {
        saveModel(characteristics, name)
        toast.ok('حفظنا موديلك — بنستخدمه في كل تجربة')
      }
      setBusy(false)
      navigate(ROUTES.studio)
    }, 750)
  }

  return (
    <PageContainer width="content">
      <button
        onClick={() => (step === 2 && !editing ? setStep(1) : navigate(-1))}
        className="lat mb-6 flex items-center gap-2 text-[10px] text-faint hover:text-ink"
      >
        <ChevronLeft size={12} aria-hidden />
        رجوع
      </button>

      <header className="mb-10">
        <p className="eyebrow">Your model</p>
        <h1 className="mt-2 text-[32px]">
          {editing ? 'تعديل موديلك' : 'أنشئي موديلك'}
        </h1>
        <p className="mt-2 max-w-[560px] text-[13px] leading-8 text-muted">
          موديل واحد يمثّل مقاساتك، ونستخدمه في كل تجربة — عشان تشوفين الفرق بين القطع، مو بين
          موديلات مختلفة.
        </p>
      </header>

      {step === 1 ? (
        <div className="max-w-[760px]">
          <p className="eyebrow mb-4">الخطوة ١ · لمن نتسوّق؟</p>
          <GenderStep value={characteristics.gender} onPick={pickGender} />
        </div>
      ) : (
        <div className="grid gap-14 lg:grid-cols-[1fr_420px]">
          <div>
            <p className="eyebrow mb-5">الخطوة ٢ · مواصفات الموديل</p>
            <CharacteristicsForm
              value={characteristics}
              onChange={setCharacteristics}
              name={name}
              onNameChange={setName}
            />
            <div className="mt-8 flex gap-3">
              <Button size="lg" onClick={save} disabled={busy}>
                {busy ? 'نحفظ…' : editing ? 'حفظ التعديلات' : 'حفظ الموديل'}
              </Button>
              {!editing && (
                <Button size="lg" variant="secondary" onClick={() => setStep(1)}>
                  تغيير التشكيلة
                </Button>
              )}
            </div>
          </div>
          <ModelPreview characteristics={characteristics} onRegenerate={regenerate} busy={busy} />
        </div>
      )}
    </PageContainer>
  )
}
