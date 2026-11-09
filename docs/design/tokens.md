# Invoice Builder — Design Tokens

Source of truth: `docs/design/mockups/src/preview.html` and
`docs/design/mockups/src/base.css`.

The shared values are identical in both files. Tokens marked **new** come from
`base.css` only. There are 12 of them: 10 colours, 2 shadows.

The app must use these tokens instead of Tailwind palette classes or arbitrary
values. `AGENTS.md` makes this a stack rule.

The mockup sources in `docs/design/mockups/src/` still use the pre-rename token
names. They are reference only and are not edited; this file is the source of
truth for the app.

## CSS variables

```css
:root {
  /* colours — preview.html and base.css */
  --page: #f5f5f4;                    /* stone-100 */
  --paper: #ffffff;
  --ink: #0f172a;                     /* slate-900 */
  --ink-muted: #475569;               /* slate-600 */
  --ink-faint: #94a3b8;               /* slate-400 */
  --line: #e2e8f0;                    /* slate-200 */
  --line-strong: #cbd5e1;             /* slate-300 */
  --brand: #0f766e;                   /* teal-700 */
  --on-brand: #ffffff;
  --sent-bg: #dbeafe;                 /* blue-100 */
  --sent-ink: #1d4ed8;                /* blue-700 */

  /* colours — new in base.css */
  --draft-bg: #f1f5f9;                /* new: slate-100 */
  --draft-ink: #475569;               /* new: slate-600 */
  --paid-bg: #dcfce7;                 /* new: green-100 */
  --paid-ink: #15803d;                /* new: green-700 */
  --overdue-bg: #fee2e2;              /* new: red-100 */
  --overdue-ink: #b91c1c;             /* new: red-700 */
  --danger: #b91c1c;                  /* new: red-700 */
  --muted-bg: #f8fafc;                /* new: slate-50 */
  --ring: #0f766e;                    /* new: same as brand */
  --overlay: rgb(15 23 42 / 0.5);     /* new */

  /* radius — shared */
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;

  /* shadows — shared */
  --shadow-paper: 0 1px 2px rgb(15 23 42 / 0.06),
    0 12px 32px rgb(15 23 42 / 0.08);

  /* shadows — new in base.css */
  --shadow-card: 0 1px 2px rgb(15 23 42 / 0.06); /* new */
  --shadow-pop: 0 4px 6px -1px rgb(15 23 42 / 0.1),
    0 10px 24px rgb(15 23 42 / 0.12); /* new */

  /* type — shared */
  --font: "Inter", ui-sans-serif, system-ui, sans-serif;
}

@theme {
  /* layout widths — fixed, the only allowed exception to the spacing scale */
  --container-preview: 794px;
  --container-editor: 842px;
  --container-list: 1008px;
  --container-dialog: 480px;
  --container-menu: 176px;
}
```

## Colour roles

| Token | Value | Use |
|---|---|---|
| `--page` | `#f5f5f4` | App background, active nav background, menu hover, pressed row |
| `--paper` | `#ffffff` | Cards, invoice paper, dialog, menu, inputs |
| `--ink` | `#0f172a` | Primary text |
| `--ink-muted` | `#475569` | Secondary text, labels, avatar text |
| `--ink-faint` | `#94a3b8` | Section labels, helper text, placeholders, meta labels |
| `--line` | `#e2e8f0` | Default borders and dividers |
| `--line-strong` | `#cbd5e1` | Input/button borders, table header rule, item rule |
| `--brand` | `#0f766e` | Brand mark, primary buttons, links, logo |
| `--on-brand` | `#ffffff` | Text/icons on brand |
| `--sent-bg` | `#dbeafe` | Sent badge background |
| `--sent-ink` | `#1d4ed8` | Sent badge text |
| `--draft-bg` | `#f1f5f9` | Draft badge background |
| `--draft-ink` | `#475569` | Draft badge text |
| `--paid-bg` | `#dcfce7` | Paid badge background |
| `--paid-ink` | `#15803d` | Paid badge text |
| `--overdue-bg` | `#fee2e2` | Overdue badge background |
| `--overdue-ink` | `#b91c1c` | Overdue badge text |
| `--danger` | `#b91c1c` | Delete action, destructive button, destructive error |
| `--muted-bg` | `#f8fafc` | Read-only input, seller card, muted panel |
| `--ring` | `#0f766e` | Focus ring |
| `--overlay` | `rgb(15 23 42 / 0.5)` | Dialog backdrop |

