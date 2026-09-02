/**
 * فهم كلام المستخدمة — **وهذا كل ما تفعله هذي الدالة**.
 *
 * تأخذ رسالة وسياقًا مضغوطًا، وترجّع نيّة مهيكلة. لا تقرأ الخزانة، ولا تختار
 * قطعًا، ولا تولّد صورًا، ولا تعرف مزوّد الصور. القرار كله في التطبيق بعدها.
 *
 * ولماذا دالة جديدة لا `agent-chat`: عقد تلك دالةٌ يرجّع **إطلالات جاهزة**
 * (`{ message, looks, pieces, gap }`) ويقرأ الخزانة بنفسه، وهو تصميم مختلف —
 * الخادم يقرّر والواجهة تعرض. وعقد هذي دلالاتٌ فقط. جمعُ العقدين في دالة
 * يجعل اسمها يكذب على أحدهما، ويربط مساعدة التنسيق بطبقة Groq التي تخدم
 * مزايا أخرى. والفصل هنا **مرئي في الاسم**: `stylist-intent` تفهم، ولا تقرّر.
 *
 * قاعدة أمنية (§17): `OPENAI_API_KEY` من بيئة الدالة، ولا يُرجَّع ولا يُسجَّل.
 * ولا نسجّل نصّ الرسالة: يحمل مناسباتها وخططها.
 */
import { handlePreflight } from '../_shared/cors.ts'
import { HandledError, fail, ok } from '../_shared/response.ts'
import { readJson, requireUser } from '../_shared/supabase.ts'
import { INTENT_TIMEOUT_MS, IntentError, extractIntentJson, stylistConfigured, stylistModel } from './openai.ts'
import { parseIntentResult } from './schema.ts'

/**
 * السياق الذي يصل النموذج — **مضغوط عمدًا**.
 *
 * أسماء عرضٍ وفئات، لا خزانة ولا صور ولا روابط موقّعة ولا معرّفات. النموذج
 * يحتاج ما يكفي لفهم «نفسها بس غيّري التوب»، ولا يحتاج ما تملكه المستخدمة.
 */
type Body = {
  message?: unknown
  context?: {
    anchorName?: unknown
    anchorCategory?: unknown
    closetName?: unknown
    requestedCategories?: unknown
    excludedCategories?: unknown
    excludedColors?: unknown
    occasion?: unknown
    formality?: unknown
    lastRecommendation?: unknown
  }
}

