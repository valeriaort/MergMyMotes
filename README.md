# MergMyMotes

A local workspace for comparing lecture notes. The first working slice uploads PDFs, lets you explicitly choose your base document, and shows extracted notes and comparison sources for inspection. Semantic comparison, review decisions, and export are not implemented yet.

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
4. Change files, the base selection, or source types to discard the extracted session and start again.

The total limit is 20 pages. Use short, single-column PDFs. Scanned, empty, damaged, password-protected, and non-PDF files are rejected. A page without selectable text rejects the whole document, including mixed text/scan documents, so pages are not silently lost. Every failed source is reported; a failed batch never produces a partial session.

PDF.js extracts text on the local Node server. Ordered line blocks retain quotations, neighboring context, source identity, and page references. Relative font size supplies best-effort headings; available font names supply bold and italic cues. Complex layouts, tables, exact typography, and pagination are not reconstructed. Check the preview before relying on it.

Documents and extracted sessions are kept in memory only. There is no database or file storage. Refreshing clears the workspace. No hosting or outside service is used for ingestion.

## Development checks

```sh
npx playwright install chromium
npm run typecheck
npm test
npm run build
```

Workflow tests use Chromium and generated PDF inputs, exercising the actual upload endpoint and PDF parser. They do not mock extraction. Tests run a local Next.js server on port 3100. The fixtures are small test inputs, not the future semantic demo set.

The product scope is in [docs/spec.md](docs/spec.md); work is tracked in [GitHub Issues](https://github.com/valeriaort/MergMyMotes/issues).
