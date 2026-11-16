# Invoice Builder v0.1 release checklist

## Metadata

| Item | Value |
|---|---|
| Checklist date | 2026-11-16 |
| Base commit | d8c3534280d21611a7408de99a8f8545afbf81fd |
| OS | Windows 10.0.26200.9711 |
| Node | v22.13.0 |
| npm | 11.0.0 |
| Playwright | 1.65.0 |
| Chromium | 158.0.8127.18 (playwright chromium v1254) |

The branch is `chore/release-checklist` in worktree `.worktrees/chore-release-checklist`.
The browser tests run against the Vite dev server on port 5173.

## Gates

Every result below comes from a command run in this session. `test:visual` was run twice as required.

| Command | Expected | Real result |
|---|---|---|
| `npm run lint` | exit 0, 0 warnings | exit 0, no warnings printed |
| `npm run typecheck` | exit 0 | exit 0 |
| tests-tsc (throwaway tsconfig outside the repo) | exit 0 | exit 2, see below |
| `npm run build` | exit 0 | exit 0, `built in 1.40s` |
| `npm test` (default) | exit 0, 1 timezone test skipped | exit 0, `269 passed`, `1 skipped` (270) |
| `cmd //c "set TZ=Asia/Jakarta&& npm test"` | exit 0, 0 skipped | exit 0, `270 passed (270)` |
| `cmd //c "set TZ=America/Los_Angeles&& npm test"` | exit 0, 0 skipped | exit 0, `270 passed (270)` |
| `npx playwright test tests/e2e` | exit 0, whole folder green | exit 0, `66 passed`, `4 skipped`, 0 failed |
| `npm run shots` | exit 0, 15 passed, 1 skipped | exit 0, `15 passed`, `1 skipped` |
| `npm run test:visual` run 1 | exit 0, 28 passed, 2 skipped | exit 0, `28 passed`, `2 skipped` |
| `npm run test:visual` run 2 | exit 0, 28 passed, 2 skipped | exit 0, `28 passed`, `2 skipped` |

### tests-tsc

`tsc -b` does not cover `tests/**`. A throwaway `tsconfig.tests.json` outside the repo
(baseUrl and typeRoots pointed at the worktree, `include` pointed at `tests/**/*.ts`)
was run with:

```bash
npx tsc -p "C:/Users/user/AppData/Local/Temp/opencode/tsconfig.tests.json"
```

Result: exit 2.

```text
tests/e2e/print.spec.ts(259,61): error TS2339: Property 'size' does not exist on type 'CSSStyleDeclaration'.
```

This is a pre-existing type error in `tests/e2e/print.spec.ts`, not in the new release
test. It does not fail the Playwright run because Playwright transpiles without type
checking. No app or test file was changed to hide it.

### Skipped e2e tests and their reasons

- `tests/e2e/invoice-editor.spec.ts:188` "keeps the editor inside the viewport at 390, 360 and 320": `mobile only`, skipped in the desktop project.
- `tests/e2e/invoice-list.spec.ts:175` "places the open menu at the mockup offsets from the trigger": `desktop only`, skipped in the mobile project.
- `tests/e2e/print.spec.ts:44` "hides chrome and prints only the paper at A4 width": `fixed A4 viewport`, skipped in the mobile project.
- `tests/e2e/print.spec.ts:244` "A4 page rule, more than one page and a 36pt top margin on page two": `chromium pdf, fixed viewport`, skipped in the mobile project.

## Acceptance criteria (spec section 22)

