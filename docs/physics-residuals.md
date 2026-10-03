# Physics slice — final review disposition

Two fresh-context Astra-low reviews were performed: `review-physics-1.md` and `review-physics-2.md`.

## Fix cycle 1

The owner fixed discarded temporal travel with a separate reversible target, filtered carry compensation to persistent supporting wheel contacts, conservatively handled slip, expired stale IMU samples, reset motion calibration on reset, guarded concurrent permission results, and preserved native Space activation on focused buttons. Regression coverage includes unequal-speed time reversal and actual wheel-catch/pivot physics.

## Fix cycle 2

The second independent review reran 20 focused cases and found no newly demonstrated implementation defect. A final bounded actual-contact validation added two passing supported rolling replays and two expected-failing passive-carry replays. These exposed a reproducible issue beyond the source review; no unreviewed physics retuning was applied. Remaining defects and validation gaps are recorded below instead of claiming they passed.

## Residuals

- The actual cradle fixture proves a wheel catches for half a second while the chassis pivots approximately 0.9 radians. It does **not** yet prove sustained upside-down hanging followed by release and free-wheel capture of a swing. Campaign swing-crossing replays are a different skill and do not close this gate.
- **Reproduced horizontal/oblique carry feedback:** `tests/physics-carry.test.ts` rolls for one second on a wide moving platform, then brakes and returns world angle to zero. Between seconds 3 and 4, a horizontal platform advances approximately 0.215 phase while bicycle travel relative to it changes only −0.001 metres. An oblique path advances approximately 0.229 phase for approximately 0.068 metres of relative travel. With timeTravel=1, neither should advance that much. Per-step conservative carry clipping and intermittent support contacts allow passive carrying to feed the route clock. Two explicitly expected-failing regressions preserve this defect; they are not acceptance passes. The campaign Clockwork vertical lift has no horizontal carrying component along its x route axis and its successful replay does not exercise this failure.
- Actual supported rolling now passes on horizontal and oblique platform paths. The broader contact matrix (side impacts, slip, detachment, reversals and contact transitions) remains incomplete.
- The timeline intentionally permits bounded physical catchup after stopping. It is not a general reversible rigid-body engine.
- Phone orientation is tested with synthetic sensor events, not physical hardware. HTTPS permission behavior, comfortable real-world calibration, sensor latency and device performance remain to be tested on phones.

## Reproducing the carry defect

Run `pnpm exec vitest run tests/physics-carry.test.ts`. The two `KNOWN DEFECT` cases use `it.fails`: the runner reports them as expected failures, which must not be counted as passing acceptance criteria. Remove `.fails` temporarily to see the failed timeline-versus-relative-travel assertions.

Until repaired and reviewed, author temporal platform trajectories perpendicular to `timeAxis` (for example, a vertical lift with horizontal route axis), as in the validated Clockwork campaign map. Horizontal or oblique motion along the route axis is not validated for passive carrying.