Status mapping is fixed: Draft uses draft tokens, Sent uses sent tokens, Paid
uses paid tokens, Overdue uses overdue tokens. Never use a status colour for
anything else.

## Typography

Font: **Inter** variable, covering weights 400 to 700. Fallback stack is
`ui-sans-serif, system-ui, sans-serif`. No other typeface.

Inter is self-hosted as one variable woff2 from `@fontsource-variable/inter`,
declared with `font-family: "Inter"` and `font-weight: 400 700` so `--font`
keeps working. The mockups link Google Fonts, but v0.1 must not make a runtime
font request. Do not add a font CDN link.

All money, dates, invoice numbers, quantities and percentages use tabular
figures (`font-variant-numeric: tabular-nums`).

| Token | Size / line-height | Weight | Tracking | Use |
|---|---|---|---|---|
| `label` | 12 / 16 | 600 | `0.06em`, uppercase | Section headings (`h2`), table headers |
| `caption` | 12 / 16 | 500 | 0 | Badges, avatar initials |
| `meta` | 13 / 20 | 400 | 0 | Back link, helper text, mobile item meta |
| `body` | 14 / 20 | 400 | 0 | Default body text |
| `body-medium` | 14 / 20 | 500 | 0 | Table cells, nav, buttons, menu items |
| `body-strong` | 14 / 20 | 600 | 0 | Business name, client name, totals labels |
| `app-name` | 16 / 24 | 600 | 0 | App name |
| `card-amount` | 16 / 24 | 600 | 0 | Amount on mobile invoice card |
| `dialog-title` | 18 / 28 | 600 | `-0.01em` | Seller profile dialog title |
| `page-title` | 24 / 32 | 600 | `-0.01em` | Page title (`Invoices`, `Edit invoice`) |
| `total` | 24 / 32 | 700 | `-0.01em` | Total due |
| `doc-title` | 30 / 36 | 700 | `-0.02em` | "Invoice" on the paper |

Do not introduce another size. Small variations in the mockups (for example
12 px count text) use `caption` or `meta`.

## Spacing

Base unit: 4 px. Use only this scale for spacing, expressed through Tailwind
spacing utilities. The fixed layout widths (794, 842, 1008, 480 and 176 px) are
declared in `@theme` as `--container-preview`, `--container-editor`,
`--container-list`, `--container-dialog` and `--container-menu`. Product code
uses the utilities, never arbitrary values: `max-w-preview`, `max-w-editor`,
`max-w-list` and `max-w-dialog` for fluid wrappers, and `w-menu` for the
fixed-width dropdown. Fixed-width elements use `w-<name>`; fluid wrappers use
`max-w-<name>`. Other arbitrary `px` values are not allowed.

| Step | px |
|---|---|
| `0.5` | 2 |
| `1` | 4 |
| `1.5` | 6 |
| `2` | 8 |
| `2.5` | 10 |
| `3` | 12 |
| `3.5` | 14 |
| `4` | 16 |
| `5` | 20 |
| `6` | 24 |
| `7` | 28 |
| `8` | 32 |
| `10` | 40 |
| `12` | 48 |
| `16` | 64 |

### Layout metrics

The fixed content and overlay widths map to the `--container-*` tokens above and
are used through `max-w-*` utilities. Other values are fixed component sizes,
not layout spacing.

