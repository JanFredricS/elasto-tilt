# Foucault’s Hall

*The floor turns beneath the swing.* Campaign map 13 (index 12, difficulty 9.75), between the Hanging Garden and the Clockwork Apple. Sand palette. Source: `src/levels/foucault-hall.ts`; tests: `tests/foucault-hall.test.ts`.

## Route

A long mill hall over three water pools, crossed on three suspended cradle decks (3 m wide, hung 4, 6 and 8 m below their anchors). The decks move on their own; nothing calls them. Their periods are about 4.1, 5.0 and 5.7 s, so no single rhythm crosses the hall.

For each deck:

1. **Wait.** Stop braked at the top of the departure ramp and watch the deck.
2. **Board.** Release so the bike reaches the lip as the deck comes in against the bank’s stop. As the front wheel crosses, turn the floor back toward the bank (about −0.3 rad), which presses the deck against its stop while the rear wheel follows. Too early or too late, and the bike drops into the water.
3. **Ride.** Level the floor and brake to rest just east of the deck’s middle while it swings out.
4. **Dismount at the far apex.** As the deck rises toward the far bank, turn the floor under it so it comes to rest with its end over the arrival lip. Hold it there. Your weight east of the middle tips the deck down, and you roll off onto the bank.

An apple hangs above each deck’s far apex. Riding the deck out to the far bank collects it. The door bank follows the third deck.

## The stops

Each departure bank ends in a stop: a wall square to the deck’s west end when the deck is turned `−reach` (0.38 rad).

- The wall’s line keeps every other deck pose to its east, so a deck can only touch the stop’s face.
- The stop’s top block is pitched like the deck at that angle. A deck lying against the stop continues the bank’s surface with a 2 cm joint.

The stops do two jobs:

- **They make boarding possible.** A free deck at its apex accelerates away at g·sin A while the rear wheel is still on the bank. Without the stop the front wheel falls into the opening gap. The stop holds the deck still at the moment of boarding.
- **They limit amplitude.** Decks hit the stop and lose their surplus energy. Floor tilts pump the decks you are not riding, and the stops absorb that surplus on the west side. Arrival banks lie outside the circle the deck corners sweep, with a 3 cm margin.

## Deviations from the brief

| Brief | Built | Why |
| --- | --- | --- |
| Damping 0.3–0.6 | 0.001 | Rapier applies a swing’s damping to both its linear and angular velocity, so 0.3–0.6 lets the decks die out within about 20 s. At 0.001, an idle deck still reaches 0.372 rad after 60 s against the 0.38 stop. |
| Initial angles ±0.6 | +0.6 on all three decks | A deck released at −0.6 would start overlapping its stop. Released at +0.6 (east), each deck’s first westward swing strikes the stop. From then on it swings out to 0.38 rad, the usable amplitude. |
| Free decks only | Stops, plus a pin tilt while boarding | Boarding a free deck at its apex proved unreliable in grid searches over timing and tilt, for the reason given under The stops. |

## Replay pilot

`createFoucaultPilot()` (replay index 12) uses normal controls only. It moves through these stages:

| Stage | What the pilot does |
| --- | --- |
| `approach` / `wait` | Holds the brake at the ramp top. Estimates the deck’s amplitude from its energy and its phase from θ and ω. Rocks the floor slightly to keep the deck’s amplitude at the stop. |
| `board` | Releases when the time until the deck next strikes its stop drops below `lead` (2.4 s). Pins the deck with a −0.3 rad floor tilt once the front wheel is on the deck. |
| `ride` | Levels the floor and brakes to rest just east of the deck’s middle. |
| `catch` | A servo decelerates the deck to `reach − overhang/2`. |
| `leave` | Holds the deck at the far bank (PD control) until the bike rolls off. |
| `land` | Brakes on the next bank. |
| `door` | Rolls to the exit. |

The demonstrated run completes in about 46 s of simulated time and collects all three apples. Across the run, the maximum world tilt is about 0.41 rad and the deck swings peak near 0.8, 1.1 and 1.1 rad. Boarding is robust from lead 2.0 to 2.6 s and with a pin tilt of up to −0.45. At lead 1.8 s the pilot crashes boarding the second deck.

## Tests

`tests/foucault-hall.test.ts` covers:

- **Placement and geometry:** index 12, three 3 m decks of 4, 6 and 8 m, three water hazards, and spawn at y = .72. Each stop is flush with its deck at `−reach` (2 cm joint, matching pitch).
- **Positive replay:** complete, all three apples, under 60 s. The pilot boards, rides, catches, leaves and lands on all three decks.
- **Negative:** idling, or holding the brake, for 60 s never completes.
- **Timing:** releasing on the first deck half a period off (lead 0.347 s) drops the bike into the water.
- **Counterfactual:** with the swings removed, or frozen against their stops (damping 1000), the same pilot does not complete.
- **Amplitude:** with all three decks left alone for 60 s, each still swings out to within 0.02 rad of its stop in the last 8 s.

This closes the residual that the Pendulum Mill’s different lengths never require timing. Here each deck has to be boarded in its own phase.
