# Noether’s Symmetry — map 23, the finale

*What is conserved returns.* The campaign closes with one monument, 77 m long and 23 m tall, that maps onto itself under a half turn about its centre. Every stone, spring pad, piston, plank and wedge on its top face has a twin at (−x, −y), turned by π, on its underside. You ride the top face east with the world level, curl round the east nose onto the underside, and ride home west with the world turned halfway round. In your own frame the return is the outward ride again, mechanic for mechanic. The west nose, which is the east nose’s twin, brings you back onto the top face. The door waits beside the start. It is the campaign’s victory lap: four earlier mechanics, each met twice. Difficulty 15.5. No portals.

## The route (top face, west to east)

1. **The plank** (from Huygens’ Return, but smaller). A 3 m plank hangs on a 4 m bearing, light and very heavily damped (400). At rest it continues the home deck. Roll on briskly, brake a little past the bearing, and turn the world a quarter turn. The plank swings up until it stands against the tower, its top face flush with the tower’s west face. Climb the 1.5 m face and ease over a convex crest of radius 2 m onto the high deck. Apple on the face.
2. **Hooke’s pit** (from Hooke’s Springboard). A knee of radius 1.5 m drops onto a 50° slide down to a brass pad 5 m below the deck, with a 4 m spike floor beyond. Lean the world forward in the throw, then level to land on the ledge 3.5 m below the deck. Apple in the throw.
3. **The lift** (from The Piston Works, lift A). A pair of brass pistons rises from the ledge to the deck every 8 s. Wait by the shaft, board as it rests low, brake, ride it up and roll off. Apple above the lift.
4. **The wedge** (from The Clockwork Wedge). A light, heavily damped wedge (damping 50) sits on the deck under a sloping lintel. The lintel follows its ramp face a hand’s breadth (.15 m) above. Tilt the world and push the wedge 7.5 m east into its seat, a recess as deep as its toe at the foot of a 2.5 m step. Seated, it becomes stone: a ramp up the step. Apple over the step.
5. **The east nose.** A convex half turn of radius 5.7 m (a 32-piece chain) leads down onto the underside. Turn the world with you. Apple on the nose.

The return is the same five beats, upside down in the map and right way up for you. On the underside the world spends the same share of time within .35 rad of a half turn as it spent near level on top. Over the circuit the world turns through a full −2π, so the hint mentions pausing and resuming to recenter the phone grip, as Switchback Scaffold’s does.

Ten apples, five per half (`noether-apple-*` and their `-return` twins). The exit needs all ten. The door sits 3.5 m behind the spawn, so you set off away from it and reach it only off the west nose.

## Why the twins survive the outward ride

While you ride the top face the world is near level, so in each twin’s own frame gravity points away from its floor.

- **The twin plank** is an inverted pendulum that starts leaning a hair onto its shelf (its lower stop). The quarter turn for the outward swing presses it harder onto that stop. Turning the world round the east nose swings its gravity past, and then down. It creeps about 5° off the stop toward its tower and, being so heavily damped, stays there. The boarding rule absorbs this: roll on briskly and stop a little past the bearing, measured on the plank as it hung when you reached it. Your weight east of the bearing returns the plank to its stop. A slow rider’s weight short of the bearing runs the plank east, away from the shelf and under the back wheel. A test pins this down (`board: 1` crashes on the plank).
- **The twin wedge** rises the hand’s breadth onto its lintel and rests flat against it. The lintel follows the ramp face, so a wedge sliding west under it jams between lintel and floor; a wedge pushed east only opens the gap. When the world turns round the east nose, the wedge drops back onto its floor and creeps about a metre toward its seat. Without the lintel it falls clean out of the monument (a test removes it).
- **The original wedge** drifts less than 2 m east while the world is turned for the swing. Damping caps a wedge sliding under its own weight at about .2 m/s, while a pushing rider adds several times its weight. That drift falls well short of tipping it over the lip of its seat’s recess. The socket tolerance is .1 m, so a wedge hung tilted on the lip is never fixed askew. It becomes stone only when it drops in level against the step.
- Spring pads, spikes and pistons do not care which way is down.

## Engine addition: `Prop.angle`

The twin wedge is a ◤: a ◢ turned by π. Props gained an optional initial rotation, `angle`, in radians with a default of 0. A socket’s `angle` tolerance is now measured from the prop’s own rest angle instead of from 0. Every existing prop omits `angle`, so its behaviour is unchanged (`src/types.ts`, `src/physics.ts`).

## Demonstration and evidence

`createNoetherPilot` is an observation-only demonstration that uses ordinary tilt and brake commands. It is built from `createHalfPilot`, one half of the circuit written once in the top face’s frame. That half covers boarding and leading the swing, climbing and rounding the crest, leaning in the throw, scrubbing and waiting for the lift, pushing the wedge and riding round the nose. Once the bike is on the underside (y < 0, x > 0), a fresh half pilot takes over and is fed `twinSnapshot(state)`: every position turned by π about the origin, every angle (bodies and world) turned by π, and twin bodies under their originals’ ids. The return is therefore literally the outward pilot riding again.

The deterministic Rapier replay finishes all ten apples and the door in **116.6 s**, travelling about **215 m**. It reaches the underside at 59.7 s. The apples fall at 9.6, 18.2, 32.2, 48.7 and 55.7 s on top, and 71.8, 80.4, 88.2, 103.8 and 110.9 s on the underside. The replay also completes with each of these pilot settings changed alone: boarding speed 2.8 or 3.3, throw lean .5 or .7, wedge-push tilt .35 or .55, crest rounding 1.4 or 1.8.

`tests/noether.test.ts` checks:

- **Symmetry.** Every surface, the planks, wedges (with sockets), pistons, apples and bounds are their own image under the half turn. Spawn at deck + .72, door beside it, no portals.
- **Positive replay.** Complete, with the five outward apples before any return apple. The door is first reached after the turn. The world sits near a half turn on the underside as often as near level on top. The same replay also runs through `createReplayPilot(22)`.
- **Every mechanic twice.** Both planks reach a quarter turn, the original on the way out and the twin, in its own frame, on the way back. Each wedge is seated by the rider in its own half, with the rider on the deck behind it or already on its ramp. In each half the rider rises more than 3 m on a lift.
- **Negative.** Four fixed controls (idle, full tilt with the brake, full counter-tilt, a steady .3) do not complete.
- **Counterfactuals.** Without the lean, the rider falls on the spikes, on top and again (after a clean outward half) on the underside. A slow boarding crashes on the plank. With the closed-loop pilot unchanged, removing a plank, a spring pad, a lift or a wedge stops the ride at that object. Removing its twin instead stops the ride at the mirror image of the same place after all five outward apples. Without its lintel, the twin wedge falls out of the monument during the outward ride.

## Art direction

`paletteFor()` gives the map the blue palette, alongside Room on Its Side, Gravity Engine and Stairway to Heaven. A true dusk palette (warm horizon below, cooling to night on the underside, so the two halves read as day and night) is a future idea. The accent is a pale steel blue, `#9fb4d8`.
