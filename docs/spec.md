# MergMyMotes — PDF note comparison and reviewed merging

Date: 2026-10-06

Document state: Agreed product scope; proposed testing boundary awaits confirmation.
Intended tracker label: `ready-for-agent` once published.

## Problem Statement

Students comparing their lecture notes with classmates' notes or lecture slides must manually distinguish repeated ideas from useful missing details and contradictions. Combining entire documents through generic generation risks losing their wording, structure, shorthand, and control over disputed claims.

The user needs their own notes improved with relevant supplied information, with every applied change visible and deliberate. The immediate project is a working personal-project demo for an audience of DevDay developers, accompanied by a public repository and application. The application submission target is 19:30 Europe/Madrid on 6 October 2026. There is no fixed feature-freeze deadline.

## Solution

Build a local web application named MergMyMotes. Users upload one base PDF and one or two comparison PDFs containing selectable text, identify source types, and compare their meaning. The app presents small proposed changes, consolidates agreement across sources, and flags conflicts and uncertainty.

The original notes remain the base. Ordinary accepted changes are insertions that preserve the base's wording and style. Explicitly choosing **Use theirs** on a conflict is the sole permitted replacement operation. Users review exact proposed edits, reverse decisions before export, and export only accepted changes. The final document is assembled deterministically from approved edits, without a final model rewrite.

Deliver a working local prototype and public personal-project repository. Hosting is excluded. Prefer a newly generated PDF with best-effort formatting; Markdown download and copy are the required fallback if PDF export threatens the core flow.

## User Stories

1. As a student, I want to upload my own PDF notes, so that my document remains the basis of the result.
2. As a student, I want to upload one or two comparison PDFs, so that I can compare a small set of classmates' notes or lecture materials.
3. As a student, I want to choose which uploaded PDF is my base, so that the app does not guess which document to preserve.
4. As a student, I want to label comparison sources as notes or slides, so that I can understand their origin without granting them automatic authority.
5. As a student, I want unsupported file types, scanned PDFs, and excess uploads rejected clearly, so that I know what the demo supports.
6. As a student, I want extraction failures explained, so that no source silently disappears from the comparison.
7. As a student, I want headings, wording, emphasis where extractable, and topic order retained, so that my notes remain recognizable.
8. As a student, I want paraphrased duplicates recognized semantically, so that different wording does not create redundant additions.
9. As a student, I want relevant missing information proposed, so that I can fill gaps in my notes.
10. As a student, I want useful elaborations distinguished from unrelated material, so that additions improve the lecture content rather than expand its scope arbitrarily.
11. As a student, I want examples separately selectable, so that I control whether examples and mnemonics enter my notes.
12. As a student, I want mixed sentences split into independently reviewable claims, so that I can accept one detail without accepting an entire sentence.
13. As a student, I want each claim's source context retained, so that splitting does not distort its meaning.
14. As a student, I want matching claims from multiple sources combined into one proposal, so that agreement does not create repeated additions.
15. As a student, I want all supporting source names retained, so that I can see which documents supplied an addition.
16. As a student, I want disagreement between comparison sources flagged even when my base has no matching claim, so that incompatible additions are not silently combined.
17. As a student, I want contradictions with my base surfaced, so that I decide whether to retain or replace the disputed text.
18. As a student, I want **Keep mine**, **Use theirs**, and **Leave unresolved** controls, so that conflict handling remains explicit.
19. As a student, I want the exact replacement previewed before choosing **Use theirs**, so that I understand the consequence of my decision.
20. As a student, I want uncertain information reviewed individually, so that uncertainty never becomes automatic acceptance.
21. As a student, I want additions inserted near the relevant heading, so that my topic order is preserved.
22. As a student, I want original wording and shorthand retained, so that accepting new information does not turn my notes into unrelated polished prose.
23. As a student, I want to accept or reject individual proposals, so that I control the merged document.
24. As a student, I want to accept ordinary additions, details, and examples together, so that routine review can be completed quickly.
25. As a student, I want conflicts and uncertain proposals excluded from bulk acceptance, so that they always receive individual attention.
26. As a student, I want to reverse acceptance, rejection, and conflict decisions before export, so that review mistakes are recoverable.
27. As a student, I want a stable base during review, so that proposals refer to the same original document throughout the session.
28. As a student, I want source names visible and original quotations available on expansion, so that I can inspect the evidence without cluttering each card.
29. As a student, I want confidence shown only when the verified classification API supplies a usable confidence value, so that the interface does not invent certainty.
30. As a student, I want clear counts and friendly change labels, so that I understand what the comparison found.
31. As a student, I want already-covered information collapsed by default, so that review focuses on decisions I need to make.
32. As a student, I want only accepted edits in the final document, so that rejected and pending proposals cannot leak into export.
33. As a student, I want unresolved conflicts to leave my base unchanged, so that I can export without being forced into a decision.
34. As a student, I want a remaining-review count when exporting, so that I know some proposals were not applied.
35. As a student, I want formatted PDF export when practical, so that I can keep using a readable document.
36. As a student, I want Markdown download and copy as a fallback, so that exporting never depends on exact PDF reconstruction.
37. As a student, I want failed comparisons to preserve my inputs and offer retry, so that transient errors do not force re-uploading.
38. As a demo presenter, I want prepared English PDFs covering all relationship categories, so that I can demonstrate the full flow reliably.
39. As a demo presenter, I want a clearly labeled saved-result fallback, so that an API failure does not prevent explaining the interaction.
40. As a developer cloning my personal project, I want normal local setup instructions and sample usage, so that I can run the application without a hosted service.
41. As the project owner, I want truthful descriptions of the tools actually used, so that the application and repository do not claim unimplemented integrations.
42. As a student, I want a proposed new section for relevant unmatched information if time permits, so that new topics can be included without reorganizing existing sections.

