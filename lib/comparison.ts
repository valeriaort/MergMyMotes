import type { ExtractedDocument, Session } from './session';

export const relationships = ['duplicate', 'new_information', 'elaboration', 'example', 'contradiction', 'uncertain'] as const;
export type Relationship = typeof relationships[number];
export const labels: Record<Relationship, string> = {
  duplicate: 'Already covered', new_information: 'New information', elaboration: 'Useful detail',
  example: 'Example', contradiction: 'Conflict', uncertain: 'Needs review',
};
export type Evidence = { sourceId: string; sourceName: string; blockId: string; quotation: string; context: string };
export type Proposal = {
  id: string; claim: string; relationship: Relationship; action: 'add' | 'ignore' | 'review';
  targetBlockId: string | null; content: string | null; evidence: Evidence[];
};
export type Decision = 'pending' | 'accepted' | 'rejected';
export type Comparison = { proposals: Proposal[]; provider: string; model: string };

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function nonempty(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }

// Validate the client-held extracted session before spending a provider request.
export function validateSession(value: unknown): Session {
  if (!record(value) || !nonempty(value.id) || !nonempty(value.baseId) || !Array.isArray(value.documents) || value.documents.length < 2 || value.documents.length > 3) throw new Error('Invalid document session. Inspect your PDFs again.');
  const ids = new Set<string>();
  let pages = 0;
  for (const doc of value.documents) {
    if (!record(doc) || !nonempty(doc.id) || ids.has(doc.id) || !nonempty(doc.name) || !['notes', 'slides'].includes(String(doc.sourceType)) || !Number.isInteger(doc.pageCount) || Number(doc.pageCount) < 1 || !Array.isArray(doc.blocks) || !doc.blocks.length) throw new Error('Invalid document session. Inspect your PDFs again.');
    ids.add(doc.id); pages += Number(doc.pageCount);
    const blocks = new Set<string>();
    for (const block of doc.blocks) {
      if (!record(block) || !nonempty(block.id) || blocks.has(block.id) || !['heading', 'paragraph'].includes(String(block.kind)) || !nonempty(block.quotation) || !nonempty(block.context) || !Array.isArray(block.spans) || !block.spans.length || !Number.isInteger(block.page) || Number(block.page) < 1 || Number(block.page) > Number(doc.pageCount)) throw new Error('Invalid extracted block. Inspect your PDFs again.');
      for (const span of block.spans) if (!record(span) || typeof span.text !== 'string' || typeof span.bold !== 'boolean' || typeof span.italic !== 'boolean') throw new Error('Invalid extracted text.');
      if (block.spans.map(span => span.text).join('') !== block.quotation) throw new Error('Extracted text does not match its quotation.');
      blocks.add(block.id);
    }
  }
  if (!ids.has(value.baseId) || pages > 20) throw new Error('Invalid base or page limit. Inspect your PDFs again.');
  return value as Session;
}

const invalid = () => new Error('The comparison returned invalid or ungrounded proposals. Your inputs are still here; please retry.');
function exactKeys(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).length !== keys.length || keys.some(key => !(key in value))) throw invalid();
}
export function validateProposals(value: unknown, session: Session): Proposal[] {
  if (!record(value)) throw invalid();
  exactKeys(value, ['proposals']);
  if (!Array.isArray(value.proposals) || value.proposals.length > 100) throw invalid();
  const base = session.documents.find(doc => doc.id === session.baseId)!;
  const seen = new Set<string>();
  return value.proposals.map((item, index) => {
    if (!record(item)) throw invalid();
    exactKeys(item, ['claim', 'relationship', 'action', 'targetBlockId', 'content', 'evidence']);
    if (!nonempty(item.claim) || item.claim.length > 4000 || !relationships.includes(item.relationship as Relationship)) throw invalid();
    const relationship = item.relationship as Relationship;
    const expectedAction = relationship === 'duplicate' ? 'ignore' : ['contradiction', 'uncertain'].includes(relationship) ? 'review' : 'add';
    if (item.action !== expectedAction) throw invalid();
    if (item.targetBlockId !== null && !base.blocks.some(block => block.id === item.targetBlockId)) throw invalid();
    const insertion = expectedAction === 'add' || relationship === 'uncertain';
    if (item.content !== null && (!insertion || !nonempty(item.content) || item.content.length > 8000)) throw invalid();
    if (insertion && item.targetBlockId !== null && item.content === null) throw invalid();
    if (!Array.isArray(item.evidence) || !item.evidence.length) throw invalid();
    const evidence = item.evidence.map(entry => {
      if (!record(entry)) throw invalid();
      exactKeys(entry, ['sourceId', 'blockId', 'quotation']);
      const source = session.documents.find(doc => doc.id === entry.sourceId && doc.id !== session.baseId);
      const block = source?.blocks.find(block => block.id === entry.blockId);
      if (!source || !block || !nonempty(entry.quotation) || !block.quotation.includes(entry.quotation)) throw invalid();
      return { sourceId: source.id, sourceName: source.name, blockId: block.id, quotation: entry.quotation, context: block.context };
    });
    const signature = JSON.stringify([item.claim, item.targetBlockId, item.content]);
    if (seen.has(signature)) throw invalid();
    seen.add(signature);
    return { id: `${session.id}-proposal-${index}`, claim: item.claim, relationship, action: expectedAction, targetBlockId: item.targetBlockId as string | null, content: item.content as string | null, evidence };
  });
}

export function canAccept(proposal: Proposal) {
  return (proposal.action === 'add' || proposal.relationship === 'uncertain') && proposal.targetBlockId !== null && proposal.content !== null;
}

export function acceptedAfter(blockId: string, proposals: Proposal[], decisions: Record<string, Decision>) {
  // Array order is fixed by the validated comparison, never by click order.
  return proposals.filter(p => canAccept(p) && p.targetBlockId === blockId && decisions[p.id] === 'accepted');
}
function escapeMarkdown(text: string) { return text.replace(/([\\`*_{}\[\]()<>#+\-.!|~])/g, '\\$1'); }
export function toMarkdown(base: ExtractedDocument, proposals: Proposal[], decisions: Record<string, Decision>) {
  return base.blocks.flatMap(block => {
    const original = block.spans.map(span => {
      let text = escapeMarkdown(span.text);
      if (span.bold) text = `**${text}**`;
      if (span.italic) text = `*${text}*`;
      return text;
    }).join('');
    return [(block.kind === 'heading' ? '## ' : '') + original,
      ...acceptedAfter(block.id, proposals, decisions).map(proposal => escapeMarkdown(proposal.content!))];
  }).join('\n\n') + '\n';
}
