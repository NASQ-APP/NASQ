/**
 * استوديو التنسيق.
 *
 * ثلاثة أعمدة على شبكة CSS: الخزانة · الموديل · الإطلالة. الجانبان يُطويان
 * مستقلين، والموديل `1fr` فيبتلع المساحة المتحرّرة تلقائيًا — هو بطل الصفحة.
 * الطيّ محفوظ، فترجع المستخدمة للاستوديو كما تركته.
 *
 * ما فيه سعر ولا شراء: كل القطع من خزانة المستخدمة (المبدأ ١).
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shirt, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { StudioHeader } from '@/features/studio/components/StudioHeader'
import { WardrobePanel } from '@/features/studio/components/WardrobePanel'
import { CurrentOutfitPanel } from '@/features/studio/components/CurrentOutfitPanel'
import { CollapsedRail } from '@/features/studio/components/CollapsedRail'
import { ModelWorkspace } from '@/features/studio/components/ModelWorkspace'
import { SmartSuggestionsStrip } from '@/features/studio/components/SmartSuggestionsStrip'
import { PhotoUploader } from '@/features/studio/components/PhotoUploader'
import { StudioMobileBar, type MobileSheet } from '@/features/studio/components/StudioMobileBar'
import { useStudio } from '@/features/studio/store'
import { useWardrobe } from '@/features/wardrobe/store'
import { useAiModels } from '@/features/ai-model/store'
import { useLooks } from '@/features/looks/store'
import { useAppShell } from '@/app/layout'
import { conflictsWith, sheetPanels, studioLayout, type OutfitSlotId } from '@/domain/studio'
import { OCCASIONS, ownedItems } from '@/domain/wardrobe'
import {
  Button,
  ConfirmDialog,
  Field,
  Modal,
  Select,
  TextArea,
  TextInput,
  toast,
} from '@/shared/components/ui'
import { AdaptivePanel } from '@/shared/components/layout'
import { useDeviceClass } from '@/shared/hooks'
import { ROUTES } from '@/shared/config'
import type { Gender, WardrobeItem } from '@/domain/wardrobe'

export function StudioPage() {
  const navigate = useNavigate()
  const { openAdd, openStylist } = useAppShell()

  const items = useWardrobe((state) => state.items)
  const models = useAiModels()
  const looks = useLooks()
  const studio = useStudio()

  const [dragging, setDragging] = useState(false)
  const [conflict, setConflict] = useState<{ candidate: WardrobeItem; clashes: WardrobeItem[] }>()
  const [saveOpen, setSaveOpen] = useState(false)
  const [previewModeOpen, setPreviewModeOpen] = useState(false)
  const [sheet, setSheet] = useState<MobileSheet>()
  const [gender, setGender] = useState<Gender>('female')
  const [lookName, setLookName] = useState('')
  const [occasion, setOccasion] = useState<string>(OCCASIONS[0].id)
  const [lookNotes, setLookNotes] = useState('')

  const owned = useMemo(() => ownedItems(items), [items])
  const selected = useMemo(
    () =>
      studio.selection
        .map((id) => owned.find((item) => item.id === id))
        .filter((item): item is WardrobeItem => Boolean(item)),
    [studio.selection, owned],
  )

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


  const source = models.preferredSource
  const model = models.modelFor(gender)
  const photo = models.photo

  /** الإضافة تمر على فحص التعارض: ما نكدّس قميصين فوق بعض. */
  const pick = (item: WardrobeItem) => {
    if (studio.has(item.id)) {
      studio.remove(item.id)
      return
    }
    const clashes = conflictsWith(item, selected)
    if (clashes.length > 0) {
      setConflict({ candidate: item, clashes })
      return
    }
    studio.add(item.id)
  }

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
      resultImageUrl: model?.previewImageUrl ?? '',
      modelId: model?.id,
      framing: 'full',
    })
    toast.ok('حفظنا الإطلالة')
    setSaveOpen(false)
    setLookName('')
    setLookNotes('')
  }

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-0 flex-col">
      <StudioHeader
        focusMode={focusMode}
        canSave={selected.length > 0}
        onToggleFocus={studio.toggleFocusMode}
        onSave={() => setSaveOpen(true)}
        onClear={studio.clear}
        onUsePhoto={() => setPreviewModeOpen(true)}
      />

      <motion.div
        layout
        animate={{ gridTemplateColumns: layout.columns }}
        transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
        style={{ gridTemplateColumns: layout.columns }}
        className="grid min-h-0 flex-1"
      >
        {/* ---------------- الخزانة ---------------- */}
        <AdaptivePanel
          placement={layout.wardrobe}
          open={wardrobeOpen}
          onClose={() => closePanel('wardrobe')}
          eyebrow="Wardrobe"
          title="خزانتي"
          rail={
            <CollapsedRail
              side="start"
              label="خزانتي"
              icon={Shirt}
              count={owned.length}
              onOpen={openWardrobe}
            />
          }
        >
          <WardrobePanel
            onPick={(item) => {
              pick(item)
              if (layout.wardrobe === 'sheet') setSheet(undefined)
            }}
            onAddItem={openAdd}
            onDragStateChange={setDragging}
          />
        </AdaptivePanel>

        {/* ---------------- الموديل ---------------- */}
        <div className="flex min-h-0 flex-col">
          <ModelWorkspace
            modelImageUrl={model?.previewImageUrl}
            modelName={model?.name}
            hasModel={source === 'model' ? Boolean(model) : Boolean(photo)}
            notice={selected.length > 0 ? `${selected.length} قطع في إطلالتك.` : undefined}
            dragging={dragging}
            onDropItem={dropItem}
            onEditModel={() => navigate(model ? ROUTES.editModel(model.id) : ROUTES.newModel)}
            onCreateModel={() => navigate(ROUTES.newModel)}
          />

          {!focusMode && (
            <SmartSuggestionsStrip
              height={studio.suggestionsHeight}
              open={studio.suggestionsOpen}
              onResize={studio.setSuggestionsHeight}
              onToggle={studio.toggleSuggestions}
              onApply={studio.replaceAll}
              onAskStylist={openStylist}
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
          rail={
            <CollapsedRail
              side="end"
              label="إطلالتك"
              icon={Sparkles}
              count={selected.length}
              onOpen={() => studio.setOutfitPanel(true)}
            />
          }
        >
          <CurrentOutfitPanel
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

      {/* ---------------- تعارض القطع ---------------- */}
      <ConfirmDialog
        open={Boolean(conflict)}
        onClose={() => setConflict(undefined)}
        onConfirm={() => {
          if (!conflict) return
          studio.replaceWith(
            conflict.candidate.id,
            conflict.clashes.map((item) => item.id),
          )
          setConflict(undefined)
        }}
        eyebrow="Replace"
        title="عندك قطعة في هذا الموضع"
        confirmLabel="استبدال"
        destructive={false}
      >
        {conflict
          ? `«${conflict.clashes[0].name}» موجودة في الإطلالة. تبين نستبدلها بـ«${conflict.candidate.name}»؟`
          : ''}
      </ConfirmDialog>

      {/* ---------------- طريقة المعاينة ---------------- */}
      <Modal
        open={previewModeOpen}
        onClose={() => setPreviewModeOpen(false)}
        eyebrow="Preview"
        title="طريقة المعاينة"
        width="md"
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ['model', 'الموديل الخاص بي', 'موديل بمقاساتك، نستخدمه في كل تجربة'],
                ['photo', 'استخدام صورتي', 'تلبيس القطع على صورتك أنتِ'],
              ] as const
            ).map(([value, label, note]) => (
              <button
                key={value}
                onClick={() => models.setPreferredSource(value)}
                aria-pressed={source === value}
                className={`flex flex-col gap-1 rounded-md border p-4 text-right transition-colors ${
                  source === value ? 'border-ink' : 'border-line hover:border-line-strong'
                }`}
              >
                <span className="text-[13px]">{label}</span>
                <span className="text-[11.5px] leading-6 text-faint">{note}</span>
              </button>
            ))}
          </div>

          {source === 'model' ? (
            <div className="flex gap-2">
              {(['female', 'male'] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setGender(value)}
                  aria-pressed={gender === value}
                  className={`h-9 flex-1 rounded-md border text-[12px] transition-colors ${
                    gender === value ? 'border-ink bg-ink text-white' : 'border-line text-muted'
                  }`}
                >
                  {value === 'female' ? 'نسائي' : 'رجالي'}
                </button>
              ))}
            </div>
          ) : (
            <PhotoUploader />
          )}
        </div>
      </Modal>

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
