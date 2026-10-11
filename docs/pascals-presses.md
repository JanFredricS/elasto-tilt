# Pascal’s Presses

*Press here, rise there.* Campaign map 19 (index 18), difficulty 13.5, between Switchback Scaffold and The Hidden Way Home. Palette: sand. Code: `src/levels/pascals-presses.ts`. Tests: `tests/pascals-presses.test.ts`.

A hydraulic workshop. It is the first campaign map to use a `'box'` prop and the first to set `socket.angle`. No engine change was needed: the presses are ordinary self-running `TimePlatform`s (`period`, `offset`), and the crush presses kill through the existing helmet rule.

## Elements

**Antiphase presses A and B.** Both run a 12 s cycle with the same 3 m stroke, over-travelling each floor by .1 m as the Piston Works’ lifts do.

- Press A is one wide plate (5.6 m) that runs from the start floor (y 0) to the upper floor (y 3).
- Press B is a bike-long plate (2.6 m) that runs from the upper floor to the hall (y 6).
- B has offset .5, so it rests at the bottom exactly as A rests at the top. Their tops always sum to the same height.

**The crate.** A 2 × .8 `'box'` prop, slick underneath (friction .5).

- It must be shoved onto A while A rests low. It rides A up a full floor, which is the first test of a prop on a kinematic press.
- At the top it is pushed east off the plate, over a .2 m sill, into a 2.2 m pit beside the shaft.
- Its socket accepts any flat resting place in the pit (tolerance .13 about the pit’s centre). It also requires the crate to be level (`angle: .05`).
- Seated, its top is flush with the upper floor, so it becomes the gold step from A’s top to the ledge.
- The pit floor is slick (friction .05). Without that, a crate tipping in off the sill would lean on the sill’s edge for ever: still, and inside the radius, but tilted .5 rad. Even then, the angle check stops a leaning crate from locking.

**Crush presses (rams).** Three rams hang from slots in the hall’s 2.6 m ceiling. Each drops on its own 7 s cycle from inside its slot to .9 m above the floor.

- At the bottom a ram clears the frame’s top (.84) but sits far below the helmet’s top (1.75). A rider caught under one is always struck on the head and crashes. The ram can never pin the frame and trap the rider alive.
- The gaps between rams (3.9 m) leave room to stop and wait.

**Shafts.** Each shaft is .1 m wider than its plate on each side.

- The east wall of A’s shaft is faced with a frictionless plate, so the crate rides up against it without dragging.
- Both shafts are deep enough that a rider who falls in is struck on the head by the descending plate rather than stranded below it.
- A crate pushed into A’s open shaft is lost for good.

## Route

| Section | Geometry |
| --- | --- |
| Start floor | y 0, x −16…0. Spawn (−13, .72). The crate is at x −6. **WAIT**: park the crate short of A’s lip and wait for A to come down. |
| Press A | Plate x .1…5.7, tops −.1 → 3.1. **LOAD**: as A bottoms out, shove the crate across it to the shaft’s far wall and follow it on (apple *pascal-rise* on the way up). |
| Sill and pit | Sill x 5.8…6 at y 3. Pit x 6…8.2, floor 2.2. As A tops out, push the crate over the sill until it tips in. A sinks before the crate settles, so ride A down and back up, then roll over the seated crate (apple *pascal-step*). |
| Ledge and press B | Ledge y 3 to x 12. B’s plate x 12.1…14.7, tops 2.9 → 6.1. Wait at the shaft for B to rest low, then ride it up (apple *pascal-crest*). |
| Press hall | Floor y 6, ceiling 8.6 from x 19 to 37. **UNDER**: the rams are at x 23, 28.5 and 34. Apples are under the middle ram and at x 38.5. Door at (41.5, 6.8). |

## Demonstration

The controls-only pilot (`createPascalsPressesPilot`) uses tilt and brake only, reading each press’s cycle off the clock as a player would:

1. It waits braked at each shaft and sets off `lead` s before the press rests low.
2. On A it shoves the crate across while A is low, then rides up braked.
3. Starting `push` s before A tops out, it pushes the crate over the sill. It stops with its front tyre still on the plate, so the sinking plate never catches the tyre on the sill.
4. It crosses at A’s next top.
5. It sets off for each ram `under` s before that ram rests up.

Validation at 120 Hz:

- The route completes with all five apples in 78.7 s over 64.7 m.
- The crate seats level 19.4 s in.
- The smallest gap between a ram and the top of the head while the bike is under a ram is .29 m.

Timing variants complete: lead .8–1.5 s, push 1–2.5 s, under .8–3 s.

## Counterfactuals (tests)

- **Frozen presses.** With A and B stopped, the same pilot never completes and never collects the lift or step apples.
- **No crate.** The pilot never gets east of the pit. A rider spawned on A’s top and ridden straight off at 3 m/s drops into the pit and never reaches the ledge.
- **Too early.** Setting off 4 s before A rests low shoves the crate into the open shaft, where it is lost.
- **Lingering under a ram.** A rider braked under the first ram crashes while the ram is still descending, as it reaches the helmet. The rider stays upright where they stopped and is not shoved down. Setting off for the rams 5 s early also crashes in the hall.
- **Fixed controls.** Holding no tilt, full right tilt or full left tilt does not complete the map.

## Residuals

- Holding the world at about 1 rad or more on A’s top can fling a crate-less rider over the 2.2 m pit. In probes the rider then crashed further along the ledge. A controlled landing has not been ruled out, as with other gap crossings in the campaign.
- Human timing on a phone is unmeasured.