## Implementation Decisions

### Current state and vocabulary

- The repository is empty apart from Git metadata. No implementation, existing tests, domain glossary, ADRs, remote, or issue-tracker configuration was found.
- Product and intended repository name: **MergMyMotes**. The existing workspace name is not the product spelling.
- A **base document** is the user's immutable original notes during a review session. A **comparison source** is one of the other uploaded PDFs. A **claim** is a small semantic unit retaining its source context. A **proposal** pairs a claim classification with an exact suggested edit or explicit no-edit outcome. A **review decision** is separate from the suggested action.

### Input and extraction

- Accept exactly two or three PDFs per comparison: one base plus one or two comparison sources. Reject additional files and other input formats. No plain-text input flow is required.
- Support selectable-text PDFs only. Reject scanned, empty, unreadable, or failed-to-extract documents with a clear message. Never silently skip a failed source.
- Use short, single-column prepared PDFs for the demonstration. A 20-page total input cap is the working demo limit adopted from the interview defaults.
- Identify the base explicitly and retain source names and source types. Source type never determines factual authority.
- Extract text and available structural cues into an internal representation suitable for headings, ordered blocks, and minimal insertions. Original font metrics, columns, pagination, and exact appearance are not guaranteed.

### Semantic comparison and provider boundary

- Use only supplied document material. Do not supplement from outside knowledge or present the app as a fact checker. Treat document contents as comparison data, not instructions that can override application rules.
- Split mixed-content sentences into reviewable claims while preserving source quotations and surrounding context internally.
- Classify each candidate with separate relationship and action fields. Relationships are duplicate, new information, elaboration, example, contradiction, and uncertain. Actions are add, ignore, and review.
- Duplicates map to ignore; ordinary additions and elaborations map to add; relevant examples may be added; contradictions and uncertainty map to review. An add recommendation remains pending until the user accepts it.
- Relevance means relevant to the supplied lecture/topic. Exclude unrelated content rather than adding everything absent from the base.
- Consolidate semantically matching external claims into one proposal with multiple supporting sources. Flag incompatible versions across external sources even when the base is silent.
- Keep extraction, semantic comparison, review/application, and export as conceptual responsibilities behind a small application workflow. Prefer Next.js, TypeScript, React, Tailwind, server-side OpenAI access, and in-memory session state; avoid extra infrastructure.
- Keep model and classification-provider selection configurable. Verify actual OpenAI access and response schemas during implementation. Use the Decisions API only if available and suitable; otherwise use a verified accessible OpenAI API with structured results. Availability and specific model claims from earlier discussions are not verified requirements.
- Show confidence only if the verified classification API returns a usable native confidence field. Omit it otherwise. Do not synthesize percentages or substitute model-generated estimates. If shown, describe its actual meaning; it is not proof that the source claim is true.
- Keep credentials server-side and out of the repository. API billing/key availability still needs environment verification. Development API calls have a $5 spending cap.
- Preserve proposal identity, source names and quotations, supporting sources, normalized claim, target location, classification, exact proposed content, optional native confidence, and review decision.

