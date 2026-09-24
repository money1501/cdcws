import type { TLBaseShape } from '@tldraw/tldraw';

export type DocumentType = 'text' | 'code' | 'sheet' | 'pdf' | 'slides';

export interface DocumentShapeProps {
  w: number;
  h: number;
  docType: DocumentType;
  title: string;
  content: string;
  meta: Record<string, any>;
}

export type IDocumentShape = TLBaseShape<'document_block', DocumentShapeProps>;

export interface SlideItem {
  id: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  layout?: 'title' | 'bullets' | 'two-column' | 'quote' | 'stat';
  leftCol?: string;
  rightCol?: string;
  quote?: string;
  author?: string;
  statValue?: string;
  statLabel?: string;
  bgTheme?: string;
}

/** Blank defaults — all blocks start empty so the user writes their own content. */
export const DEFAULT_TEXT_CONTENT = '';
export const DEFAULT_CODE_CONTENT = '';
export const DEFAULT_SPREADSHEET_CELLS: Record<string, string> = {};
export const DEFAULT_SLIDES: SlideItem[] = [
  {
    id: 's1',
    title: 'Slide Title',
    subtitle: 'Subtitle or presenter name',
    layout: 'title',
    bgTheme: 'from-indigo-950 via-slate-900 to-purple-950',
  },
];