| Item | Desktop | Mobile (≤ 640 px) |
|---|---|---|
| App header height | 64 px | 64 px |
| App header padding-x | 32 px | 16 px |
| Page padding | 32 px top, 64 px bottom | 20 px top, 16 px sides, 40 px bottom |
| Preview content max-width | 794 px | fluid |
| Editor content max-width | 842 px | fluid |
| List content max-width | 1008 px | fluid |
| Invoice paper padding | 48 px | 24 px vertical, 20 px horizontal |
| Editor paper padding | 32 px | 20 px |
| Dialog width | 480 px | fluid, 16 px overlay padding |
| Dialog padding | 24 px | 20 px |
| Input / button height | 36 px | 36 px |
| Small button height | 32 px | 32 px |
| Icon button | 32 px | 32 px (36 px in editor item rows) |
| Avatar | 32 px | 32 px |
| Brand mark | 28 px | 28 px |
| Logo | 40 px | 40 px |
| Badge height | 20 px (2 px / 10 px padding) | same |
| Dropdown width | 176 px | 176 px |
| Table header padding | 14 px 16 px | n/a |
| Table row padding | 16 px | n/a |
| Item row gap | 12 px | 12 px |
| Section separation | 32 px | 32 px |
| Field label gap | 6 px | 6 px |
| Helper text gap | 6 px | 6 px |

## Radius

| Token | Value | Use |
|---|---|---|
| `radius-md` | 6 px | Brand mark, menu items, icon button hover |
| `radius-lg` | 8 px | Inputs, buttons, seller card, logo, menu, mobile item card |
| `radius-xl` | 12 px | Cards, invoice paper, dialog |
| `radius-full` | 999 px | Badges, avatar |

shadcn/ui base radius is `8px` (`--radius: var(--radius-lg)`).

## Shadow

| Token | Value | Use |
|---|---|---|
| `shadow-card` | `0 1px 2px rgb(15 23 42 / 0.06)` | List card, invoice card |
| `shadow-paper` | `0 1px 2px rgb(15 23 42 / 0.06), 0 12px 32px rgb(15 23 42 / 0.08)` | Invoice paper (preview, editor) |
| `shadow-pop` | `0 4px 6px -1px rgb(15 23 42 / 0.1), 0 10px 24px rgb(15 23 42 / 0.12)` | Dropdown menu, dialog |

No other shadows.

## Breakpoints

| Name | Width | Behaviour |
|---|---|---|
| Desktop | > 640 px | Full app header, table, 3-column form grid, inline actions |
| Mobile | ≤ 640 px | Nav hidden; list becomes cards; editor items become cards; actions stack; paper padding shrinks |

Reference screenshots are 1440 px (desktop) and 390 px (mobile). The layout is
fluid; only 640 px changes structure. No other breakpoints are in scope.

## Focus

`outline: 2px solid var(--ring); outline-offset: 2px;` on `:focus-visible`.
Never remove the outline without an equally visible replacement.

## shadcn/ui mapping

Map shadcn semantic variables to these tokens. The warning is important:
shadcn's `--accent` is a hover surface, not the brand colour, so shadcn
`--primary` maps to our `--brand` and shadcn `--accent` maps to `--muted-bg`.

| shadcn variable | Token |
|---|---|
| `--background` | `--page` |
| `--foreground` | `--ink` |
| `--card`, `--card-foreground` | `--paper`, `--ink` |
| `--popover`, `--popover-foreground` | `--paper`, `--ink` |
| `--primary`, `--primary-foreground` | `--brand`, `--on-brand` |
| `--secondary`, `--secondary-foreground` | `--muted-bg`, `--ink` |
| `--muted`, `--muted-foreground` | `--page`, `--ink-muted` |
| `--accent`, `--accent-foreground` | `--muted-bg`, `--ink` |
| `--destructive`, `--destructive-foreground` | `--danger`, `--on-brand` |
| `--border` | `--line` |
| `--input` | `--line-strong` |
| `--ring` | `--ring` |
| `--radius` | `--radius-lg` |

## Restrictions

- No dark mode in v0.1.
- No colours, font sizes, spacing or shadows outside this file.
- No Tailwind palette classes such as `bg-slate-100` in product code.
- Status colours are reserved for status badges and destructive actions.
- Print styles reuse the same tokens except that `--shadow-paper`, borders and
  page background are dropped.
