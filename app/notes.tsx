import { Fragment } from 'react';
import type { ExtractedDocument } from '../lib/session';
import { acceptedAfter, type Proposal, type Decision } from '../lib/comparison';

export function Notes({ document, proposals = [], decisions = {} }: { document: ExtractedDocument; proposals?: Proposal[]; decisions?: Record<string, Decision> }) {
  return <div className="notes">
    {document.blocks.map(block => {
      const content = block.spans.map((span, index) => {
        let text: React.ReactNode = span.text;
        if (span.italic) text = <em>{text}</em>;
        if (span.bold) text = <strong>{text}</strong>;
        return <span key={index}>{text}</span>;
      });
      return <Fragment key={block.id}>{block.kind === 'heading' ? <h3>{content}</h3> : <p>{content}</p>}{acceptedAfter(block.id, proposals, decisions).map(proposal => <p className="insertion" key={proposal.id}><mark>{proposal.content}</mark></p>)}</Fragment>;
    })}
    <details><summary>Original quotations and context</summary>
      {document.blocks.map(block => <div key={block.id} className="quotation"><blockquote>{block.quotation}</blockquote><p className="context">{block.context}</p></div>)}
    </details>
  </div>;
}

