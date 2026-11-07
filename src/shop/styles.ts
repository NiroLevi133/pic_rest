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
  /**
   * Real examples of the style: the 4 artworks of one collection, made with the store's own prompts
   * from a sample photo (files in public/shop/examples). Without them a drawn placeholder is shown.
   */
  examples?: [string, string, string, string];
  /** Placeholder colors: background, skin/fur, clothes, accent */
  palette: [string, string, string, string];
  /** Which subject the placeholder shows */
  sample: SubjectHint;
}

/** The 4 example files of a style, e.g. /shop/examples/royal-1.webp … royal-4.webp */
const ex = (id: string): [string, string, string, string] =>
  [1, 2, 3, 4].map((n) => `/shop/examples/${id}-${n}.webp`) as [string, string, string, string];

export const STYLES: ArtStyle[] = [
  { id: 'royal', examples: ex('royal'), title: 'מלכותי', description: 'ציור שמן רנסנסי: פורטרט מלכותי, כס מלכות, ארמון וגן, כמו במוזיאון', suitsFor: 'אנשים וחיות מחמד', group: 'art',
    palette: ['#2A1E1A', '#D9A57A', '#7A1E2B', '#D4AF37'], sample: 'pet' },
  { id: 'minimal', examples: ex('minimal'), title: 'אמנות מינימליסטית', description: 'פורטרט עדין בצבעי מים על נייר שמנת: דיוקן, פרחים, רגע של שקט ואור שמש', suitsFor: 'אנשים וחיות מחמד', group: 'art',
    palette: ['#F3ECE0', '#E9C9A8', '#B9A58C', '#8C7B68'], sample: 'person' },
  { id: 'family', examples: ex('family'), title: 'פורטרט משפחתי', description: 'ציור משפחתי שובב וחצי־ריאליסטי, כולל חיות המחמד: בוקר כאוטי, קניות בסופר, ערב על הספה ויום בחוף', suitsFor: 'משפחות, זוגות וקבוצות', group: 'art',
    palette: ['#F7EBD3', '#F0C9A6', '#E0533D', '#A3B899'], sample: 'family' },
  { id: 'pet-life', examples: ex('pet-life'), title: 'החיים הסודיים', description: 'ספא, אמבטיה, קפה של בוקר ועיתון: אתם או חיית המחמד, בצילום יוקרתי ומצחיק', suitsFor: 'אנשים וחיות מחמד', group: 'fun',
    palette: ['#DCE7EC', '#E3B887', '#5C7A8A', '#F2C14E'], sample: 'pet' },
  { id: 'tel-aviv', examples: ex('tel-aviv'), title: 'החיים בתל אביב', description: 'מאצ\'ה של בוקר, פילאטיס מכשירים, בראנץ\' של שישי וחוף גורדון: צילום לייפסטייל מצחיק ויוקרתי', suitsFor: 'אנשים וחיות מחמד', group: 'fun',
    palette: ['#F4EBDD', '#E8C4A6', '#A8C686', '#F6B8C8'], sample: 'person' },
  { id: 'animated', examples: ex('animated'), title: 'סרט אנימציה', description: 'דמות מסרט אנימציה בהרפתקה: גיבור הסרט, יער קסום, טירת אגדות וסוף טוב בשקיעה', suitsFor: 'אנשים, ילדים וחיות מחמד', group: 'fun',
    palette: ['#C9C3E6', '#F4C7A6', '#2E8B7A', '#F2B84B'], sample: 'person' },
];

export function getStyle(id: string): ArtStyle | undefined {
  return STYLES.find((s) => s.id === id);
}

export const STYLE_GROUPS: { id: StyleGroup; title: string; description: string }[] = [
  { id: 'art', title: 'אמנות לקיר', description: 'יצירות מעודנות שמתאימות לכל בית' },
  { id: 'fun', title: 'כיף ודמיון', description: 'מצחיק, צבעוני ומלא אופי' },
];
