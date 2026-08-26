# الفرونت-إند — دولابي الذكي

React 19 · TypeScript · Vite · Tailwind v4 · Zustand · TanStack Query

```bash
npm run dev        # من جذر المشروع: npm run dev
npm run typecheck
npm run lint
```

انسخي `.env.example` باسم `.env.local` قبل ربط الخادم.

---

## الهيكلة

طبقات واضحة، والاعتماد يمشي في اتجاه واحد فقط:

```
presentation → application → domain ← infrastructure
```

```
src/
├── theme/            ★ نظام التصميم: tokens.ts + theme.css
├── domain/             القواعد والأنواع النقية — بدون React وبدون إدخال/إخراج
│   ├── shared/         Gender · BodySlot
│   ├── wardrobe/       الأنواع · الفئات · الألوان · الأشكال · الفلترة
│   ├── model/          الموديل والصورة الشخصية
│   └── outfit/         عقود التجربة · الزاوية · الإكمال المحايد · البرومبت · الأخطاء
├── infrastructure/     كل ما يلمس العالم الخارجي
│   ├── http/           عميل الشبكة + مسارات الباك-إند
│   ├── tryon/          سجل المزوّدين: محلي · خادم · فحص الصورة
│   ├── rendering/      رسم القطع والموديل بالـSVG
│   └── storage/        مفاتيح التخزين المحلي + الهجرة من الاسم القديم
├── features/           كل ميزة مغلّفة: مكوّناتها ومخزنها وهوكاتها
│   ├── wardrobe/ · studio/ · looks/ · stylist/
│   └── travel/ · try-pieces/ · ai-model/ · profile/
├── shared/           ★ ما يُعاد استخدامه في كل مكان
│   ├── components/ui/  مكتبة المكوّنات — ملف لكل مكوّن
│   ├── components/layout/  الحاوية الموحّدة للصفحات
│   ├── hooks/ · lib/ · config/
├── app/                تركيب التطبيق: المزوّدات · الراوتر · القشرة
├── pages/              شاشة لكل مسار
└── data/               خزانة البداية التجريبية
```

### قواعد الطبقات

| الطبقة | تستورد من | ممنوع عليها |
|---|---|---|
| `domain` | `domain` فقط | React · شبكة · تخزين · مكوّنات |
| `infrastructure` | `domain` · `shared` · `theme` | `features` · `pages` |
| `features` | كل ما فوق | `pages` |
| `pages` · `app` | كل ما فوق | — |

سبب المنع: منطق العمل (زاوية الكاميرا، الإكمال المحايد، الفلترة، بناء البرومبت)
لازم يبقى قابلاً للنقل للخادم بدون سحب أي شي من الواجهة معه.

## نظام التصميم

الملف الوحيد للألوان: [`src/theme/`](src/theme/).

- `tokens.ts` — القيم الخام اللي تقرأها الشيفرة التي ترسم بالـSVG
- `theme.css` — نفس القيم داخل `@theme` عشان Tailwind يولّد منها الكلاسات

**أي تغيير لون يتم في الملفين معًا.**

| التوكن | القيمة | الاستخدام |
|---|---|---|
| `ink` | `#0A0A0A` | النص الأساسي والحالات النشطة |
| `ink-soft` | `#171717` | الأزرار الأساسية والعناصر البارزة |
| `muted` | `#777777` | الشروح والنص الثانوي |
| `faint` | `#A3A3A3` | التسميات الخافتة والـplaceholder |
| `line` | `#E7E7E4` | الحدود والفواصل |
| `line-strong` | `#DCDCD9` | الحدود عند المرور |
| `canvas` | `#FFFFFF` | خلفية الصفحة |
| `surface` | `#F8F8F6` | البطاقات والعناصر الثانوية |
| `surface-warm` | `#F4F3F0` | السطح الدافئ |
| `stage` | `#F7F7F5` | لوحة عرض الموديل |
| `danger` | `#8A1F1F` | الحذف والأخطاء |

**الخطوط:** العناوين `Alexandria` وزن ٣٠٠ بتتبع `-0.01em` · النصوص والواجهة
`IBM Plex Sans Arabic` · اللاتيني `Inter`.

**القواعد:** استدارة `8px` · حركة `320ms` بمنحنى واحد · بدون تدرّجات لونية ·
بدون ظلال كثيفة · بدون إيموجي.

## المكوّنات القابلة لإعادة الاستخدام

كل الشاشات تستورد من `@/shared/components/ui` فقط، فتعديل مكوّن يسري على
التطبيق كله دفعة وحدة.

| المجموعة | المكوّنات |
|---|---|
| الأفعال | `Button` · `ButtonLink` · `IconButton` · `Chip` · `Segmented` |
| النماذج | `Field` · `TextInput` · `TextArea` · `Select` · `SearchInput` · `RangeField` · `CheckRow` · `ColorSwatch` |
| الأسطح | `Card` · `Divider` · `Badge` · `Skeleton` · `EmptyState` |
| الترويسات | `PageHeader` · `SectionHeader` · `PageContainer` |
| الطبقات | `Modal` · `Drawer` · `ConfirmDialog` · `Scrim` · `toast` |

## طبقة الذكاء

كل التطبيق يتكلم مع واجهة واحدة: `VirtualTryOnProvider` في
[`domain/outfit/types.ts`](src/domain/outfit/types.ts).

```
VITE_TRYON_PROVIDER=local     # تركيب محلي في المتصفح (الافتراضي)
VITE_TRYON_PROVIDER=backend   # توليد حقيقي خلف Edge Function
```

تبديل المزوّد **متغيّر بيئة واحد**، ولا مكوّن واجهة يتغيّر.
**مفاتيح أي مزوّد ما تنزل هنا أبدًا** — تعيش في الباك-إند.

| الملف | يسوي إيش |
|---|---|
| `domain/outfit/framing.ts` | اختيار زاوية الكاميرا من القطع المختارة |
| `domain/outfit/completion.ts` | الإكمال المحايد — قطعة وحدة ما تُعرض على جسم نصف عارٍ |
| `domain/outfit/prompt.ts` | بناء البرومبت ديناميكيًا |
| `domain/outfit/errors.ts` | سبعة رموز خطأ بلغة بشر |
| `infrastructure/tryon/localProvider.ts` | تركيب محلي، وكل نتيجة معلّمة `simulated` |
| `infrastructure/tryon/backendProvider.ts` | توليد غير متزامن: `jobId` فورًا ثم متابعة |
| `features/stylist/suggest.ts` | الستايليست: من خزانتك فقط، ويقول وش ناقص |

## الحالة

- **Zustand** — حالة الواجهة والبيانات المحلية (`features/*/store.ts`)
- **TanStack Query** — حالة الخادم عند ربطه (`app/providers/QueryProvider.tsx`)

**لا تُخلط الاثنتان.** خلطهما أكثر خطأ متكرر في مشاريع Supabase.

طبقة الحفظ كلها خلف [`infrastructure/storage`](src/infrastructure/storage) —
عند وصول الخادم، هذا الملف وحده هو اللي يتغيّر.
