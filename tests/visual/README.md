# Legacy visual baselines

These screenshots were captured from the archived Firebase build at commit
`b4ba1e1` with Chromium at the two release-gate viewports:

- mobile: 390 x 844
- desktop: 1280 x 800

They are evidence for the Vue 3 port's visual freeze. Automated comparisons
must use a maximum differing-pixel ratio of `0.002` after masking dynamic room,
player, card, and timer text. The only accepted product differences are those
listed in the overhaul specification: five-letter codes, removal of shuffle and
Public Game controls, the card-license footer link, and server/reconnect copy
shown through existing components.

The fixtures intentionally preserve several state-specific captures in addition
to Home. New baselines must never be accepted merely because a test failed;
compare them against the archived build and document the approved exception.
