// Controlled external provider: the real app route, validation, review, and exports stay in use.
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
const attempts = new Map();
createServer(async (req, res) => {
  if (req.method === 'GET') { res.end('ready'); return; }
  let input = '';
  for await (const chunk of req) input += chunk;
  try {
    assert.equal(req.url, '/v1/responses');
    assert.equal(req.headers.authorization, 'Bearer controlled-test-key');
    const request = JSON.parse(input);
    assert.equal(request.model, 'controlled-test-model');
    assert.equal(request.store, false);
    assert.equal(request.text.format.type, 'json_schema');
    assert.equal(request.text.format.strict, true);
    assert.equal(request.text.format.schema.additionalProperties, false);
    assert.ok(request.instructions.includes('untrusted data'));
    const session = JSON.parse(request.input);
    const base = session.documents.find(d => d.id === session.baseId);
    const source = session.documents.find(d => d.id !== session.baseId);
    const mode = source.name;
    const attempt = attempts.get(session.id) || 0;
    attempts.set(session.id, attempt + 1);
    if (mode === 'retry.pdf' && attempt === 0) { res.writeHead(429); res.end('{}'); return; }
    const evidence = i => [{ sourceId: source.id, blockId: source.blocks[i].id, quotation: source.blocks[i].quotation }];
    const proposal = (claim, relationship, action, index, content = null) => ({ claim, relationship, action, targetBlockId: base.blocks[1].id, content, evidence: evidence(index) });
    const proposals = mode === 'claims.pdf' ? [] : [
      proposal('Cells are units of life.', 'duplicate', 'ignore', 1),
      proposal('Membranes regulate transport.', 'elaboration', 'add', 2, 'Membranes regulate transport.'),
      proposal('Some cells have a nucleus.', 'new_information', 'add', 3, 'Some cells have a nucleus.'),
      proposal('Cells never have membranes.', 'contradiction', 'review', 4),
      proposal('The membrane may be porous.', 'uncertain', 'review', 5, 'The membrane may be porous.'),
    ];
    if (mode === 'claims.pdf') {
      proposals.splice(0, proposals.length,
        proposal('Cells are units of life.', 'duplicate', 'ignore', 1),
        proposal('Membranes regulate transport.', 'elaboration', 'add', 1, 'Membranes regulate transport.'),
        proposal('Oxygen can cross the membrane.', 'example', 'add', 1, 'E.g., oxygen can cross the membrane.'),
        proposal('The membrane may be porous in this sample.', 'uncertain', 'review', 2, 'The membrane may be porous in this sample.'),
        { ...proposal('Next lecture: tissue organization.', 'new_information', 'add', 3, 'Next lecture: tissue organization.'), targetBlockId: null },
      );
    }
    if (mode === 'missing-uncertain-content.pdf') proposals[4].content = null;
    if (mode === 'conflict-content.pdf') proposals[3].content = 'Cells never have membranes.';
    if (mode === 'bad-evidence.pdf') proposals[1].evidence[0].quotation = 'This was never in the PDF.';
    if (mode === 'bad-target.pdf') proposals[1].targetBlockId = 'missing-block';
    if (mode === 'bad-action.pdf') proposals[3].action = 'add';
    if (mode === 'confidence.pdf') proposals[1].confidence = 0.99;
    const content = mode === 'refusal.pdf' ? [{ type: 'refusal', refusal: 'Declined' }] : [{ type: 'output_text', text: mode === 'malformed.pdf' ? 'bad json' : JSON.stringify({ proposals: mode === 'empty.pdf' ? [] : proposals }) }];
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: mode === 'incomplete.pdf' ? 'incomplete' : 'completed', output: [{ type: 'message', content }] }));
  } catch { res.writeHead(500); res.end('{}'); }
}).listen(3101, '127.0.0.1');
