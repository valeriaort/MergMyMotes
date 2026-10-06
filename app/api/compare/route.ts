import { validateSession } from '../../../lib/comparison';
import { compare } from '../../../lib/comparison-provider';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  let session;
  try {
    const text = await request.text();
    if (text.length > 250_000) throw new Error('These notes are too long for the demo comparison. Try shorter PDFs.');
    session = validateSession(JSON.parse(text));
  } catch (error) {
    return Response.json({ error: error instanceof SyntaxError ? 'Could not read the document session.' : error instanceof Error ? error.message : 'Invalid document session.' }, { status: 422, headers });
  }
  try { return Response.json(await compare(session), { headers }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Comparison failed. Please retry.' }, { status: 502, headers }); }
}