const SYSTEM = [
  'You are the language-understanding layer for NASAQ, an Arabic AI personal stylist.',
  'Your job is NOT to select garments. You never see the wardrobe.',
  'Convert the user message into structured styling intent as JSON.',
  '',
  'Understand Modern Standard Arabic and Gulf/Saudi dialect. Pay special attention to:',
  'negation (ما / مو / بدون / لا), corrections, changing one\'s mind,',
  'references to earlier turns ("نفسها", "الأول", "هذي"), refinements,',
  'requested and excluded garment categories and colors, closet names,',
  'occasion, style direction, formality, and whether a full or partial outfit is wanted.',
  '',
  'Distinguish carefully:',
  'find_items ONLY when she wants to BROWSE with no dressing goal:',
  '"وريني فساتيني" / "وش عندي من جزم سوداء" / "دوري لي فستان أحمر".',
  '',
  'build_outfit whenever she states a goal, occasion, or plan — even if worded as',
  '"give me": "عطني فستان ابي اطلع اليوم", "ابي فستان للعزيمة", "وش ألبس اليوم",',
  '"نسقي لي فستان". Put the garment word in requestedCategories, not find_items.',
  'A goal beats the phrasing: "عطني" alone is not a browse request.',
  '',
  'color_advice for any question about which COLOR suits something:',
  '"وش لون كعب يليق مع فستان أحمر" / "وش يليق مع الأحمر" / "عندي كعب يناسب الفستان".',
  'Put the color she named in requestedColors, and the category she asks about',
  '(shoes, bag, top…) in requestedCategories. Never answer with a garment search.',
  '"الأبيض ولا البيج" = compare_items.',
  '"وش يضبط مع X" (a whole outfit, not a color) = style_around_item.',
  '"نفسها بس ..." = refine_outfit with isNewGoal false.',
  '',
  'Set "variation" to describe what should change in the CURRENT recommendation:',
  '"none" for a fresh request; "alternative" for "عطني تنسيق ثاني" / "خيار ثاني" / "شي ثاني";',
  '"replace_all" for "غيريها كلها" / "لا غيري كل شي"; "refine" for "نفسها بس ...".',
  'With "refine", use requestedChanges to say which category to keep or replace.',
  'Example: "نفس الفستان بس غيري الحذاء" -> variation=refine,',
  'requestedChanges=[{action:"replace",category:"shoes",description:null}].',
  '',
  'REMOVING or REFUSING a garment is a refinement, never out_of_scope and rarely a',
  'new goal. Any of "بدون X" / "ما ابي X" / "مو X" / "شيلي X" / "الغي X" / "من غير X"',
  'means: task=refine_outfit, isNewGoal=false, variation="refine",',
  'excludedCategories=[X]. Name the SPECIFIC garment word she used, not its family:',
  '"بدون كعب" -> excludedCategories=["heels"] (NOT "shoes"), because flats are still fine.',
  '"بدون جاكيت" -> ["jacket"]. "ما ابي فستان" -> ["dress"].',
  'Also add requestedChanges=[{action:"remove",category:X,description:null}].',
  '',
  'CHANGING COLOR of what is on screen is a refinement too, never out_of_scope.',
  '"غيري الألوان" / "ابي لون ثاني" / "ما عجبني اللون" / "الوان ثانية" mean:',
  'task=refine_outfit, isNewGoal=false, variation="refine",',
  'requestedChanges=[{action:"replace",category:null,description:"color"}].',
  'If she names a colour to avoid, put it in excludedColors ("لا ابي اسود" -> ["اسود"]).',
  'If she names a colour she wants, put it in requestedColors.',
  'A MOOD of colour is desiredStyle, not a colour name:',
  '"خليها الوان هادية" -> desiredStyle=["هادئة"], variation="refine".',
  'Only use color_advice when she ASKS which colour suits something and expects an',
  'answer in words — not when she asks you to change the outfit colours.',
  '',
  'A bare modifier right after a recommendation CONTINUES it. When the context says a',
  'recommendation is on screen, "بدون كعب" / "غيري الألوان" / "اقصر شوي" refine THAT',
  'outfit: isNewGoal=false and anchorAction="keep". Start a new goal only when she',
  'names a new occasion, a new garment structure, or says she wants something else',
  'entirely ("خلاص ابي شي ثاني للعشاء").',
  '',
  'Asking for a DIFFERENT suggestion is never a clarification question:',
  '"عطيني خيار ثاني" / "ابي شي مختلف" / "غيري الإطلالة" -> variation="alternative"',
  '(or "replace_all" when she rejects the whole look), needsClarification=false.',
  '',
  'ONE message may carry SEVERAL requirements. Pick ONE primary task and put the rest',
  'in the constraint/modifier fields. "ابي اليوم فستان احمر وش يليق معه وشوفي لي من دولابي"',
  'is task=build_outfit with requestedCategories=["dress"], requestedColors=["احمر"],',
  'occasion set, and needsClarification=false — NOT a failure and NOT five separate turns.',
  '',
  'Tolerate Saudi/Gulf spelling mistakes and missing punctuation: "احر"="احمر",',
  '"جزمه"=shoes, "شوفي لي"=look in my wardrobe. Interpret when you are confident.',
  '',
  'Set needsClarification=true ONLY when the ambiguity would change the category,',
  'the color, the operation, or which item is meant — and put ONE short Arabic',
  'question in clarificationQuestion. Use the conversation context to make it specific',
  '("تقصدين كعب بيج؟" not "وش تقصدين؟"). Never invent a meaning to avoid asking.',
  '',
  'NASAQ is a wardrobe and outfit-styling assistant only. Use task=out_of_scope for',
  'anything else: homework, code, news, sports, recipes, general knowledge, writing',
  'emails. Judge by MEANING, not keywords: "الجو بارد وش ألبس؟" is in scope,',
  '"كم درجة الحرارة؟" is not. "بسافر لندن وش آخذ من دولابي؟" is in scope,',
  '"وش أفضل فنادق لندن؟" is not.',
  '',
  'The newest explicit instruction overrides stale context.',
  'A request that changes outfit structure (e.g. a dress after a top+bottom request) is a new goal.',
  '',
  'NEVER invent wardrobe items, item IDs, closet IDs, or database entities.',
  'For closets return only the spoken name (e.g. "الصيف"), never an ID.',
  'Categories are plain words such as: dress, top, bottom, jeans, skirt, outer, shoes, bag, accessory.',
  '',
  'Return ONLY this JSON shape:',
  '{"task":"build_outfit|find_items|style_around_item|refine_outfit|replace_item|remove_item|color_advice|compare_items|clarify|out_of_scope",',
  '"isNewGoal":bool,"requestedCategories":[],"excludedCategories":[],"requestedColors":[],"excludedColors":[],',
  '"closetRequest":{"action":"keep|set|clear","name":null},"anchorAction":"keep|replace|clear",',
  '"requestedAnchorCategory":null,"occasion":null,"desiredStyle":[],"formality":"casual|smart_casual|formal"|null,',
  '"variation":"none|alternative|replace_all|refine",',
  '"requestedChanges":[{"action":"add|remove|replace","category":null,"description":null}],',
  '"needsClarification":bool,"clarificationQuestion":null}',
].join('\n')

