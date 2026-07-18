# Visual release-gate baselines

The refresh screenshots capture the approved entry flow and gameplay redesign.
They are grouped by operating system because text rasterization differs between
macOS and the Ubuntu CI runner:

- Home at 390 x 844 and 1280 x 800
- profile, lobby, and Settings at 390 x 844
- the refreshed first-round Czar state at 390 x 844

The Czar fixture covers the production game shell, round metadata, question
paper, waiting state, and fixed status dock. Generated room and question copy
are normalized or masked; the product UI remains part of the pixel comparison.
The gate uses a maximum differing-pixel ratio of `0.002` after dynamic regions
are excluded. The broader player, judging, reveal, interstitial, panel, and
results states are rendered and exercised independently in Storybook.

Baseline changes are deliberately opt-in. After visually reviewing an
intentional refresh, regenerate only the collection for the current operating
system with:

```sh
UPDATE_VISUAL_BASELINES=1 npx playwright test tests/e2e/visual.spec.ts --grep "approved refresh"
```

Then inspect the image diff in `tests/visual/refresh/` and run the same tests
without update mode before committing:

```sh
npx playwright test tests/e2e/visual.spec.ts --grep "approved refresh"
```

Never accept a new baseline merely because a test failed. The changed images
should be reviewed alongside the corresponding intentional UI change so the
approval remains auditable in Git.

CI uploads `test-results/` and `playwright-report/` whenever the browser job
fails so the rendered screenshots and pixel diffs remain available for review.
