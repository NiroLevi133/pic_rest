/**
 * Art styles offered in the store (shared by the browser and the server).
 * The prompts themselves live in server/prompts.ts and never reach the browser.
 */

export type StyleGroup = 'art' | 'fun';
export type SubjectHint = 'person' | 'pet' | 'family';

export interface ArtStyle {
  id: string;
  title: string;
  description: string;
  /** Who the style is for, shown on the upload page (e.g. pets only). */
  suitsFor: string;
  group: StyleGroup;
  /** Example image of the style (real generated sample). Until there is one, a drawn placeholder is shown. */
  example?: string;
  /** Placeholder colors: background, skin/fur, clothes, accent */
  palette: [string, string, string, string];
  /** Which subject the placeholder shows */
  sample: SubjectHint;
}

export const STYLES: ArtStyle[] = [
  { id: 'royal', title: 'מלכותי', description: 'ציור שמן רנסנסי: גלימות, כתר וזהב, כמו במוזיאון', suitsFor: 'אנשים וחיות מחמד', group: 'art',
    palette: ['#2A1E1A', '#D9A57A', '#7A1E2B', '#D4AF37'], sample: 'pet' },
  { id: 'minimal', title: 'אמנות מינימליסטית', description: 'פורטרט עדין בצבעי מים, עיפרון או פחם, על רקע שמנת', suitsFor: 'אנשים וחיות מחמד', group: 'art',
    palette: ['#F3ECE0', '#E9C9A8', '#B9A58C', '#8C7B68'], sample: 'person' },
  { id: 'family', title: 'פורטרט משפחתי', description: 'איור מצויר ביד של כל המשפחה, כולל חיות המחמד', suitsFor: 'משפחות, זוגות וקבוצות', group: 'art',
    palette: ['#F1E6D6', '#F0C9A6', '#B98E6B', '#7E9C83'], sample: 'family' },
  { id: 'pet-life', title: 'החיים הסודיים', description: 'חיית המחמד שלכם בסיטואציה אנושית מצחיקה, כמו צילום אמיתי', suitsFor: 'חיות מחמד בלבד', group: 'fun',
    palette: ['#DCE7EC', '#E3B887', '#5C7A8A', '#F2C14E'], sample: 'pet' },
  { id: 'animated', title: 'סרט אנימציה', description: 'דמות תלת־ממדית מסרט מצויר, בעולם קסום', suitsFor: 'אנשים, ילדים וחיות מחמד', group: 'fun',
    palette: ['#CFE6F5', '#F4C7A6', '#F28C6B', '#FFD166'], sample: 'person' },
];

export function getStyle(id: string): ArtStyle | undefined {
  return STYLES.find((s) => s.id === id);
}

export const STYLE_GROUPS: { id: StyleGroup; title: string; description: string }[] = [
  { id: 'art', title: 'אמנות לקיר', description: 'יצירות מעודנות שמתאימות לכל בית' },
  { id: 'fun', title: 'כיף ודמיון', description: 'מצחיק, צבעוני ומלא אופי' },
];
