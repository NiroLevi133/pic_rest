import { SHOP } from '../config';

export default function PrivacyView() {
  return (
    <div className="k-container max-w-2xl pt-10">
      <h1 className="k-h text-4xl">פרטיות ותנאי שימוש</h1>
      <div className="mt-6 space-y-5 text-[var(--k-muted)] leading-relaxed [&_h2]:text-[var(--k-ink)] [&_h2]:font-bold [&_h2]:text-lg [&_h2]:mb-1">
        <section>
          <h2>התמונות שאתם מעלים</h2>
          <p>אנחנו משתמשים בתמונה רק כדי ליצור עבורכם את היצירות שביקשתם. התמונה נשלחת לעיבוד אצל ספק בינה מלאכותית (OpenAI) לצורך היצירה בלבד. לא נשתמש בתמונות שלכם לפרסום או לכל מטרה אחרת בלי אישור מפורש.</p>
        </section>
        <section>
          <h2>כמה זמן שומרים</h2>
          <p>תמונות ויצירות שלא הוזמנו נמחקות אוטומטית אחרי 30 יום. יצירות שהוזמנו נשמרות לצורך ההדפסה, השירות והאחריות.</p>
        </section>
        <section>
          <h2>הסכמה</h2>
          <p>בהעלאת תמונה אתם מאשרים שיש לכם זכות להשתמש בה, ושמי שמופיע בה (או ההורים, אם מדובר בילדים) מסכים לכך.</p>
        </section>
        <section>
          <h2>פרטי ההזמנה</h2>
          <p>השם, הטלפון והכתובת משמשים רק לטיפול בהזמנה ולמשלוח שלה.</p>
        </section>
        <section>
          <h2>מחיקה</h2>
          <p>רוצים שנמחק תמונה או יצירה? פנו אלינו{SHOP.whatsapp ? ' בוואטסאפ' : ''} ונמחק אותה.</p>
        </section>
      </div>
    </div>
  );
}
