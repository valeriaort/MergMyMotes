'use client';

import { useState } from 'react';
import type { Session } from '../lib/session';
import { canAccept, labels, toMarkdown, type Comparison, type Decision, type Proposal } from '../lib/comparison';
import { Notes } from './notes';

export function Review({ session, onBusy }: { session: Session; onBusy: (busy: boolean) => void }) {
  const [comparison, setComparison] = useState<Comparison>();
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const base = session.documents.find(doc => doc.id === session.baseId)!;
  const proposals = comparison?.proposals ?? [];
  const markdown = toMarkdown(base, proposals, decisions);
  const outstanding = proposals.filter(p => p.action !== 'ignore' && (!decisions[p.id] || decisions[p.id] === 'pending')).length;

  async function compare() {
    setBusy(true); onBusy(true); setError('');
    try {
      const response = await fetch('/api/compare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(session) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Comparison failed. Please retry.');
      setComparison(result); setDecisions({});
    } catch (error) { setError(error instanceof Error ? error.message : 'Comparison failed. Your inputs are still here; please retry.'); }
    finally { setBusy(false); onBusy(false); }
  }
  function decide(id: string, decision: Decision) {
    if (decision === 'accepted' && !proposals.some(p => p.id === id && canAccept(p))) return;
    setDecisions(previous => ({ ...previous, [id]: decision })); setCopyStatus('');
  }
  function download() {
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url;
    link.download = `${base.name.replace(/\.pdf$/i, '')}-merged.md`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(markdown); setCopyStatus('Copied current notes.'); }
    catch { setCopyStatus('Copy was unavailable. Download Markdown to keep your notes.'); }
  }
  function card(proposal: Proposal) {
    const decision = decisions[proposal.id] ?? 'pending';
    const target = base.blocks.find(block => block.id === proposal.targetBlockId);
    const individuallyReviewable = proposal.action === 'add' || proposal.relationship === 'uncertain';
    return <article className="proposal" aria-label={proposal.claim} key={proposal.id}>
      <p className="eyebrow">{labels[proposal.relationship]}</p><h3>{proposal.claim}</h3>
      <p className="muted">{[...new Set(proposal.evidence.map(e => e.sourceName))].join(' · ')}</p>
      {individuallyReviewable && <>
        {proposal.relationship === 'uncertain' && <p className="muted mt-3">This claim is uncertain. Inspect its evidence before deciding whether to include it.</p>}
        {target ? <p className="muted mt-3">Insert after: {target.quotation}</p> : <p className="muted mt-3">No suitable placement in your base. This claim stays unapplied and out of your export. Adding a new section is not supported yet.</p>}
        {proposal.content !== null && <p className="proposed-text">{proposal.content}</p>}
        <p className="decision">{decision === 'pending' ? 'Pending your decision' : decision === 'accepted' ? 'Accepted' : 'Rejected'}</p>
        <div className="actions"><button className="secondary" disabled={!canAccept(proposal) || decision === 'accepted'} onClick={() => decide(proposal.id, 'accepted')}>Accept</button><button className="secondary" disabled={decision === 'rejected'} onClick={() => decide(proposal.id, 'rejected')}>Reject</button>{decision !== 'pending' && <button className="secondary" onClick={() => decide(proposal.id, 'pending')}>Undo decision</button>}</div></>}
      {proposal.action === 'ignore' && <p className="muted mt-3">Already in your base. No edit proposed.</p>}
      {proposal.relationship === 'contradiction' && <p className="muted mt-3">Not applied. Individual conflict controls are coming in a later step. This item stays out of your export.</p>}
      <details className="evidence"><summary>Original evidence</summary>{proposal.evidence.map((e, i) => <div className="quotation" key={i}><p className="font-semibold">{e.sourceName}</p><blockquote>{e.quotation}</blockquote><p className="muted whitespace-pre-wrap">Context: {e.context}</p></div>)}</details>
    </article>;
  }
  return <section className="space-y-6" aria-labelledby="review-title">
    <div className="panel"><p className="eyebrow">02 / COMPARE & REVIEW</p><h2 id="review-title">Make room for useful ideas.</h2><p className="muted">Comparison sends the extracted text to the configured AI provider. Your base stays fixed during review. Changing an input starts a new session.</p>
      {!comparison && <button className="primary mt-4" disabled={busy} onClick={compare}>{busy ? 'Comparing notes…' : error ? 'Retry comparison' : 'Compare notes'}</button>}
      {busy && <p role="status" className="muted mt-3">Finding small, grounded proposals. Nothing is accepted automatically.</p>}
      {error && <p role="alert" aria-label="Comparison error" className="errors">{error}</p>}
      {comparison && <p className="success mt-4">{proposals.length} proposals · {proposals.filter(p => decisions[p.id] === 'accepted').length} accepted · {outstanding} remaining to review</p>}
    </div>
    {comparison && <div className="grid gap-6 lg:grid-cols-2">
      <section className="panel" aria-labelledby="current-title"><h2 id="current-title">Current notes</h2><p className="muted mb-5">Accepted insertions are highlighted. Original wording stays in place.</p><Notes document={base} proposals={proposals} decisions={decisions} />
        <div className="export"><p className="muted">{outstanding} remaining to review. Only accepted insertions are included.</p><div className="actions"><button className="primary" onClick={download}>Download Markdown</button><button className="secondary" onClick={copy}>Copy Markdown</button></div><p role="status" className="muted">{copyStatus}</p></div>
      </section>
      <section className="panel" aria-labelledby="changes-title"><h2 id="changes-title">Proposed changes</h2>{proposals.length === 0 && <p className="muted">No relevant changes found. You can export your base unchanged.</p>}{proposals.filter(p => p.action !== 'ignore').map(card)}
        {proposals.some(p => p.action === 'ignore') && <details className="covered"><summary>Already covered ({proposals.filter(p => p.action === 'ignore').length})</summary>{proposals.filter(p => p.action === 'ignore').map(card)}</details>}
      </section>
    </div>}
  </section>;
}
