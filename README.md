# NIRO Workspace

מערכת ניהול עסק אחת ל-NIRO BAR: סטודיו AI לתמונות, גלריה, לקוחות, הצעות מחיר וקבלות.

Next.js 14 (App Router) · TypeScript · Tailwind · Prisma + PostgreSQL (Supabase) · Gemini / OpenAI

## מודולים

| מסך | מה יש בו |
|---|---|
| `/dashboard` | הכנסות החודש והשנה, הצעות פתוחות, יתרות לגבייה, אירועים קרובים, פעילות אחרונה |
| `/studio` | גנרוט בודד, גנרוט מרובה (עד 20, הורדת ZIP), סט צילומים/החלפת בגדים, סרטון 360° |
| `/gallery` | כל התמונות, חיפוש וסינון, שיוך ללקוח, וריאציה |
| `/customers` | CRM: כרטיס לקוח עם הצעות, תשלומים, יתרות וציר פעילות |
| `/quotes` | אשף ב-5 שלבים, תבנית כללית או NIRO BAR, PDF, שליחה בוואטסאפ, גרסאות והצעה מעוצבת (GPT/Gemini) |
| `/receipts` | קבלות חוקיות: מספור רציף, נעילה, מסמך ביטול, מקור/העתק, ייצוא CSV |
| `/settings` | פרטי העסק, מספור, מפתחות AI, ייצוא נתונים |

## הרצה מקומית

```bash
npm install
cp .env.example .env   # ממלאים ערכים
npm run dev            # מריץ קודם את סידור מסד הנתונים (npm run setup)
```

משתני סביבה:

| משתנה | חובה | תפקיד |
|---|---|---|
| `DATABASE_URL` | ✓ | Postgres. ב-Supabase: חיבור ה-pooler עם `?pgbouncer=true` |
| `DIRECT_URL` | בפרודקשן | חיבור ישיר להרצת migrations. אם חסר, `npm run setup` מחשב אותו לבד |
| `SESSION_SECRET` | ✓ | חתימת ההתחברות (מחרוזת אקראית ארוכה) |
| `OWNER_PHONE` | ✓ | הטלפון של בעל העסק, מקבל הרשאת OWNER |
| `SETTINGS_ENCRYPTION_KEY` | ✓ | הצפנת מפתחות שנשמרים במסך ההגדרות (32 תווים) |
| `GOOGLE_API_KEY` | ✓ | Gemini: תמונות סטודיו ו-360° |
| `OPENAI_API_KEY` | מומלץ | הצעה מעוצבת (gpt-image-2) וניתוח תמונת רפרנס |
| `LLM_PROVIDER` | | `gemini` או `openai`, לכתיבת טקסטים |
| `APP_URL` | בפרודקשן | כתובת האתר, לקישורי שיתוף ול-callback |
| `LAMBDA_GENERATE_URL`, `BG_SECRET` | בפרודקשן | שירות היצירה ברקע (Gemini) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET` | בפרודקשן | אחסון תמונות |

## מסד הנתונים

`npm run setup` (`scripts/db-setup.mjs`) רץ אוטומטית ב-`npm run dev` ובכל build ב-Amplify. אפשר להריץ אותו כמה פעמים:

1. מסד ישן בלי היסטוריית migrations: מסמן את `0_init` כמוחל.
2. עוצר אם migration עתידי מוחק מידע. מריצים מחדש עם `ALLOW_DESTRUCTIVE_MIGRATIONS=1` רק אחרי גיבוי.
3. `prisma migrate deploy`.
4. מעביר תמונות מהמבנה הישן (Menu/Dish) לגלריה.
5. יוצר את רשומת העסק.

שינויי מבנה מוסיפים בלבד, ולא מוחקים טבלאות. טבלאות התפריטים הישנות נשארות במסד.

**קבלות ותשלומים נעולים ברמת מסד הנתונים** (triggers): אי אפשר למחוק קבלה או לשנות את תוכנה. מותר רק לשנות סטטוס לביטול ולספור הדפסות.

## בדיקות

```bash
npm test              # vitest: חישובי כסף, חוקי קבלה, תאריכים, הצעות, התחברות
npx tsc --noEmit
npm run build
```

## הרשאות

- `OWNER`: הכול, כולל מפתחות AI, משתמשים וייצוא.
- `MEMBER`: מודולים עסקיים.
- `STUDIO_ONLY`: סטודיו וגלריה (רק התמונות שלו).
