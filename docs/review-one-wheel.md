# One Wheel Wonder review

Reviewed 2026-10-04 in a fresh reviewer context. Scope: map 2 geometry, its replay controls, focused evidence, and player instructions. No implementation changes by this reviewer.

## Implementation assessment

The candidate replaces the thin bridge with a raised apple and a rear-wheel stop backed by a short approach ramp. This changes the task: ordinary level riding does not put the helmet or wheels high enough to intersect the elevated apple. The replay approaches slowly, catches the rear wheel with the brake, raises the front, then lowers it before continuing the route. The instruction text describes the entry, lift, and recovery explicitly.

The special replay stages apply only to map index 1. Other maps' authored geometry and production physics are unchanged. The use of snapshot feedback supplies ordinary tilt/brake controls; it does not reposition bodies or manufacture collection events.

## Independent validation

Ran `tests/campaign-early.test.ts` and `tests/physics-pivot.test.ts`: **11 tests passed across two files**. This includes completion of all five early routes and the preexisting isolated finite-brake pivot fixture.

## Evidence limits

The browser witness estimates wheel support using distance to authored rectangles with a 0.04 m tolerance. It is support-proximity evidence, not a measured contact force. The final browser and focused simulation tests explicitly tie high-apple collection to single-wheel support; the initial pivot-plus-completion coverage gap is resolved.

The automated replay uses 120 Hz angle and angular-speed feedback. Feasibility under that controller does not demonstrate the timing tolerance of a person using the visible controls, nor does one successful policy prove that all alternate solutions are excluded. Ordinary rolling negative controls should be described as tested policies rather than a universal impossibility proof. Sustained upside-down hanging and transfers onto swings remain outside this change.

## Review integration

At initial inspection, the map table still described the removed narrow beam, and an assertion-free diagnostic probe remained in the tests directory. Both items are resolved: the probe was replaced with meaningful assertions, and `docs/maps.md` plus `docs/campaign-early.md` describe the catch and updated replay time. `docs/one-wheel-fix.md` accurately qualifies the brake-free negative control and alternative-solution limits.

## Focused follow-up

Independently ran `tests/one-wheel-map.test.ts`: **3 tests passed**. First collection of the high apple is now explicitly tied to held brake, rear-only cradle support proximity, more than 0.5 m front-tyre clearance, and more than 30 consecutive one-wheel simulation steps. The same run verifies a continuous catch exceeding 120 steps, more than 0.5 radians of pivot rotation, and eventual completion with all six apples. A conventional rolling policy traverses the route and collects the other five apples while missing the high one. Removing the brake from the catch policy still collects the high apple but crashes, correctly showing that the brake provides controlled recovery rather than acting as an artificial collection gate.

Inspected `docs/evidence/one-wheel-pivot.png`: the rear wheel is visibly supported at the gold feature, the front wheel is lifted, and the mechanic text is readable at the captured 1280×800 viewport. The parent reports a rendered-browser completion in 57.733 seconds, with 186 consecutive braked one-wheel steps and 0.6655 radians of pivot rotation. Those browser numbers are parent-reported; this reviewer independently ran the simulation tests and inspected the screenshot.

No blocking implementation or focused-test finding remains. The coverage supports a useful and achievable one-wheel mechanic. Human control tolerance and universal exclusion of alternate stunt solutions remain unverified, as described above.

## Final usability and integration check

Reviewed the one-line `src/ui.ts` change that shows the selected level's hint in the pause overlay. Crash and completion messages still take their existing explicit branches, and resume behavior is unchanged. Inspected `docs/evidence/one-wheel-phone-hint.png` at 390×844: the full entry/lift/recovery hint and the Keep Riding button are visible and readable without clipping. This makes the instructions accessible on the phone layout where the in-play mechanic text is hidden.

The parent reports that the final browser test also records high-apple collection with exactly one supported wheel, cradle proximity, and a frame angle of 0.44659057 radians, followed by all-six-apple completion in 57.733 seconds. The parent additionally reports the full unit runner, TypeScript check, and Pages build passing (91 acceptance passes plus two unchanged expected-failure cases). These broader runs were not repeated by this reviewer. All review integration items are closed; no new actionable finding arose from the usability change.
