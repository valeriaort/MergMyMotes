'use client';

import { useState } from 'react';
import { validateFiles } from '../lib/input-validation';
import type { ExtractedDocument, IngestionResult, Session, SourceType } from '../lib/session';

function Notes({ document }: { document: ExtractedDocument }) {
  return <div className="notes">
    {document.blocks.map(block => {
      const content = block.spans.map((span, index) => {
        let text: React.ReactNode = span.text;
        if (span.italic) text = <em>{text}</em>;
        if (span.bold) text = <strong>{text}</strong>;
        return <span key={index}>{text}</span>;
      });
      return block.kind === 'heading' ? <h3 key={block.id}>{content}</h3> : <p key={block.id}>{content}</p>;
    })}
    <details><summary>Original quotations and context</summary>
      {document.blocks.map(block => <div key={block.id} className="quotation"><blockquote>{block.quotation}</blockquote><p className="context">{block.context}</p></div>)}
    </details>
  </div>;
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [baseId, setBaseId] = useState('');
  const [sourceTypes, setSourceTypes] = useState<SourceType[]>([]);
  const [session, setSession] = useState<Session>();
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function inspect() {
    setBusy(true); setErrors([]); setSession(undefined);
    const form = new FormData();
    files.forEach((file, index) => { form.append('files', file); form.append('sourceTypes', sourceTypes[index]); });
    form.set('baseId', baseId);
    try {
      const response = await fetch('/api/ingest', { method: 'POST', body: form });
      const result: IngestionResult = await response.json();
      if (result.errors) setErrors(result.errors);
      else if (response.ok) setSession(result.session);
      else setErrors(['Could not inspect your PDFs. Please try again.']);
    } catch { setErrors(['Could not inspect your PDFs. Your inputs are still here; please try again.']); }
    finally { setBusy(false); }
  }

  const inputErrors = files.length ? validateFiles(files) : [];
  const visibleErrors = [...inputErrors, ...errors];
  const base = session?.documents.find(document => document.id === session.baseId);
  return <main className="mx-auto max-w-6xl px-5 py-8 sm:px-10 sm:py-12">
    <header className="mb-12 flex items-center justify-between gap-4"><a href="/" className="brand">MergMyMotes<span className="brand-dot">.</span></a><span className="badge">LOCAL WORKSPACE</span></header>
    <div className="mb-9 max-w-2xl"><p className="eyebrow">01 / YOUR DOCUMENTS</p><h1>Your notes come first.</h1><p className="intro">Bring your notes and a little more perspective. Choose your base, then check the extracted text before comparing.</p></div>
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="panel" aria-labelledby="upload-title"><h2 id="upload-title">Gather your PDFs</h2><p className="muted">One base + one or two comparison sources. Up to 20 pages total.</p>
        <fieldset disabled={busy}>
          <label className="upload" htmlFor="pdfs"><span className="upload-icon" aria-hidden="true">↥</span><span className="font-semibold">Choose PDFs</span><span className="muted">Selectable text · 2–3 files</span></label>
          <input id="pdfs" type="file" accept=".pdf,application/pdf" multiple onChange={event => {
            const chosen = Array.from(event.target.files ?? []);
            setFiles(chosen); setSourceTypes(chosen.map(() => 'notes')); setBaseId(''); setSession(undefined); setErrors([]);
          }} />
          {files.length > 0 && <div className="mt-6 space-y-3"><p className="text-sm font-semibold">Which document is yours?</p>{files.map((file, index) => <div className="file-row" key={index}>
            <div className="min-w-0"><p className="filename">{file.name}</p><label className="radio-label"><input type="radio" name="base" aria-label={`Use ${file.name} as base`} checked={baseId === String(index)} onChange={() => { setBaseId(String(index)); setSession(undefined); setErrors([]); }} />Use as base</label></div>
            {baseId !== String(index) && <label className="type-label">Source type<select aria-label={`Source type for ${file.name}`} value={sourceTypes[index]} onChange={event => { setSourceTypes(sourceTypes.map((type, i) => i === index ? event.target.value as SourceType : type)); setSession(undefined); setErrors([]); }}><option value="notes">Notes</option><option value="slides">Slides</option></select></label>}
            {baseId === String(index) && <span className="base-tag">Your base</span>}
          </div>)}</div>}
        </fieldset>
        <button className="primary mt-6" disabled={busy || files.length === 0 || inputErrors.length > 0 || !baseId} onClick={inspect}>{busy ? 'Extracting notes…' : 'Inspect notes'}</button>
        <div aria-live="polite">{busy && <p className="muted mt-3">Reading every PDF. This may take a moment.</p>}{visibleErrors.length > 0 && <div role="alert" aria-label="Document errors" className="errors"><p className="font-semibold">Please check your documents</p><ul>{visibleErrors.map((error, i) => <li key={i}>{error}</li>)}</ul></div>}</div>
      </section>
      <aside className="guide"><span className="eyebrow">A LITTLE CONTEXT</span><h2>A base to build on.</h2><p>Your base is your original set of notes. Comparison sources will contribute ideas for you to review.</p><div className="guide-rule" /><h3>Start with readable text</h3><p>Use short, single-column PDFs with selectable text. Scans, handwriting, and empty pages aren’t supported.</p><h3>Check what came through</h3><p>Headings and emphasis are best effort. Original typography and pagination aren’t reproduced.</p><h3>Sources are peers</h3><p>Notes and slides describe the source type; neither has automatic factual authority.</p></aside>
    </div>
    {session && base && <div className="mt-12 space-y-6"><p role="status" className="success">All {session.documents.length} PDFs extracted · {session.documents.reduce((n, doc) => n + doc.pageCount, 0)} pages. Check your notes below.</p>
      <section className="panel" aria-labelledby="base-title"><p className="eyebrow">YOUR STARTING POINT</p><h2 id="base-title">Your base document</h2><p className="muted mb-5">{base.name}</p><Notes document={base} /></section>
      <section aria-labelledby="sources-title"><h2 id="sources-title" className="mb-4">Comparison sources</h2><div className="grid gap-6 md:grid-cols-2">{session.documents.filter(doc => doc.id !== session.baseId).map(doc => <article className="panel" key={doc.id}><h3 className="source-title">{doc.name} · {doc.sourceType === 'slides' ? 'Slides' : 'Notes'}</h3><Notes document={doc} /></article>)}</div></section>
      <p className="muted">Extraction is ready for inspection. Semantic comparison and review aren’t available yet. Changing any input starts a new session.</p>
    </div>}
    <footer className="mt-10 border-t border-stone-200 pt-5 text-sm text-stone-600">In-memory workspace. Refresh clears your session. PDFs are processed by your local app and aren’t stored.</footer>
  </main>;
}