const text = (value: unknown): string | undefined => {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed || undefined
}

const list = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []

/** يبني وصفًا نصيًّا للحالة — سطور قليلة تكفي لفهم الإشارات للسابق. */
function describeContext(context: Body['context']): string {
  if (!context) return 'No prior context.'

  const lines: string[] = []
  const anchor = text(context.anchorName)
  if (anchor) lines.push(`Currently styling around: ${anchor} (${text(context.anchorCategory) ?? 'unknown category'})`)

  const closet = text(context.closetName)
  if (closet) lines.push(`Current closet scope: ${closet}`)

  const requested = list(context.requestedCategories)
  if (requested.length) lines.push(`Currently requested categories: ${requested.join(', ')}`)

  const excludedCategories = list(context.excludedCategories)
  if (excludedCategories.length) lines.push(`Excluded categories: ${excludedCategories.join(', ')}`)

  const excludedColors = list(context.excludedColors)
  if (excludedColors.length) lines.push(`Excluded colors: ${excludedColors.join(', ')}`)

  const occasion = text(context.occasion)
  if (occasion) lines.push(`Occasion: ${occasion}`)

  const formality = text(context.formality)
  if (formality) lines.push(`Formality: ${formality}`)

  const last = text(context.lastRecommendation)
  if (last) lines.push(`Last recommendation shown: ${last}`)

  return lines.length ? lines.join('\n') : 'No prior context.'
}

Deno.serve(async (request) => {
  const preflight = handlePreflight(request)
  if (preflight) return preflight

  const startedAt = Date.now()

  try {
    if (request.method !== 'POST') {
      throw new HandledError('method-not-allowed', 'الطلب غير مدعوم.', 405)
    }

    // الجلسة تُتحقَّق ولو كانت الدالة لا تقرأ بيانات: الحساب يحمي الكلفة
    await requireUser(request)

    const body = await readJson<Body>(request)
    const message = text(body.message)
    if (!message) throw new HandledError('invalid-request', 'ما وصلتنا رسالة.', 400)

    /*
      غياب المفتاح يُقال للسجل، لا للمستخدمة.

      ما عاد فيه احتياطي محلي، فالمساعدة تتوقّف فعلاً — لكن الرسالة تبقى
      «ما قدرت أفهم طلبك». وإظهار «OPENAI_API_KEY ناقص» يكشف بنيتنا لمن لا
      يملك إصلاحها، والسجل عندنا يقول السبب لمن يملكه.
    */
    if (!stylistConfigured()) {
      console.error('stylist intent unavailable', { feature: 'stylist', reason: 'not-configured' })
      throw new HandledError('not-supported-by-provider', 'الفهم الذكي غير مفعّل.', 503)
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), INTENT_TIMEOUT_MS)

    try {
      const raw = await extractIntentJson(
        SYSTEM,
        `Context:\n${describeContext(body.context)}\n\nUser message:\n${message}`,
        controller.signal,
      )

      const parsed = parseIntentResult(raw)
      if (!parsed.ok) {
        /*
          الرفض يقول **أي حقل** خذلنا ونوعه — لا قيمته.

          كان يُسجَّل «بنية غير صالحة» وحدها، فحين رُفضت جملة مركّبة حقيقية لم
          يكن في السجل ما يدلّ على السبب، وضاع الوقت في الظنّ أن النموذج لم
          يفهم — والحقيقة أن العقد كان أضيق من الكلام.
        */
        console.error('stylist intent malformed', {
          feature: 'stylist',
          provider: 'openai',
          model: stylistModel(),
          invalid_field: parsed.reason.field,
          got: parsed.reason.got,
        })
        throw new HandledError('provider-failure', 'ما فهمنا الطلب.', 502)
      }
      const intent = parsed.intent

      console.info('stylist intent', {
        feature: 'stylist',
        provider: 'openai',
        model: stylistModel(),
        task: intent.task,
        durationMs: Date.now() - startedAt,
      })

      return ok({ intent }, request)
    } catch (error) {
      if (error instanceof IntentError) {
        /*
          النموذج يُسجَّل في الفشل كما في النجاح.

          كان يُسجَّل عند النجاح وحده، فحين تفشل كل المحاولات ما يبقى في السجل
          ما يثبت أي نموذج جُرّب — والسؤال «هل وصل gpt-4o-mini؟» يبقى بلا جواب
          في اللحظة التي يُسأل فيها.
        */
        console.error('stylist intent failed', {
          feature: 'stylist',
          provider: 'openai',
          model: stylistModel(),
          kind: error.kind,
          durationMs: Date.now() - startedAt,
        })
        throw new HandledError('provider-failure', 'ما فهمنا الطلب.', 502)
      }
      throw error
    } finally {
      clearTimeout(timer)
    }
  } catch (error) {
    return fail(error, request)
  }
})
