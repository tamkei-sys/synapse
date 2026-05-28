<!-- Thanks for the PR! Fill out the template before requesting review. -->

## What & why

<!-- One paragraph: what does this change do, and why does it need to exist? -->

## Linked PBI

Closes SYN-

## Screenshots / GIFs

<!-- Required for any UI change. Drag-drop image here. Remove section if N/A. -->

## Migration notes

<!-- Required if you changed Block schema, DB, or an integration contract. Remove if N/A. -->

## Testing

- [ ] Unit tests added or updated
- [ ] E2E tests added (required if Yjs sync or Block schema touched)
- [ ] Manual verification described below

<!-- What did you manually test, and how? -->

## ADR

<!-- If this introduces a runtime dependency, changes the Block schema, modifies an integration contract, or chooses between non-trivial implementation paths, link the ADR PR here. Remove section if N/A. -->

## Checklist

- [ ] Conventional Commit message with scope (`feat(editor):`, `fix(sheet):`, …)
- [ ] `pnpm lint && pnpm typecheck && pnpm test` passes locally
- [ ] No secrets committed; no `.env*` touched
- [ ] CLAUDE.md §11 "Things to NOT do" reviewed; nothing on the list crept in
- [ ] Self-reviewed the diff
