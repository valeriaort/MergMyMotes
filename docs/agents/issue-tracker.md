# Issue tracker: GitHub

Issues and PRDs live in GitHub Issues for `valeriaort/MergMyMotes`:
https://github.com/valeriaort/MergMyMotes/issues

Use the `gh` CLI for tracker operations. Infer the repository from `origin`; use `--repo valeriaort/MergMyMotes` when operating outside this checkout.

## Conventions

- Create issues with `gh issue create --title "..." --body-file <file>`. Write multiline bodies to a temporary file first.
- Read the full issue body, labels, and comments with `gh issue view <number> --comments` and structured output as needed.
- List issues with `gh issue list`, using state and label filters as needed.
- Comment with `gh issue comment <number> --body-file <file>`.
- Apply or remove labels with `gh issue edit <number> --add-label "..."` or `--remove-label "..."`.
- Close completed issues with `gh issue close <number>` within the authorized task scope. Do not close or modify a parent issue while publishing child tickets.
- Apply `ready-for-agent` to approved, fully specified implementation tickets.
- Publish tickets only after approval of their breakdown. Create blockers first, then dependent tickets.

## Blocking relationships

Use GitHub native issue dependencies. Add an edge with:

`gh api --method POST repos/valeriaort/MergMyMotes/issues/<dependent-number>/dependencies/blocked_by -F issue_id=<blocker-database-id>`

Fetch the blocker's numeric database ID using `gh api repos/valeriaort/MergMyMotes/issues/<blocker-number> --jq .id`. Do not substitute the issue number or node ID.

Also include links to blockers in each issue's "Blocked by" section. If native dependencies are unavailable, these links are the fallback representation.

Work the frontier: a ticket may start only when all its blocking tickets are complete. A `ready-for-agent` label describes ticket readiness; it does not override open blockers.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Skill operations

When a skill says "publish to the issue tracker", create a GitHub issue. When it says "fetch the relevant ticket", read the GitHub issue and its comments.
