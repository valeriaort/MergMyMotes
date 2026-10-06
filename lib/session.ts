export type SourceType = 'notes' | 'slides';
export type TextSpan = { text: string; bold: boolean; italic: boolean };
export type NoteBlock = {
  id: string;
  kind: 'heading' | 'paragraph';
  spans: TextSpan[];
  quotation: string;
  context: string;
  page: number;
};
export type ExtractedDocument = { id: string; name: string; sourceType: SourceType; pageCount: number; blocks: NoteBlock[] };
export type Session = { id: string; baseId: string; documents: ExtractedDocument[] };
export type IngestionResult = { session: Session; errors?: never } | { errors: string[]; session?: never };
