# Physics/input independent review — cycle 2

Reviewed PLAN.md, frozen types, physics, route clock, input, focused tests and the UI keyboard hold integration. Inspected the implementation before consulting cycle 1. Requested focused run: 19/19 tests passed; additional cradle pivot run: 1/1 passed. Rapier still emits its initialization deprecation warning.

## Findings and remaining acceptance gaps

1. **P1 acceptance gap — Sustained hanging and swing transfer remain unproved.** The new pivot replay establishes a useful, real Rapier result: a front wheel stays near the cradle while the bicycle rotates more than .9 radians over .5 seconds, with bounded axle error and no helmet collision. It does not establish a sustained stable hang, a controlled release, or transfer onto a moving swing. The swing radius test has no bicycle contact. Preserve these as incomplete acceptance gates; require a replay with an actual catch, sustained support, release and successful landing/transfer before claiming the central mechanic is validated.

2. **P2 validation gap — Actual supporting-platform carry integration remains untested.** `carriedTravel` now prevents the fabricated reverse displacement identified in cycle 1, and the contact path filters persistent wheel contacts by their gravity-supporting normal. However, its tests only exercise scalar arithmetic, while the actual temporal-platform test keeps its platform far from the bicycle. Those tests cannot detect a mistaken contact orientation, support transition, or lag between sampled rider displacement and platform displacement. Add an actual contact replay covering carried/braked and freely rolling riders, first landing, detachment, side contact and reversal. The conservative policy also intentionally treats same-direction rider travel up to platform travel as carry; verify that this does not prevent useful forward progress on the authored puzzle route. No reproduced regression is claimed here.

## Resolved findings

- Separate target and collider phase preserve equal route displacement at unequal speeds, and the return-distance test settles both clocks to the original phase away from endpoint saturation. Collider catch-up remains bounded at 2 metres/second along the longest trajectory. Movement after stopping, and temporary continued forward collider motion while the rider reverses against an outstanding target, follow the documented catch-up model.
- Motion samples expire after 500 ms; blur, hidden-tab and explicit reset clear samples and calibration. The first subsequent sample recalibrates. Asynchronous permission completions are generation-guarded, including denial/error paths.
- Space on a focused button is left to the button handler. The UI implements Space/Enter hold and releases it on keyup, focus loss, window blur and hidden tab. Ordinary global Space braking remains available. This is supported by source inspection, not a real-browser keyboard integration replay in these focused suites.
- Brake torques remain finite, bounded, equal/opposite wheel/chassis resistance. The new cradle test materially improves pivot evidence without claiming a completed hanging/transfer gate.

No additional demonstrated implementation defect was found in this bounded second review. Physical-device IMU feel and performance remain unverified.
