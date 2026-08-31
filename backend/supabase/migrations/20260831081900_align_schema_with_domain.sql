-- مواءمة المخطط مع المجال بعد ربط الواجهة بالخادم.
--
-- الموديل صار **قياسات لا أوصاف**: «شكل الجسم» و«لون البشرة» تصنيفات تقريبية
-- تخلّى عنها المجال، والقياسات كلها اختيارية عدا الجنس — من تعرف طولها فقط
-- تكتبه وتمشي. القاعدة كانت تفرض الثلاثة فترفض كل موديل تنشئه المستخدمة.
alter table models
  alter column height_cm  drop not null,
  alter column body_shape drop not null,
  alter column skin_tone  drop not null;

-- تعديل بكلمات المستخدمة على الموديل — «أكتاف أعرض شوي»
alter table models add column if not exists refinement text;

-- رقم الإطلالة كما تراه المستخدمة («إطلالة ١٠١»). يُولَّد عند الواجهة مثل
-- المعرّف، فيبقى ثابتًا بين الأجهزة بدل ما يُشتق من ترتيب القراءة ويتغيّر.
alter table outfits add column if not exists number integer;

-- الذوق المصرَّح في التعارف: قرار المستخدمة نفسها، وما يمكن اشتقاقه من سلوكها.
-- يعيش مع ملفها لأنه صفة واحدة لها لا كيان مستقل يُستعلم عنه.
alter table profiles add column if not exists declared_style jsonb not null default '{}'::jsonb;

comment on column profiles.declared_style is
  'ما صرّحت به المستخدمة في التعارف الأول — ألوان وأنماط وسياقات وقيود.';