### Review and exact edit application

- Use an English note-editor interface with readable notes and changes views. Avoid code/Git visual presentation and raw enum labels. Use labels such as Already covered, New information, Useful detail, Example, Conflict, and Needs review.
- Show proposed insertions with restrained highlighting and source names. Expanded detail reveals original quotations. Page numbers need not be displayed.
- Freeze the base during review. Do not support manual base editing or editing generated proposals in this version. Changed inputs start a new comparison.
- Ordinary changes are insertions only. Preserve existing wording, headings, topic order, shorthand, and style; do not polish or reorganize the base.
- Explicit **Use theirs** conflict resolution is the only replacement exception. Preview the exact affected base text and proposed replacement before applying it. **Keep mine** resolves without changing the base; **Leave unresolved** also leaves it unchanged.
- For conflicts solely among external sources, show their competing versions as one conflict group. An explicit choice inserts only the selected version; leaving it unresolved inserts neither. This is a specification clarification of the agreed rule that incompatible sources require a user decision.
- Offer individual accept/reject controls and a bulk acceptance action for ordinary additions, elaborations, and examples only. Conflicts and uncertain items never enter the bulk action.
- Decisions remain reversible before export. Rebuild current notes from the immutable base plus currently approved exact edits so reversal restores the corresponding earlier state. Do not run a final generative rewrite.
- Apply insertions in a stable, deterministic order. Overlap/staleness detection is deliberately deferred; this is a known limitation for competing edits to the same passage and must not be represented as solved.
- Compute original-versus-current textual changes programmatically for applied-edit highlighting. Do not ask the model to invent diff markup.
- Comparison summary counts derive from actual proposals. Collapse duplicates by default. Basic type filters are useful after the core review flow works.
- If straightforward after the main path works, offer an explicitly approved new section at the end for relevant unmatched claims. Otherwise leave such claims unapplied and explain the missing placement; never force them into an unrelated section.

### Export, runtime, and delivery

- Export only accepted insertions and explicitly chosen conflict replacements. Pending, rejected, and unresolved proposals are excluded. Show outstanding review counts without blocking export.
- Prefer a newly generated PDF retaining best-effort headings, bold text, readable layout, and similar fonts where practical. Exact reproduction of the uploaded PDF is not promised. If this threatens the core flow, deliver Markdown download and copy instead.
- Provenance is available in review; citations in exported notes are not required for this version.
- Keep document state in memory. Refresh loses the session; make that behavior clear. No accounts, database, or persistence.
- On model failure, retain inputs and allow retry. Provide a separately labeled saved-example result, never presented as a successful live call.
- The planned synthetic English demo material covers all six relationships, at least two clear contradictions, ambiguity, and cross-source agreement/disagreement. Creation of those PDFs is explicitly deferred until authorized; this document does not create fixtures.
- Deliver a local prototype and a public repository named MergMyMotes under the owner's authenticated GitHub account once implementation/repository creation is authorized. Write normal personal-project setup and usage documentation, without reviewer-oriented framing. Do not deploy or host.
- Prepare concise application pitch and five-minute-demo text based only on working, verified capabilities. The owner supplies personal application fields and submits manually. A short recorded successful run is useful fallback evidence if time permits.