| # | Criterion | Evidence | Status |
|---|---|---|---|
| 1 | Money engine: integer cents, half-up, discount before tax, worked example, functions in `src/lib/money.ts` | `src/lib/money.test.ts` (unit) | covered |
| 2 | Numbering: format, per year, no reuse, counter survives reload, duplicate gets a new number, collision aborts, field read-only | `src/lib/numbering.test.ts`, `src/lib/storage.test.ts`, `tests/e2e/invoice-editor.spec.ts` "saves a new invoice with the next seeded number and keeps it after reload", "assigns INV-2026-001 for the first invoice in an empty store", "keeps the number when the issue date changes", "backdates to 2025 with the keyboard and gets a 2025 number", `tests/e2e/two-tab-numbering.spec.ts` | covered |
| 3 | Create: today and today + 14, one empty item, zero discount/tax, draft, Bank transfer, save validates, assigns, persists, opens preview | `tests/e2e/invoice-editor.spec.ts` "saves a new invoice with the next seeded number and keeps it after reload", `tests/e2e/release.spec.ts` "persists the profile and invoices across reload" | covered |
| 4 | Duplicate: stored draft immediately with a new number, issued today, due today + source net days, opens editor, cancel keeps the draft | `src/routes/invoice-list.test.tsx` "duplicates with a complete profile and opens the editor", "gates duplicate with an incomplete profile and creates nothing on cancel", "shows the unique-number error when duplicate collides" | covered |
| 5 | List: newest first, count, row opens preview, menu matches status, status persists, delete confirms and does not reuse the number, mobile cards and menu, empty state | `tests/e2e/invoice-list.spec.ts`, `src/routes/invoice-list.test.tsx` | covered |
| 6 | Status: stored draft/sent/paid, overdue derived only for sent and past due, no stored overdue, menu matches, editing keeps status | `src/lib/status.test.ts`, `src/routes/invoice-list.test.tsx` "shows the menu items for each stored status", `src/routes/invoice-editor.test.tsx` "keeps the number and status when an existing invoice is edited" | covered |
| 7 | Preview: matches mockups, payment lines, line breaks, no "h" on mobile, empty notes hidden, Edit opens editor, Preview PDF and Print open the print dialog | `src/routes/invoice-preview.test.tsx`, `tests/e2e/print.spec.ts`, `tests/visual/preview.visual.spec.ts`, baseline comparison in Task 9 | covered |
| 8 | Print: only the paper, chrome hidden, A4 portrait, colours preserved, rows do not split | `tests/e2e/print.spec.ts` "hides chrome and prints only the paper at A4 width", "A4 page rule, more than one page and a 36pt top margin on page two"; browser print preview is manual below | partly covered |
| 9 | Profile: opens from avatar and Edit profile, three required fields, initials, localStorage persistence, every invoice shows current profile, missing profile gate | `src/components/profile-dialog.test.tsx`, `src/routes/invoice-list.test.tsx` "gates New invoice with an incomplete profile", "gates the empty-state CTA with an incomplete profile", `tests/e2e/release.spec.ts` test B | covered |
| 10 | Persistence and errors: reload keeps data, no network calls, storage failure, parse failure, Web Locks serialization, refusal without locks, duplicate numbers rejected | `tests/e2e/release.spec.ts` test A and test B, `src/lib/storage.test.ts` "writes without navigator.locks", `src/lib/storage-errors.test.ts`, `tests/e2e/two-tab-numbering.spec.ts`, `tests/visual/states.visual.spec.ts` "storage write error" | covered |
| 11 | Responsive: 390 and 1440 match mockups, no horizontal scroll | `tests/e2e/invoice-list.spec.ts`, `tests/e2e/invoice-editor.spec.ts` "keeps the editor inside the viewport at 390, 360 and 320", `tests/e2e/print.spec.ts` overflow tests, `tests/visual/*.visual.spec.ts` | covered |
| 12 | Accessibility: keyboard reaches every action, labels, errors, dialog focus, status text, visible focus ring | `src/components/profile-dialog.test.tsx` focus tests, `src/routes/invoice-list.test.tsx` "makes only the number link and the actions button focusable in a row", `docs/design/visual-gate.md` focus ring baselines; full keyboard pass is manual below | partly covered |
| 13 | Quality gates: lint, typecheck, test, build, self-hosted Inter, visual gate, approved dependencies | Gates table above, build output checks below, dependency audit below | covered |

## Manual checks

These are PENDING HUMAN. The automated tests do not replace them.

### PENDING HUMAN: browser print preview

1. Run `npm run dev` and open `http://localhost:5173/invoices/inv-014`.
2. Press Ctrl+P in the browser.
3. Confirm A4 portrait and that only the invoice paper appears: no app header, toolbar, nav, buttons or page background.
4. Confirm colours are kept and that invoice rows do not split across pages.
5. For a long invoice, confirm page two keeps the 48 px top margin.

