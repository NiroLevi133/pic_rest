/**
 * Art styles offered in the store (shared by the browser and the server).
 * The prompts themselves live in server/prompts.ts and never reach the browser.
 */

export type StyleGroup = 'classic' | 'fun';
export type SubjectHint = 'person' | 'pet' | 'family';

export interface ArtStyle {
  id: string;
  title: string;
  description: string;
  group: StyleGroup;
  /** Example image of the style (real generated sample). Until there is one, a drawn placeholder is shown. */
  example?: string;
  /** Placeholder colors: background, skin/fur, clothes, accent */
  palette: [string, string, string, string];
  /** Which subject the placeholder shows */
  sample: SubjectHint;
}

export const STYLES: ArtStyle[] = [
  { id: 'oil', title: 'ציור שמן', description: 'פורטרט קלאסי במשיכות מכחול עשירות, כמו במוזיאון', group: 'classic',
    palette: ['#3B2F27', '#D9A57A', '#6E2F2A', '#C9A15A'], sample: 'person' },
  { id: 'watercolor', title: 'צבעי מים', description: 'עדין, רך ומלא אור, על נייר בעל טקסטורה', group: 'classic',
    palette: ['#EAF1F2', '#F1C3A1', '#8DB3C7', '#E58F65'], sample: 'pet' },
  { id: 'sketch', title: 'רישום עיפרון', description: 'רישום גרפיט מדויק בשחור־לבן, על נייר שמנת', group: 'classic',
    palette: ['#F2EDE3', '#BDB6AA', '#6F6A62', '#3A3732'], sample: 'person' },
  { id: 'royal', title: 'מלכותי', description: 'גלימה, כתר ותכשיטים: פורטרט של אצולה מהמאה ה־17', group: 'classic',
    palette: ['#2A1E1A', '#D9A57A', '#7A1E2B', '#D4AF37'], sample: 'pet' },
  { id: 'animated', title: 'סרט אנימציה', description: 'דמות תלת־ממדית חמודה, כאילו יצאתם מסרט מצויר', group: 'fun',
    palette: ['#CFE6F5', '#F4C7A6', '#F28C6B', '#FFD166'], sample: 'family' },
  { id: 'caricature', title: 'קריקטורה', description: 'ראש גדול, חיוך גדול. איור צבעוני ומצחיק', group: 'fun',
    palette: ['#FFF7EC', '#F2C4A0', '#5DA9E9', '#FF6B6B'], sample: 'person' },
  { id: 'popart', title: 'פופ־ארט', description: 'צבעים חזקים, קווי מתאר עבים ורקע נועז', group: 'fun',
    palette: ['#FFD23F', '#F7B7A3', '#EE4266', '#3BCEAC'], sample: 'pet' },
];

export function getStyle(id: string): ArtStyle | undefined {
  return STYLES.find((s) => s.id === id);
}

export const STYLE_GROUPS: { id: StyleGroup; title: string; description: string }[] = [
  { id: 'classic', title: 'אמנות קלאסית', description: 'יצירות שנראות כאילו צוירו ביד' },
  { id: 'fun', title: 'כיף ומשפחה', description: 'צבעוני, מצחיק ומלא אופי' },
];
