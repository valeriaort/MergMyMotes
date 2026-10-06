# Ticket #2 live verification

Date: 6 October 2026.

One real Responses API request succeeded with `gpt-4.1-mini`, strict Structured Outputs, and the application’s runtime validation. No saved result or controlled provider was used for this run. The key remained server-side in ignored `.env.local`.

The browser uploaded two small generated selectable-text PDFs through the real ingestion endpoint. The base said cells are the basic units of life, membranes regulate transport, and all cells contain a nucleus. The comparison paraphrased the first claim, elaborated selective transport, and said some cells lack a nucleus.

Observed results:

- The paraphrase was classified duplicate/ignore with no edit.
- Selective transport was classified elaboration/add with the exact source quotation and a valid base target.
- The nucleus disagreement was classified contradiction/review and remained unapplied.
- Accepting the elaboration inserted its exact preview once.
- Markdown download and clipboard output matched and retained the original base claim.
- Undo removed the accepted insertion.

The full controlled-provider suite passed 18 tests. Typecheck passed. Production build passed with `npm run build -- --webpack`; default Turbopack failed on a CSS-worker port restriction in this execution environment. Desktop and 390px mobile review layouts were inspected, with no horizontal overflow in the mobile check.

One generation request was made. Its conservative cost bound was below $0.12 using the model’s published $0.40/M input and $1.60/M output rates, the application input limit, and the 8,000 output-token cap. Exact billed usage was not captured. This is well within the $5 development limit; later live checks must account for this request. Pricing source: https://developers.openai.com/api/docs/models/gpt-4.1-mini

This small smoke check verifies the ticket’s live integration, not broad model quality, all relationship categories, conflict resolution controls, or the later full demonstration acceptance criteria.
