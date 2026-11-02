# Invoice Builder

A small web app for freelancers: build, preview and print invoices.
Stack: React + Vite + TypeScript + Tailwind + shadcn/ui. Phase 1 has no backend (localStorage).

## Commands

- Install: `npm ci`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Test: `npm test`
- Screenshots: `npm run shots` (saves PNGs to `.superpowers/shots/`)
- Visual regression: `npm run test:visual`
- Build: `npm run build`

Done means lint, typecheck, test and build all ran in this session and you showed the real output.
The first task of the plan creates these scripts. Until it is merged they do not exist.

## Agents

- `design`: brainstorming, spec, plan. Writes only `docs/superpowers`, `docs/design` and `.superpowers`. I start it on a `docs/...` branch. It commits the spec and the plan there, then stops. It never executes a plan, even if the handoff asks which approach to use.
- `build`: TDD, implementation, review, finish. I start it inside the worktree.

## Language

- Chat with me in Indonesian. Code, comments, docs, commits, issues and PRs are in English.

## How we work

- Process comes from Superpowers: brainstorming, spec, plan, worktree, TDD, review, finish. Do not skip a stage because the work looks small. Announce the skill you use.
- Amount of code comes from Ponytail: the smallest change that fully delivers the approved spec.
- If the two disagree about process (tests, review, planning), Superpowers wins. If they disagree about how much code to write, Ponytail wins, but never below the approved spec.
- Scope is the approved spec in `docs/superpowers/specs/`. If the work needs more, stop and ask.

## Stack rules

- UI: use the shadcn/ui components in `src/components/ui/` before any native element or custom widget.
- Style: Tailwind with the tokens in `docs/design/tokens.md`. No hard-coded colors, spacing or font sizes.
- Money: integer minor units, never floats. All money math lives in `src/lib/money.ts`.
- No new dependency without asking.

## UI fidelity

- Reference: mockups in `docs/design/mockups/` (PNG, 1440x900 and 390x844) and the tokens in `docs/design/tokens.md`.
- After a UI change, run `npm run shots`, read the PNGs next to the mockup, and list every visible difference (layout, spacing, color, type, copy). Fix them or ask. Show the list.
- `npm run test:visual` compares against the baselines in `docs/design/baselines/`. Never run `test:visual:update` and never edit a baseline. Only the human approves a new look.

## Git

- One issue per task, one PR per issue. Branch `type/short-description` (for example `feat/money-engine`) in a worktree under `.worktrees/`. Never commit to `main`. Never push.
- Conventional Commits `type(scope): description` (feat, fix, refactor, chore, docs, test): imperative, lowercase, no trailing period. One task per commit.
- Issues and PR text in English. Every PR states its labels and milestone, and links its issue with `Closes #N`.
