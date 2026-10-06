import { validateFiles } from '../../../lib/input-validation';
import { extractPdf } from '../../../lib/extract-pdf';
import type { ExtractedDocument, IngestionResult, SourceType } from '../../../lib/session';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  let form: FormData;
  try { form = await request.formData(); }
  catch { return Response.json({ errors: ['Could not read the upload. Please choose your PDFs again.'] }, { status: 400 }); }
  const files = form.getAll('files').filter((entry): entry is File => entry instanceof File);
  const baseId = String(form.get('baseId') ?? '');
  const sourceTypes = form.getAll('sourceTypes').map(String);
  const inputErrors = validateFiles(files);
  if (!files.some((_, index) => String(index) === baseId)) inputErrors.push('Select a base document explicitly.');
  if (sourceTypes.length !== files.length || sourceTypes.some(type => type !== 'notes' && type !== 'slides')) inputErrors.push('Label each comparison source as notes or slides.');
  if (inputErrors.length) return Response.json({ errors: inputErrors }, { status: 422, headers: { 'Cache-Control': 'no-store' } });
  const results = await Promise.allSettled(files.map((file, index) => extractPdf(file, String(index), sourceTypes[index] as SourceType)));
  const errors: string[] = [];
  const documents: ExtractedDocument[] = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') documents.push(result.value);
    else errors.push(`${files[index].name}: ${result.reason instanceof Error ? result.reason.message : 'Extraction failed. Please try another PDF.'}`);
  });
  const totalPages = documents.reduce((total, document) => total + document.pageCount, 0);
  if (totalPages > 20) errors.push(`These PDFs contain ${totalPages} pages. Choose PDFs with at most 20 total pages.`);
  if (errors.length) return Response.json({ errors }, { status: 422, headers: { 'Cache-Control': 'no-store' } });
  const result: IngestionResult = { session: { id: crypto.randomUUID(), baseId, documents } };
  return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
