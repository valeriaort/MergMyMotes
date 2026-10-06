# MergMyMotes

A local workspace for comparing lecture notes. Upload PDFs, choose your base document, inspect the extracted text, and compare the supplied notes through a server-side OpenAI integration. Review exact insertions, accept or reject them, reverse decisions, and download or copy the current notes as Markdown. The workflow is covered with a controlled provider and a small successful live OpenAI smoke check.

## Run locally

Use Node.js 22.13 or newer and npm.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. No API key is needed for PDF ingestion.

1. Choose two or three selectable-text PDFs together: your notes and one or two comparison sources.
2. Explicitly select your base. Label the comparison sources as notes or slides. These labels do not imply authority.
3. Select **Inspect notes** and check every extracted document. Expand **Original quotations and context** to see the extracted source text with neighboring lines.
4. Select **Compare notes** to send extracted text to the configured provider. Nothing is accepted automatically. Expand **Original evidence** to inspect quotations and context.
5. Accept or reject individual insertions. **Undo decision** restores the pending state. **Current notes** highlights accepted insertions; the base stays unchanged.
6. Download or copy Markdown. Only accepted insertions enter the output. Outstanding review counts do not block export.
7. Change files, the base selection, or source types to discard the session and start again.

## Configure live comparison

Copy `.env.example` to `.env.local` and set `OPENAI_API_KEY` and `OPENAI_MODEL` to a Structured Outputs-capable model available to your API project. A funded API account is required. Restart the development server after configuration changes. Never prefix these variables with `NEXT_PUBLIC_` or commit credentials.

`COMPARISON_PROVIDER=openai` selects the implemented adapter. `OPENAI_BASE_URL` defaults to `https://api.openai.com/v1`; the tests point it at a local controlled HTTP provider. Other adapters are not implemented. The example uses `gpt-4.1-mini`; change it to another supported model if needed. The configured key passed the read-only model-list check, including `gpt-4.1-mini`. A live Responses request also succeeded with this model on 6 October 2026; account access and billing can change.

The integration uses the [Responses API Structured Outputs format](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), with strict JSON Schema, no tools, `store: false`, a 90-second timeout, and an 8,000-output-token cap. There are no automatic retries. Failed comparisons retain inputs and offer an explicit retry. The demo comparison accepts up to 250,000 serialized input characters and 100 proposals; use short PDFs.

Keep cumulative development API spending below **$5**. One paid generation request was made during implementation, conservatively bounded below $0.12 at the verified model rates; exact billed usage was not captured. Track usage in your API project before and after live development calls; the app does not enforce a billing cap, and retries may incur charges. Local controlled-provider tests do not spend API credits.

## Review behavior and limits

Proposals retain their normalized claim, relationship, recommended action, evidence, exact insertion, target block, and stable identity. User decisions are stored separately. Source names and neighboring context are resolved from the supplied documents. Runtime validation rejects unknown targets, quotations absent from the cited source block, invalid relationship/action combinations, and extra fields such as invented confidence. These checks establish structural and quotation validity; they cannot prove semantic correctness.

Already-covered material has no edit and is collapsed by default. Mixed sentences can produce separate useful details and examples, each with its own decision and original evidence context. Needs review claims retain their uncertainty and require individual acceptance or rejection; decisions can be undone. Claims without suitable placement retain their classification but cannot be accepted or exported, and explain why they remain unapplied. Conflicts remain unapplied pending a later conflict-resolution flow. There is no bulk acceptance, new-section creation, or PDF export in this slice.

Current notes are rebuilt from the immutable base plus accepted insertions in comparison order, independent of click order. Markdown escapes literal text and retains available heading/emphasis cues. Export and copy use the same assembly function; there is no final model rewrite. Overlapping-edit detection remains out of scope.

The total limit is 20 pages. Use short, single-column PDFs. Scanned, empty, damaged, password-protected, and non-PDF files are rejected. A page without selectable text rejects the whole document, including mixed text/scan documents, so pages are not silently lost. Every failed source is reported; a failed batch never produces a partial session.

PDF.js extracts text on the local Node server. Ordered line blocks retain quotations, neighboring context, source identity, and page references. Relative font size supplies best-effort headings; available font names supply bold and italic cues. Complex layouts, tables, exact typography, and pagination are not reconstructed. Check the preview before relying on it.

Documents and extracted sessions are kept in memory only. There is no database or file storage. Refreshing clears the workspace. No hosting or outside service is used for ingestion. Live comparison sends extracted document text to the configured provider.

## Development checks

```sh
npx playwright install chromium
npm run typecheck
npm test
npm run build
# If Turbopack cannot bind a CSS worker port in your environment:
npm run build -- --webpack
```

Workflow tests use Chromium and generated PDF inputs, exercising the actual upload endpoint and PDF parser. They do not mock extraction. Tests run a local Next.js server on port 3100 and a controlled provider on port 3101, with test-only credentials supplied by Playwright. They exercise the real comparison route, response validation, review, and export; only the external model response is controlled. Coverage includes independent mixed-sentence decisions and shared evidence context, omission of unrelated material from controlled results, individual uncertainty review, blocked unmatched claims, accept/reject/reversal, stable insertion order, exact download/copy parity, retry, and invalid/incomplete/refused results. Controlled tests do not establish live semantic model quality. A separate live smoke check passed for a paraphrased duplicate, useful elaboration, and contradiction; it is not a broad semantic evaluation. See [live verification](docs/live-verification.md). The fixtures are small test inputs, not the future semantic demo set.

The product scope is in [docs/spec.md](docs/spec.md); work is tracked in [GitHub Issues](https://github.com/valeriaort/MergMyMotes/issues).
