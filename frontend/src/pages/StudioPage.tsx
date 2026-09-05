/**
 * استوديو التنسيق.
 *
 * ثلاثة أعمدة على شبكة CSS: الخزانة · الموديل · الإطلالة. الجانبان يُطويان
 * مستقلين، والموديل `1fr` فيبتلع المساحة المتحرّرة تلقائيًا — هو بطل الصفحة.
 * الطيّ محفوظ، فترجع المستخدمة للاستوديو كما تركته.
 *
 * ما فيه سعر ولا شراء: كل القطع من خزانة المستخدمة (المبدأ ١).
 */
import { useEffect, useMemo, useState } from 'react'
import { Shirt, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { StudioHeader } from '@/features/studio/components/StudioHeader'
import { WardrobePanel } from '@/features/studio/components/WardrobePanel'
import { CurrentOutfitPanel } from '@/features/studio/components/CurrentOutfitPanel'
import { CollapsedRail } from '@/features/studio/components/CollapsedRail'
import { ModelWorkspace } from '@/features/studio/components/ModelWorkspace'
import { SmartSuggestionsStrip } from '@/features/studio/components/SmartSuggestionsStrip'
import { ModelPicker, type ModelChoice } from '@/features/studio/components/ModelPicker'
import { AdjustModelDrawer } from '@/features/studio/components/AdjustModelDrawer'
import { StudioMobileBar, type MobileSheet } from '@/features/studio/components/StudioMobileBar'
import { useStudio } from '@/features/studio/store'
import { useTryOn } from '@/features/studio/useTryOn'
import { garmentReferences, referenceFromUrl } from '@/features/studio/references'
import { readyModelById, readyModelFor } from '@/domain/model'
import type { BodyParameters } from '@/domain/tryon'
import type { ModelCharacteristics } from '@/domain/model'
// `saveLook` محجوز هنا لحفظ الإطلالة في مجموعة الإطلالات — نميّز تخزين الصورة
import {
  clearAdapted,
  clearLook,
  readAdapted,
  readLook,
  saveAdapted,
  saveLook as persistLook,
} from '@/infrastructure/storage'
import { useWardrobe } from '@/features/wardrobe/store'
import { useAiModels } from '@/features/ai-model/store'
import { useLooks } from '@/features/looks/store'
import { useAppShell } from '@/app/layout'
import { useAccountGate } from '@/features/auth/useAccountGate'
import { useAuth } from '@/features/auth/store'
import { resolveSelection, sheetPanels, studioLayout, type OutfitSlotId } from '@/domain/studio'
import { OCCASIONS, ownedItems } from '@/domain/wardrobe'
import {
  Button,
  Field,
  Modal,
  Select,
  TextArea,
  TextInput,
  toast,
} from '@/shared/components/ui'
import { AdaptivePanel } from '@/shared/components/layout'
import { useDeviceClass } from '@/shared/hooks'
import { useOnboarding } from '@/features/onboarding/store'
import { useVoice } from '@/features/onboarding/voice'
import type { WardrobeItem } from '@/domain/wardrobe'

/** يبلّغ الخطأ بالعربي بدل ما يُبتلع — الفشل الصامت يترك المستخدمة تخمّن. */
const report = (error?: { message: string; hint?: string }) => {
  if (!error) return
  toast.error(error.hint ? `${error.message} ${error.hint}` : error.message)
}

export function StudioPage() {
  const { openAdd, openStylist } = useAppShell()
  /*
    الاستوديو **يُتصفَّح** بلا حساب: الأعمدة الثلاثة والموديل الجاهز يبيّنون
    شكل الأداة قبل أي التزام. اللي يحتاج حسابًا فعلان يتركان أثرًا: التوليد
    يكلّف رصيدًا يُخصم من صاحبه، والحفظ يكتب صفًّا يحتاج مالكًا.
  */
  const gate = useAccountGate()
  /*
    صاحب الإطلالة المحفوظة.

    القاعدة تخصّ المتصفّح لا الحساب، فبلا هذا المعرّف كانت آخر إطلالة مولّدة
    تُعرض على **كل** من يفتح الاستوديو بعدها: تفتح زائرة الصفحة فتلقى الموديل
    لابسًا فستان من سبقها ومكتوبًا فوقه «إطلالتك المولّدة». الزائرة بلا معرّف،
    فترى الموديل الأساسي كما هو — وهو الصحيح: ما ولّدت شيئًا بعد.
  */
  const owner = useAuth((state) => state.user?.id)

  const items = useWardrobe((state) => state.items)
  const models = useAiModels()
  const looks = useLooks()
  const studio = useStudio()

  const [dragging, setDragging] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [sheet, setSheet] = useState<MobileSheet>()
  const [lookName, setLookName] = useState('')
  const [occasion, setOccasion] = useState<string>(OCCASIONS[0].id)
  const [lookNotes, setLookNotes] = useState('')

  /**
   * حالة التجربة.
   *
   * صورة المستخدمة تبقى في ذاكرة React ولا تُكتب في أي تخزين (§19): حفظ
   * الشخصي بلا داعٍ خطر لا ميزة.
   *
   * أما **الإطلالة المولّدة فتُحفظ** في IndexedDB — لا في `localStorage` لأنها
   * تقارب الميجابايت. التوليدة تكلّف وقتًا ومالاً، وضياعها بمجرد فتح صفحة
   * ثانية يعني دفع الثمن مرتين على نفس النتيجة.
   */
  /** الجنس كما صرّح به في التعارف — يقرّر الموديل الافتراضي. */
  const declaredGender = useOnboarding((state) => state.declared.gender)
  const say = useVoice()

  const tryOn = useTryOn()
  const [modelPickerOpen, setModelPickerOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adaptedModel, setAdaptedModel] = useState<string>()
  /**
   * أي موديل يخصّه القوام المعدّل.
   *
   * يُحفظ منفصلاً لا يُقارن لحظة التركيب: الموديلات تصل من الخادم **بعد**
   * الإقلاع، فمقارنة عند التركيب وحدها تسقط القوام لأن الموديل لم يصل بعد.
   * نستعيد الاثنين ونقارن عند العرض، فيظهر القوام أول ما يصل موديله.
   */
  const [adaptedFor, setAdaptedFor] = useState<string>()
  const [generatedLook, setGeneratedLook] = useState<string>()
  /** بصمة الاختيار الذي وُلّدت منه الصورة الحالية — بها نعرف إن الصورة قدمت. */
  const [lookSignature, setLookSignature] = useState<string>()

  /**
   * تستعيد آخر إطلالة عند فتح الاستوديو.
   *
   * تُنفَّذ **مرة واحدة** ولا تكتب إلا على حالة فاضية: لو كانت المستخدمة قد
   * ولّدت شيئًا في هذي الجلسة فهو الأحدث، والقراءة غير المتزامنة ما تسبقه.
   * والبصمة تُستعاد معها، فترجع الصورة موسومة «قديمة» إن تغيّرت القطع.
   */
  /*
    تبدّل الصاحب يُفرغ ما على الشاشة — **أثناء الرسم لا في مؤثّر**.

    الحالة هنا مشتقّة من هوية القارئ، وتصفيرها في مؤثّر يعني إطارًا كاملاً
    تُعرض فيه صورة من خرجت لمن جاء بعدها قبل أن تُمسح. والتصفير أثناء الرسم
    يجعلها لا تُرسم أصلاً — وهو النمط الذي توصي به React لحالة تتبع قيمة أخرى.

    ولا يمسح عمل هذي الجلسة: عند الإقلاع الحالة فاضية، والشرط لا يصدق إلا حين
    تتغيّر الهوية فعلاً — وأبرزه الخروج من الحساب وأنت في الاستوديو.
  */
  const [lookOwner, setLookOwner] = useState(owner)
  if (lookOwner !== owner) {
    setLookOwner(owner)
    setGeneratedLook(undefined)
    setLookSignature(undefined)
    setAdaptedModel(undefined)
    setAdaptedFor(undefined)
  }

  useEffect(() => {
    let cancelled = false
    void readLook(owner).then((stored) => {
      if (cancelled || !stored) return
      setGeneratedLook((current) => current ?? stored.image)
      setLookSignature((current) => current ?? stored.signature)
    })
    void readAdapted(owner).then((stored) => {
      if (cancelled || !stored) return
      setAdaptedModel((current) => current ?? stored.image)
      setAdaptedFor((current) => current ?? stored.modelId)
    })
    return () => {
      cancelled = true
    }
  }, [owner])

  const owned = useMemo(() => ownedItems(items), [items])

  /**
   * الاختيار يُحلّ من **كل** القطع لا من الخزانة وحدها.
   *
   * كان يُبحث في `owned` (وهي `source === 'wardrobe'` فقط)، فقطعة التجربة
   * تدخل الاختيار ولا تُوجد أبدًا — تختفي من «إطلالتك الحالية» ولا تُرسل مع
   * الطلب. تضغط المستخدمة «نسّقي هذي القطعة» على قطعة مستوردة فتصل الاستوديو
   * ولا شيء فيها، بلا خطأ ولا تفسير.
   *
   * ولوحة الخزانة تبقى على الخزانة وحدها: هي للتصفّح، وقطع التجربة لها
   * صفحتها. الفرق أن ما **اختير** يُعرض أيًّا كان مصدره.
   */
  const selected = useMemo(
    () => resolveSelection(studio.selection, items),
    [studio.selection, items],
  )

  /**
   * الصورة المولّدة قديمة إذا تغيّر الاختيار بعدها.
   *
   * ما نعيد التوليد تلقائيًا: كل توليد يكلّف وقتًا ومالاً، فربطه بكل ضغطة
   * إضافة أو حذف يحرق الاثنين على صور ما طلبتها. نعلّمها ونترك القرار لها.
   */
  const selectionSignature = studio.selection.join('|')
  const lookStale = Boolean(generatedLook) && lookSignature !== selectionSignature

  /**
   * خطة التخطيط: الجهاز يقرّر مكان كل لوحة (مرسّاة أو ورقة)، وقالب الأعمدة
   * يجي معها. الصفحة ما تسأل عن المقاس في أي مكان آخر.
   */
  const device = useDeviceClass()
  const panels = { wardrobeOpen: studio.wardrobePanelOpen, outfitOpen: studio.outfitPanelOpen }
  const layout = studioLayout(device, panels)
  const focusMode = layout.device === 'desktop' && !studio.wardrobePanelOpen && !studio.outfitPanelOpen

  /** اللوحة مفتوحة إمّا لأنها مرسّاة وغير مطوية، أو لأن ورقتها منفتحة. */
  const wardrobeOpen = layout.wardrobe === 'sheet' ? sheet === 'wardrobe' : studio.wardrobePanelOpen
  const outfitOpen = layout.outfit === 'sheet' ? sheet === 'outfit' : studio.outfitPanelOpen

  const closePanel = (panel: 'wardrobe' | 'outfit') => {
    if (layout[panel] === 'sheet') {
      setSheet(undefined)
      return
    }
    if (panel === 'wardrobe') studio.setWardrobePanel(false)
    else studio.setOutfitPanel(false)
  }

  /** فتح الخزانة أيًّا كان مكانها — تستدعيه «استبدال» وشريط الجوال. */
  const openWardrobe = () => {
    if (layout.wardrobe === 'sheet') setSheet('wardrobe')
    else studio.setWardrobePanel(true)
  }


  const photo = models.photo

  /**
   * وضع الموديل — **من المتجر لا من حالة محلية**.
   *
   * العطل: كان `useState('ready')`، فيولد من جديد مع كل تركيب للصفحة. ترفع
   * صورتها في «إنشاء موديل» وتضغط «ابدئي التجربة»، فيفتح الاستوديو على
   * `'ready'` ويعرض الموديل الجاهز نفسه الذي جاءت تستبدله. و`preferredSource`
   * كان في المتجر ومحفوظًا منذ البداية — ولا يقرأه أحد.
   *
   * والصورة تعيش في الذاكرة وحدها (§17)، فتختفي بعد التحديث ويبقى الاختيار.
   * فنرجع حينها للموديل الجاهز بدل استوديو فاضٍ — واسمه ظاهر تحت الصورة، فلا
   * يلتبس جسدٌ بجسد. وأول ما ترفع صورتها من جديد يرجع الاستوديو لها وحده.
   */
  const modelChoice: ModelChoice = models.preferredSource === 'photo' ? 'photo' : 'ready'
  const usingPhoto = modelChoice === 'photo' && Boolean(photo)

  /**
   * الموديل الفعّال — **مصدر القياسات الوحيد**.
   *
   * يُشتقّ عند كل عرض من بيانات الموديلات المحفوظة، ما يُنسخ في حالة محلية ولا
   * يُزامَن بـ`useEffect`: النسخة المحلية تعني مصدرين يتفارقان، والمزامنة
   * بالتأثير تكتب فوق ما أدخلته المستخدمة عند أول إعادة عرض.
   *
   * الأولوية: الموديل المختار صراحةً ← الموديل الافتراضي لجنس الموديل الجاهز.
   * ولو ما فيه موديل محفوظ بعد، القياسات فاضية — ولا يُنشأ سجلّ إلا بفعل صريح.
   */
  const activeModel = models.models.find((model) => model.id === models.activeModelId)

  /*
    الموديل الافتراضي **من جنس صاحب الحساب**.

    كان الاحتياطي `READY_MODELS[0]` — أي النسائي للجميع. فمن صرّح أنه ذكر فتح
    الاستوديو على جسد ليس جسده، ولزمه أن يبدّله يدويًا قبل أن يجرّب شيئًا.
    والجنس معروف من التعارف، فالافتراض عنه لا مبرّر له.

    ويبقى التبديل بيده: هذا **مبدأ** لا قيد، و«تغيير الموديل» تقبل أي واحد.
  */
  const readyModel = activeModel
    ? readyModelFor(activeModel.characteristics.gender)
    : (readyModelById(models.readyModelId ?? '') ?? readyModelFor(declaredGender ?? 'female'))

  const measurementSource =
    activeModel ?? models.models.find((model) => model.characteristics.gender === readyModel.gender && model.isDefault)

  const characteristics: ModelCharacteristics =
    measurementSource?.characteristics ?? { gender: readyModel.gender }

  /**
   * صورة الشخص المرسلة للمزوّد، بترتيب الأولوية:
   * الموديل المعدّل ← الموديل الجاهز ← صورة المستخدمة.
   */
  /** القوام المعدّل يخدم موديله وحده — على غيره نرجع لصورة الأساس. */
  const adaptedImage = adaptedFor === measurementSource?.id ? adaptedModel : undefined

  const personImageUrl =
    usingPhoto ? photo?.url : (adaptedImage ?? readyModel.imageUrl)

  const hasModel = Boolean(personImageUrl)
  const modelLabel = usingPhoto ? 'صورتك' : readyModel.name

  /**
   * يجمع مراجع القطع — القطعة بلا صورة تُسقَط لا تُرسل باسمها.
   *
   * والرسالة تفرّق بين حالتين: قطعة **ما لها صورة أصلاً** (تحتاج تصوير)، وقطعة
   * لها صورة لكن **ما قدرنا نقرأها** (رابط متجر خارجي). قول «ما لها صور» عن
   * قطعة صورتها ظاهرة في الشبكة يخلّي المستخدمة تشك في عينها لا في التطبيق.
   */
  const collectGarments = async () => {
    const garments = await garmentReferences(selected)
    if (garments.length === 0) {
      const anyPictured = selected.some((item) => item.imageUrl)
      toast.error(
        anyPictured
          ? say(
              'ما قدرنا نقرأ صور القطع المختارة. جرّبي ترفعين صورة للقطعة من صفحتها.',
              'ما قدرنا نقرأ صور القطع المختارة. جرّب ترفع صورة للقطعة من صفحتها.',
            )
          : say(
              'القطع المختارة ما لها صور. أضيفي صورة للقطعة من صفحتها.',
              'القطع المختارة ما لها صور. أضِف صورة للقطعة من صفحتها.',
            ),
      )
      return undefined
    }
    if (garments.length < selected.length) {
      toast.ok(`${selected.length - garments.length} قطع ما قدرنا نقرأ صورها — تخطّيناها.`)
    }
    return garments
  }

  const runGenerateLook = async () => {
    if (!personImageUrl) {
      toast.error(say('اختاري موديلاً أو ارفعي صورتك أول.', 'اختر موديلاً أو ارفع صورتك أول.'))
      return
    }
    const person = await referenceFromUrl(personImageUrl)
    if (!person) {
      toast.error('ما قدرنا نقرأ صورة الموديل.')
      return
    }
    const garments = await collectGarments()
    if (!garments) return

    const { result, error } = await tryOn.run({
      personImage: person,
      garments,
      bodyParameters: characteristics,
    })
    if (result) {
      setGeneratedLook(result.image)
      // البصمة تُلتقط من إغلاق هذا العرض، فهي اختيار لحظة الطلب لا لحظة الرد
      setLookSignature(selectionSignature)
      void persistLook({ image: result.image, signature: selectionSignature, owner })
    }
    report(error)
  }

  const runRegenerate = async () => {
    if (!personImageUrl) return
    const person = await referenceFromUrl(personImageUrl)
    if (!person) return
    const garments = await collectGarments()
    if (!garments) return

    const { result, error } = await tryOn.regenerate({
      personImage: person,
      garments,
      previousLook: generatedLook,
      bodyParameters: characteristics,
    })
    if (result) {
      setGeneratedLook(result.image)
      setLookSignature(selectionSignature)
      void persistLook({ image: result.image, signature: selectionSignature, owner })
    }
    report(error)
  }

  /**
   * التعديل يكتب في **بيانات الموديل** لا في حالة الاستوديو.
   *
   * فيبقى محفوظًا بعد إعادة التحميل، ويظهر فورًا في «موديلاتي». ولو ما فيه
   * موديل محفوظ بعد، هذي أول مرة تُدخل فيها قياسات — فيُنشأ سجلّ لها الآن،
   * بفعل صريح لا بتهيئة تلقائية.
   */
  const applyAdjustment = async (parameters: BodyParameters, refinement?: string) => {
    const next: ModelCharacteristics = {
      ...parameters,
      gender: characteristics.gender,
      refinement: refinement?.trim() || undefined,
    }

    if (measurementSource) models.updateModel(measurementSource.id, next)
    else models.saveModel(next)

    // التعديل يبني على الموديل المعدّل السابق إن وُجد، فالتحسينات تتراكم
    const base = await referenceFromUrl(adaptedImage ?? readyModel.imageUrl)
    if (!base) return

    const { result, error } = await tryOn.adaptModel({
      baseImage: base,
      bodyParameters: parameters,
      refinement,
    })
    if (result) {
      setAdaptedModel(result.image)
      setAdaptedFor(measurementSource?.id)
      if (measurementSource)
        void saveAdapted({ image: result.image, modelId: measurementSource.id, owner })
      setGeneratedLook(undefined)
      void clearLook()
      setAdjustOpen(false)
      toast.ok('عدّلنا الموديل')
    }
    report(error)
  }

  /**
   * الاختيار حرّ بلا قيد: ضغطة تضيف وضغطة تشيل، وأي عدد على أي موضع.
   *
   * كنّا نمنع قطعتين على موضع واحد، والمنع كان يقرّر عن المستخدمة: الطبقات
   * حقيقية (قميص تحت كنزة)، ومن تبي تشوف تركيبة غريبة تشوفها. الصورة المولّدة
   * هي الحكم لا قاعدة مكتوبة عندنا.
   */
  const pick = (item: WardrobeItem) => studio.toggle(item.id)

  const dropItem = (itemId: string) => {
    const item = owned.find((candidate) => candidate.id === itemId)
    if (item && !studio.has(item.id)) pick(item)
  }

  /** «استبدال البنطلون»: يفتح الخزانة — بأي شكل تُعرض — ويقفز لفئة الخانة. */
  const replaceSlot = (slot: OutfitSlotId) => {
    openWardrobe()
    studio.setActiveCategory(slot)
  }

  const saveLook = () => {
    if (selected.length === 0) return
    looks.save({
      name: lookName.trim() || 'إطلالة بدون اسم',
      occasion,
      notes: lookNotes.trim() || undefined,
      itemIds: studio.selection,
      resultImageUrl: generatedLook ?? '',
      /*
        **معرّف صفٍّ في `models`، لا اسم موديل جاهز.**

        العمود `model_id` مفتاح أجنبي من نوع uuid على جدول الموديلات، والجاهز
        `ready-female` ثابتٌ في الشيفرة لا صفٌّ في القاعدة. فكان الحفظ يرجع
        `invalid input syntax for type uuid` ويسقط الإدراج كلّه — فلا تُحفظ
        الإطلالة ولا تُعرض، لأن المخزن يعيد القراءة بعد الفشل فيمسح نسخته
        المتفائلة. ومن لا موديل محفوظ له يُترك العمود فارغًا، و`owns_model`
        تقبل الفارغ.
      */
      modelId: usingPhoto ? undefined : measurementSource?.id,
      framing: 'full',
    })
    toast.ok('حفظنا الإطلالة')
    setSaveOpen(false)
    setLookName('')
    setLookNotes('')
  }

  const generateLook = gate('عشان نولّد لك صورة الإطلالة على موديلك', runGenerateLook)
  /*
    والتحديث يُحرَس مثل التوليد وإن بدا وراءه: الإطلالة المولّدة تُستعاد من
    IndexedDB عند فتح الاستوديو، فمن خرج من حسابه في هذا المتصفّح يلقى صورته
    أمامه وزرّ «حدّث» تحتها — وهو توليد ثانٍ برصيد ثانٍ.
  */
  const regenerate = gate('عشان نحدّث لك صورة الإطلالة', runRegenerate)
  const openSave = gate('عشان تحفظ الإطلالة في إطلالاتك', () => setSaveOpen(true))

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-0 flex-col bg-surface">
      <StudioHeader
        focusMode={focusMode}
        canSave={selected.length > 0}
        selectedCount={selected.length}
        onToggleFocus={studio.toggleFocusMode}
        onSave={openSave}
        onClear={studio.clear}
      />

      <motion.div
        layout
        animate={{ gridTemplateColumns: layout.columns }}
        transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
        style={{ gridTemplateColumns: layout.columns }}
        className="grid min-h-0 flex-1 gap-2 p-2 sm:gap-3 sm:p-3"
      >
        {/* ---------------- الخزانة ---------------- */}
        <AdaptivePanel
          placement={layout.wardrobe}
          open={wardrobeOpen}
          onClose={() => closePanel('wardrobe')}
          eyebrow="Wardrobe"
          title="خزانتي"
          className="h-full overflow-hidden rounded-lg border border-line bg-canvas"
          rail={
            <CollapsedRail
              label="خزانتي"
              icon={Shirt}
              count={owned.length}
              onOpen={openWardrobe}
            />
          }
        >
          <WardrobePanel
            showHeader={layout.wardrobe !== 'sheet'}
            onPick={(item) => {
              pick(item)
              if (layout.wardrobe === 'sheet') setSheet(undefined)
            }}
            onDragStateChange={setDragging}
          />
        </AdaptivePanel>

        {/* ---------------- الموديل ---------------- */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-canvas">
          <ModelWorkspace
            modelImageUrl={personImageUrl}
            modelName={modelLabel}
            hasModel={hasModel}
            generatedLook={generatedLook}
            stale={lookStale}
            busy={tryOn.status === 'working'}
            stage={tryOn.stage}
            itemCount={selected.length}
            dragging={dragging}
            onDropItem={dropItem}
            onChooseModel={() => setModelPickerOpen(true)}
            onGenerate={generateLook}
            onRegenerate={regenerate}
            onSaveLook={openSave}
            onStartOver={() => {
              setGeneratedLook(undefined)
              void clearLook()
              tryOn.reset()
            }}
          />

          {!focusMode && (
            <SmartSuggestionsStrip
              height={studio.suggestionsHeight}
              selectedIds={studio.selection}
              onResize={studio.setSuggestionsHeight}
              onApply={(itemIds) => {
                studio.replaceAll(itemIds)
                toast.ok('جهّزنا لك الإطلالة في الاستوديو')
              }}
              onAskStylist={openStylist}
              onAddItem={openAdd}
            />
          )}
        </div>

        {/* ---------------- الإطلالة ---------------- */}
        <AdaptivePanel
          placement={layout.outfit}
          open={outfitOpen}
          onClose={() => closePanel('outfit')}
          eyebrow="Outfit"
          title="إطلالتك الحالية"
          className="h-full overflow-hidden rounded-lg border border-line bg-canvas"
          rail={
            <CollapsedRail
              label="إطلالتك"
              icon={Sparkles}
              count={selected.length}
              onOpen={() => studio.setOutfitPanel(true)}
            />
          }
        >
          <CurrentOutfitPanel
            showHeader={layout.outfit !== 'sheet'}
            items={selected}
            onReplace={replaceSlot}
            onAskStylist={openStylist}
          />
        </AdaptivePanel>
      </motion.div>

      <StudioMobileBar
        sheets={sheetPanels(layout)}
        active={sheet}
        wardrobeCount={owned.length}
        outfitCount={selected.length}
        onOpen={(next) => setSheet((current) => (current === next ? undefined : next))}
        onAskStylist={openStylist}
      />

      {/* ---------------- اختيار الموديل ---------------- */}
      <Modal
        open={modelPickerOpen}
        onClose={() => setModelPickerOpen(false)}
        eyebrow="Model"
        title={say('على مين تبين نجرب الإطلالة؟', 'على مين تبي نجرب الإطلالة؟')}
        width="lg"
      >
        <ModelPicker
          choice={modelChoice}
          readyModelId={models.readyModelId ?? readyModelFor(declaredGender ?? 'female').id}
          savedModels={models.models}
          activeModelId={measurementSource?.id}
          hasPhoto={Boolean(photo)}
          onChooseSaved={(id) => {
            models.setPreferredSource('model')
            models.setActive(id)
            // الموديل المعدّل يخص موديلاً بعينه، فتبديل الموديل يُسقطه
            setAdaptedModel(undefined)
            setAdaptedFor(undefined)
            void clearAdapted()
            setGeneratedLook(undefined)
            void clearLook()
          }}
          onChooseReady={(id) => {
            models.setPreferredSource('model')
            models.setReadyModel(id)
            // الاختيار الصريح لموديل جاهز يُلغي تثبيت موديل محفوظ، وإلا بقي
            // جنسُه يفرض صورة الأساس ويتجاهل ما اختارته المستخدمة الآن
            models.setActive(undefined)
            setAdaptedModel(undefined)
            setAdaptedFor(undefined)
            void clearAdapted()
            setGeneratedLook(undefined)
            void clearLook()
          }}
          onChoosePhoto={() => {
            models.setPreferredSource('photo')
            setGeneratedLook(undefined)
            void clearLook()
          }}
          onAdjust={() => {
            setModelPickerOpen(false)
            setAdjustOpen(true)
          }}
        />
      </Modal>

      {/*
        المفتاح يعيد تركيب الدرج عند تبديل الموديل، فتُقرأ قياسات الموديل
        الجديد من أول عرض. البديل — مزامنة الحالة الداخلية بـ`useEffect` —
        يكتب فوق ما تكتبه المستخدمة عند أي إعادة عرض.
      */}
      <AdjustModelDrawer
        key={measurementSource?.id ?? `new-${characteristics.gender}`}
        open={adjustOpen}
        value={characteristics}
        busy={tryOn.status === 'working'}
        onClose={() => setAdjustOpen(false)}
        onApply={applyAdjustment}
      />

      {/* ---------------- حفظ الإطلالة ---------------- */}
      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        eyebrow="Save"
        title="حفظ الإطلالة"
        width="sm"
        footer={
          <div className="flex gap-3">
            <Button onClick={saveLook}>حفظ الإطلالة</Button>
            <Button variant="secondary" onClick={() => setSaveOpen(false)}>
              إلغاء
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="اسم الإطلالة">
            <TextInput
              autoFocus
              value={lookName}
              onChange={(event) => setLookName(event.target.value)}
              placeholder="إطلالة الجامعة"
            />
          </Field>
          <Field label="المناسبة">
            <Select value={occasion} onChange={(event) => setOccasion(event.target.value)}>
              {OCCASIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="ملاحظة (اختياري)">
            <TextArea
              value={lookNotes}
              onChange={(event) => setLookNotes(event.target.value)}
              placeholder="مثلًا: تنفع لأول يوم دوام"
            />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