### PENDING HUMAN: keyboard pass

1. Open `http://localhost:5173/` and use only the keyboard.
2. Tab through the header, New invoice, the invoice number links and the row action menus.
3. Confirm every action is reachable and the focus ring is visible at every stop.
4. Open a dialog and confirm focus is trapped, Escape closes it and focus returns to the trigger.

### PENDING HUMAN: storage blocked

1. Open the app in a browser profile where localStorage is blocked (or block storage for the site).
2. Confirm the app opens without crashing and shows the storage error path.
3. Confirm saving keeps the form contents and shows an error instead of navigating away.

## Build output checks

Command:

```bash
grep -rlE "fonts\.(googleapis|gstatic)\.com" dist index.html
```

Real output: nothing printed, exit 1. No Google Fonts reference is in `dist` or `index.html`.

Command:

```bash
ls dist/assets | grep -i woff2
```

Real output:

```text
inter-latin-wght-normal-Dx4kXJAl.woff2
```

Inter is bundled as a local woff2. `dist/` was not committed.

## Dependency audit

`package.json` was compared by hand with spec sections 5 and 24. Nothing was installed
or removed.

Runtime dependencies:

| Package | Basis |
|---|---|
| `react`, `react-dom` | React stack, spec section 5 |
| `tailwindcss`, `@tailwindcss/vite`, `tw-animate-css` | Tailwind stack, spec section 5 |
| `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge` | shadcn/ui setup |
| `lucide-react` | shadcn icon default, not an icon pack outside the shadcn setup |
| `react-hook-form`, `@hookform/resolvers`, `zod` | shadcn Form setup, not a form library outside it |
| `date-fns`, `react-day-picker` | shadcn Calendar and date picker setup, not a date library outside it |
| `@fontsource-variable/inter` | explicit in spec section 5 |

Dev dependencies:

| Package | Basis |
|---|---|
| `vitest`, `@testing-library/*`, `@playwright/test` | explicit approved dev tooling, spec sections 5 and 24 |
| `typescript`, `typescript-eslint`, `eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` | lint and typecheck tooling |
| `vite`, `@vitejs/plugin-react`, `jsdom`, `@types/*` | build and test environment |

Result: no router package, no PDF package, no date, form or icon library outside the
shadcn setup. No package outside the approved stack was found.

## Visual baselines

The first baseline set was approved and merged in Task 9, PR #20
(`Merge pull request #20 from Deqii/test/visual-gate`, commit `d8c3534`).

- Human name: PENDING HUMAN
- Human date: PENDING HUMAN

The baselines are valid only for Windows and Playwright 1.65.0. The threshold is 0 and
`maxDiffPixels` is 0. The visual gate is a regression guard, not proof of fidelity;
fidelity was checked once against the mockups during baseline approval.

## Known limitations

- Editing the seller profile changes how already sent or paid invoices render and print.
- There is no live cross-tab sync, so an open tab can show stale data until reload.
- Saving requires the Web Locks API and is refused with an error where it is unavailable.
- Data is stored only in this browser's localStorage.
- The browser release test ran against the dev server (Vite on port 5173), not the production build.
- Web Locks behaviour was only exercised in Chromium.
- Deployment configuration such as a SPA rewrite is not part of the v0.1 gates.

## Gaps found

- Criterion 8 print: the browser print preview and page break behaviour are manual only. The automated tests check the print media styles and a generated PDF, not the browser dialog.
- Criterion 12 accessibility: there is no automated full keyboard pass across every screen and no automated visible focus ring assertion outside the visual baselines. The keyboard pass is manual.
- The storage-blocked first launch is manual only. Storage failure and parse failure are covered by unit tests, but not by an end-to-end test with the browser storage API blocked.
- tests-tsc is not green because of the pre-existing `print.spec.ts:259` type error. This is outside the v0.1 app scope but means the test folder is not type checked clean.
- Web Locks was exercised only in Chromium, so other browser engines are not proven for that behaviour.

## Release decision

PENDING HUMAN.

All automated gates above are green except tests-tsc, which has one pre-existing
type error in `tests/e2e/print.spec.ts`. The three manual checks and the baseline
sign-off are pending.
