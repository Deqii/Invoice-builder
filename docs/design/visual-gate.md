# Visual regression gate

The visual gate compares fixed screenshots of the app with the approved
baselines in `docs/design/baselines/`. It is a regression guard, not a proof
of fidelity. Fidelity is checked once by comparing the baselines with the
mockups in `docs/design/mockups/`.

## Human only flow

These steps run in the human's own terminal. The build agent never runs the
update command, never edits a baseline and never creates
`docs/design/baselines/`.

1. Check that port 5173 is free:

   ```bash
   netstat -ano | grep :5173
   ```

   If something listens on the port, stop it first. Playwright reuses an
   existing server, so a leftover dev server would be captured silently.

2. Confirm that no baseline exists yet and run the gate:

   ```bash
   ls docs/design/baselines
   npm run test:visual
   ```

   Expected: exit 1. Every test fails only with
   `A snapshot doesn't exist at .../docs/design/baselines/<name>-<project>.png`.
   Any other failure is a real problem and must be fixed before continuing.
   No PNG is written to `docs/design/baselines/`.

3. Create the first baselines in the human's own terminal:

   ```bash
   npm run test:visual:update
   ```

4. Open every PNG in `docs/design/baselines/` and compare the eight mocked
   screens with the PNGs in `docs/design/mockups/`:

   - `list-desktop.png` and `list-mobile.png`
   - `preview-desktop.png` and `preview-mobile.png`
   - `editor-desktop.png` and `editor-mobile.png`
   - `profile-desktop.png` and `profile-mobile.png`

   The other baselines are regression only. They have no mockup and no pixel
   target.

5. Run the gate twice and expect all tests to pass both times:

   ```bash
   npm run test:visual
   npm run test:visual
   ```

6. Commit the approved baselines.

## Known deliberate differences

These are expected and approved before the first baseline set:

- Mobile preview item meta has no unit suffix. The app renders
  `24 x $45.00`; the mockup HTML still shows `24 h x $45.00`. Spec section 16
  wins over the mockup.
- Badge radius. The mockup uses `border-radius: 999px`; the app uses
  Tailwind `rounded-full`. Both render as a pill. The computed radius value
  differs, the look does not.
- Notes divider width. The approved PNG mockup draws the divider about 520 px
  wide. The mockup HTML source keeps the divider at the full content width
  (696 px at 1440). The app follows the PNG and the approved spec: 520 px on
  desktop, full content width on mobile.
- Focus rings. The app keeps its current autofocus and focus-visible
  behaviour. Baselines with a visible focus ring: `profile`,
  `delete-dialog`, `validation-errors`, `first-run-profile` and
  `remove-last-item`. `list-menu` has a focused menu item with the page
  background highlight, not an outline ring.
- Box level differences with no visible effect: the editor page title box
  spans the content width while the mockup title box is content sized; input
  vertical padding is 4 px in the app and 0 px in the mockup while the text
  is vertically centered in both; the profile dialog overlay has no padding
  in the app while the mockup has 16 px, with the same dialog size at both
  reference viewports.
- The list behind the profile dialog is taller in the app than in the
  mockup, because the app keeps the full list behind the overlay. It is
  dimmed and partly hidden.

## Rules

- Never edit a baseline by hand. Only the human approves a new look.
- `updateSnapshots` stays `none` and `test:visual:update` is human only.
- Baselines are valid only for the same OS and the same Playwright and
  Chromium version: Windows, Playwright 1.65.0.
- The threshold is 0 and `maxDiffPixels` is 0. Any rendering change fails,
  including sub pixel changes, and must be reviewed by the human.
- A failure that is not a missing baseline means the screen changed. Fix the
  code or ask the human to approve a new baseline.
