# חנות התמונות (קירי)

הלקוח בוחר סגנון ומעלה תמונה (אנשים, משפחות או חיות מחמד). OpenAI יוצר 4 גרסאות, והלקוח רואה אותן ממוסגרות על קיר, בוחר את האהובות ומזמין אריחי 20×20 במסגרת שחורה או לבנה. אין עדיין תשלום באתר: ההזמנה נשמרת במסד ונשלחת לוואטסאפ של העסק.

החנות יושבת בתוך NIRO Workspace תחת `/shop`, ובנויה כך שאפשר להוציא אותה לאפליקציה משלה.

## התהליך

1. `/shop/create/[style]`: הדפדפן מקטין את התמונה ל־1536px ושולח אותה עם אישור הסכמה.
2. `POST /api/shop/generations`: בדיקת מגבלה יומית, שמירת התמונה, ופתיחת 4 יצירות ב־OpenAI ברקע (Responses API, `background: true`). לכל אחת פרומפט מעט שונה.
3. `/shop/g/[id]` שואל כל 4 שניות את `GET /api/shop/generations/[id]`, שבודק מול OpenAI, שומר תמונות שהסתיימו ומחזיר אותן.
4. העגלה נשמרת בדפדפן. `POST /api/shop/orders` מאמת כל פריט מול המסד, מחשב מחיר בשרת, שומר `ShopOrder` ומחזיר קישור וואטסאפ עם קישורים לתמונות להדפסה.

## הרצה ראשונה

בפריסה (Amplify) `scripts/db-setup.mjs` רץ לפני כל build ומוסיף לבד את הטבלאות `ShopGeneration` ו־`ShopOrder` (migration `20261107120000_shop`, רק הוספה). משתני החנות עוברים לשרת דרך `amplify.yml`. נבדק על מסד ריק ועל מסד במצב של main עם נתונים: רק טבלאות החנות נוספו, הנתונים נשמרו, והרצה שנייה לא שינתה כלום.

אם הפריסה לא הריצה את ה־migration (למשל כשהגדרות ה־build בקונסולת Amplify דורסות את `amplify.yml`), החנות יוצרת את הטבלאות בעצמה בשימוש הראשון (`server/schema.ts`). ה־migration כתוב עם `IF NOT EXISTS`, כך שפריסה מאוחרת יותר עוברת בכל מצב. טסט מוודא שה־SQL בשני המקומות זהה.

`/api/shop/health` מציג את מצב המסד, OpenAI, האחסון והוואטסאפ.

## מבנה

| נתיב | מה יש בו |
|---|---|
| `config.ts` | שם החנות, וואטסאפ, `SHOP_BASE` |
| `styles.ts` | הסגנונות (שם, תיאור, תמונת דוגמה) |
| `pricing.ts` | מחיר אריח, הנחות כמות ומשלוח |
| `cart.tsx`, `upload.ts`, `order.ts` | עגלה, הכנת תמונה בדפדפן, ולידציה והודעת הזמנה |
| `views/*` | המסכים |
| `server/prompts.ts` | הפרומפטים לכל סגנון ו־4 הווריאציות (לא נשלחים לדפדפן) |
| `server/openai.ts`, `server/storage.ts` | OpenAI ו־Supabase Storage (תיקיית `shop/`) |
| `server/limits.ts` | מגבלות יומיות לפי מבקר (IP מגובב) ולכל החנות |
| `server/cleanup.ts` | מחיקת העלאות ויצירות שלא הוזמנו אחרי 30 יום. רצה בכל העלאה חדשה, בלי משימה מתוזמנת |
| `server/handlers.ts` | ה־API. הקבצים ב־`src/app/api/shop` רק מייבאים ממנו |

**כלל:** קוד תחת `src/shop` לא מייבא מהמערכת, חוץ מ־`server/db.ts` (לקוח Prisma המשותף). הטבלאות `ShopGeneration` ו־`ShopOrder` בלי קשרים לטבלאות המערכת.

החיבורים למערכת: הכפתור בדשבורד, `/shop` ו־`/api/shop/` ב־`src/middleware.ts`, ו־`/shop` ב־`BARE_PREFIXES` ב־`src/components/AppShell.tsx`.

## משתני סביבה

| משתנה | ברירת מחדל | תפקיד |
|---|---|---|
| `OPENAI_API_KEY` (או `SHOP_OPENAI_API_KEY`) | | חובה ליצירה |
| `SHOP_OPENAI_IMAGE_MODEL` | `OPENAI_IMAGE_MODEL` או `gpt-image-2` | מודל התמונה |
| `SHOP_OPENAI_IMAGE_QUALITY` | `high` | `high` (הכי טוב להדפסה, הכי איטי), `medium` (מהיר וזול יותר), `low` |
| `NEXT_PUBLIC_SHOP_WHATSAPP` | | המספר שמקבל הזמנות, `972501234567` |
| `SHOP_DAILY_LIMIT_PER_CLIENT` | 3 | העלאות למבקר ב־24 שעות (כל העלאה = 4 תמונות) |
| `SHOP_DAILY_LIMIT_TOTAL` | 100 | תקרה יומית לכל החנות (הגנה על העלות) |
| `SHOP_RETENTION_DAYS` | 30 | אחרי כמה ימים נמחקות יצירות שלא הוזמנו |
| `SHOP_OPENAI_BASE_URL` | `https://api.openai.com/v1` | לבדיקות או gateway בלבד |
| `SHOP_STORAGE_BUCKET` | `SUPABASE_BUCKET` | באקט לתמונות החנות |
| `NEXT_PUBLIC_SHOP_URL` | `/shop` | (במערכת) לאן הכפתור בדשבורד מוביל |
| `NEXT_PUBLIC_SHOP_BASE_PATH` | `/shop` | (בחנות) קידומת הכתובות. באפליקציה נפרדת `""` |

## תמונות דוגמה לסגנונות

עד שיש דוגמאות אמיתיות, כל סגנון מוצג כאיור זמני. מוסיפים `example: 'https://…'` לסגנון ב־`styles.ts` (תמונה מרובעת).

## הפרדה לאפליקציה נפרדת

1. מעתיקים את `src/shop` לאפליקציית Next.js חדשה (Tailwind, `lucide-react`, `sharp`, Prisma).
2. מעתיקים את `src/app/shop/*` ל־`src/app/*`, ואת `src/app/api/shop/*` ל־`src/app/api/*`. ה־layout הופך ל־root layout.
3. `NEXT_PUBLIC_SHOP_BASE_PATH=""`, מעבירים את המודלים `Shop*` לסכמה החדשה, ומחליפים את `server/db.ts`.
4. במערכת: מוחקים את הקבצים, מסירים את החיבורים, ומגדירים `NEXT_PUBLIC_SHOP_URL`.

## עוד לא נעשה

- תשלום באתר.
- תמונות תצוגה עם סימן מים ברזולוציה נמוכה, וקובץ מקור רק אחרי תשלום.
- מסך במערכת לצפייה בהזמנות (כרגע: וואטסאפ וטבלת `ShopOrder`).