## Testing Decisions

- **Proposed primary testing boundary:** the public application workflow, from uploading PDFs through comparison, review decisions, and downloaded/copied output. Confirm this boundary with the owner before implementation; it was not separately approved in the product interview.
- There is no existing test framework or prior testing pattern in this repository. Add the smallest meaningful workflow integration/browser coverage rather than tests tied to component internals or model prompts.
- Exercise extraction, semantic-result validation, review/application, and export through that high-level flow. Replace the external model provider with controlled responses for repeatable behavior checks, keeping internal application responsibilities real.
- Good tests assert user-visible outcomes: unsupported inputs are rejected; a failed source is not silently omitted; duplicates do not enter final notes; an accepted insertion appears once; rejected and unresolved suggestions do not appear; reversing a decision removes its effect; a selected conflict replacement changes only the previewed text.
- Verify agreement across sources yields one proposal with multiple sources, and external-source disagreement requires an explicit choice. Verify bulk acceptance excludes conflicts and uncertainty.
- Verify unchanged base passages retain their wording, final output exactly reflects approved previews, and stable insertion order does not depend on the order of clicks. Do not claim tests establish general overlap handling, which is out of scope.
- Verify fabricated confidence is absent when no usable native field is supplied, and saved results are visibly distinguished from live results.
- Check Markdown/copy output against the accepted final document. If PDF export ships, inspect a rendered result for headings, bold text, clipping, readability, and accepted-only content; do not assert exact original layout preservation.
- Separately run a small live-provider smoke evaluation on the eventual synthetic PDFs within the $5 budget. Controlled provider responses establish application behavior, not semantic model quality. Inspect live duplicates, additions, elaborations, examples, ambiguity, and conflicts for correct handling and grounded source quotations.
- Demo acceptance requires one full local run showing a paraphrased duplicate ignored, a useful detail accepted without rewriting the base, and a contradiction explicitly reviewed. An unapproved edit, unsupported invented content, or missed seeded conflict is a failed demonstration to fix before claiming the flow works.

## Out of Scope

- Hosted deployment or public live generation.
- OCR, scanned or handwritten PDFs, dependable table/diagram interpretation, complex multi-column reconstruction, Word/PowerPoint input, plain-text upload/paste, and more than two comparison sources.
- Exact preservation of original PDF typography, pagination, or layout.
- Outside-knowledge enrichment, automated factual verification, source authority ranking, or treating agreement as proof.
- Automatic conflict resolution, generated compromises, and an Ask AI conflict action.
- Ordinary sentence replacement, wholesale regeneration, stylistic cleanup, and document reorganization.
- Manual base edits during review and manual editing of proposed text.
- Overlapping-edit detection, stale-edit checking, and a general collaborative editor.
- Invented confidence values and unverified claims of particular API/model integrations.
- Authentication, database, persistent projects, and session recovery after refresh.
- Broader product commercialization, arbitrary large-document support, and polish beyond what supports a reliable local demonstration.
- Building the application or creating sample PDFs as part of this spec-writing request.

## Further Notes

- These decisions supersede conflicting portions of the original NoteMerge concept: the final name is MergMyMotes; PDF-only input is mandatory; the upload count is bounded; Use theirs is an explicit replacement exception; there is no hosting or fixed feature freeze; the submission target is 19:30 Madrid rather than the earlier 19:50 target.
- PDF export and unmatched-topic new sections are conditional enhancements, not reasons to miss the working compare/review/merge path. Markdown/copy is the accepted export fallback.
- The screenshot supplies application-field context, not permission to submit a form. The specification request authorizes documentation and the invoked skill's tracker publication, not implementation or fixture creation.
- No issue tracker or Git remote is configured. This local document is the complete publication-ready spec, but has not been published as an issue or assigned a remote label. Tracker destination and the proposed test boundary remain to be confirmed.
