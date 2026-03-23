# 🍽 Restorante – Menu to AI Images

מערכת Web מלאה שמקבלת תפריט של מסעדה, מפרקת אותו למנות, מייצרת פרומטים שיווקיים בעברית, ושולחת לAPI של מחולל תמונות.

---

## Architecture

```
Next.js 14 (App Router)
  ├── Frontend (React + TypeScript + Tailwind)
  └── Backend API Routes (secure proxy)
       ├── /api/menu/parse   – LLM menu parsing
       ├── /api/dishes       – CRUD
       ├── /api/generate/[id] – single image generation
       ├── /api/generate/all  – batch generation
       └── /api/settings     – encrypted key storage

SQLite (Prisma) for MVP
Provider Abstraction:
  LLM: OpenAI (GPT-4o) | Anthropic (Claude)
  Image: DALL-E 3 | Stability AI | Replicate (FLUX)
```

## Folder Structure

```
restorante/
├── prisma/
│   └── schema.prisma          # DB schema (Menu, Dish, Settings)
├── src/
│   ├── app/
│   │   ├── menu/page.tsx      # הזנת תפריט
│   │   ├── dishes/page.tsx    # טבלת מנות + סטטוסים
│   │   ├── gallery/page.tsx   # גלריית תמונות
│   │   ├── history/page.tsx   # היסטוריית תפריטים
│   │   ├── settings/page.tsx  # הגדרות + API keys
│   │   └── api/               # Backend routes (secure)
│   ├── components/
│   │   └── Navigation.tsx
│   └── lib/
│       ├── types.ts           # TypeScript types
│       ├── prisma.ts          # DB client
│       ├── settings.ts        # Encrypted settings
│       ├── menu-parser.ts     # LLM + heuristic parsing
│       ├── prompt-engine.ts   # Category-based prompt templates
│       └── providers/
│           ├── llm/           # OpenAI | Anthropic
│           └── image/         # DALL-E | Stability | Replicate
```

## הרצה מהירה

### 1. התקן Node.js
הורד מ: https://nodejs.org (גרסה 18+)

### 2. הגדר environment
```bash
# הקובץ .env.local כבר קיים, אבל ניתן לשנות את ה-encryption key:
SETTINGS_ENCRYPTION_KEY="your-secret-32-char-key-here!!!!"
```

### 3. הרץ setup
```bash
# Windows (double-click)
setup.bat

# או ידנית:
npm install
npx prisma generate
npx prisma db push
```

### 4. הפעל שרת פיתוח
```bash
npm run dev
# פתח: http://localhost:3000
```

### 5. הגדר API Keys
- פתח http://localhost:3000/settings
- הכנס את ה-API Key שלך (OpenAI / Anthropic / Stability / Replicate)
- **המפתחות לא נחשפים ל-frontend – נשמרים מוצפנים בשרת**

---

## שימוש – Input/Output

### Input (תפריט לדוגמה)
```
מסעדת "הזית הכסוף" - תפריט

מנות פתיחה
---
חומוס ביתי עם פטריות מוקפצות ושמן זית ₪32
פלאפל קריספי עם טחינה ועלי נענע ₪28

מנות עיקריות
---
פילה סלמון צלוי עם ירקות שורש קלויים ₪89
המבורגר בלאק אנגוס עם צ'דר וצ'יפס ₪78
```

### Output (פרומט שיווקי שנוצר)
```
מנה פתיחה מפתה ויפהפייה: "חומוס ביתי" עם פטריות מוקפצות, שמן זית.
סגנון: צילום אוכל מקצועי, סגנון Mediterranean.
תאורה: תאורה רכה טבעית מהצד.
אווירה: קליל, מזמין, תיאבון.
פרטים נוספים: צלחת לבנה אלגנטית, עשבי תיבול טריים.
רקע: שיש לבן נקי או עץ טבעי.
איכות: ultra-realistic, 8K, professional food magazine photography, appetizing.
אין: אנשים, טקסט, לוגו, watermark.
```

---

## Features

| Feature | Status |
|---------|--------|
| הזנת תפריט | ✅ |
| LLM parsing (GPT-4o/Claude) | ✅ |
| Heuristic fallback | ✅ |
| זיהוי קטגוריה | ✅ (20 קטגוריות) |
| חילוץ מרכיבים | ✅ |
| Prompt engine לפי קטגוריה | ✅ |
| עריכת פרומט ידנית | ✅ |
| Generate one | ✅ |
| Generate all (concurrency) | ✅ |
| Retry on failure | ✅ (max 3) |
| סטטוסים בזמן אמת | ✅ (polling) |
| גלריית תוצאות | ✅ |
| Lightbox + הורדה | ✅ |
| הצפנת API keys | ✅ |
| Settings UI | ✅ |
| DALL-E 3 | ✅ |
| Stability AI | ✅ |
| Replicate (FLUX) | ✅ |
| OpenAI LLM | ✅ |
| Anthropic LLM | ✅ |
| היסטוריית תפריטים | ✅ |

## הרחבות עתידיות
- החלפת polling ב-WebSockets/SSE
- Queue אמיתי (BullMQ + Redis)
- Export לPDF/ZIP
- AES-256 encryption (במקום XOR)
- PostgreSQL ב-production
- Authentication
