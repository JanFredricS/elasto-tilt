# Torricelli’s Well

*Nature abhors a vacuum.* Campaign map 11 (difficulty 8.25, between the Contrary Conservatory and the Gravity Engine), blue palette. Source: `src/levels/torricelli.ts`; tests: `tests/torricelli.test.ts`.

## Route

1. **Down the well.** The spawn deck ends at a rounded edge over a 9.4 m shaft, built with Newton’s Ouroboros’ fall grammar: a .4 m convex edge, a sheer wall at −92° (slightly undercut), a 3 m curved catcher, a −12° run-out and a 6 m bend onto the cistern floor 14 m below the deck. Brake to a creep, tip the world a little forward, roll over the edge and hold the world level through the fall.
2. **The ferry.** A 4.5 m pool of water (hazard) covers the cistern floor. A 2.8 m pendulum deck (length 4.2 m, mass 20, damping 1.5) rests with its top flush with the near floor, touching the near wall, so the rider rolls straight aboard. Hold BRAKE and tip the world forward about .5 rad: the loaded deck swings until it docks against the far bank, whose edge is built where the deck’s far corner is when swung .45 rad, so the far bank is about 1 m higher than the near floor. The deck is only a ferry, not a bridge: at rest it reaches less than halfway across.
3. **Seat the floats.** On the far bank, two floats (inverted props, 1 m radius) rest against the lips of two low beams. The beam’s underside clears the rider’s head but not the float, so riding under a beam lets the helmet push its float along to the beam’s open end. There the float rises to the vaulted roof, which slopes up toward home at 8°, and rolls up until its own round-capped socket swallows it, seating as fixed gold stone. Each beam ends directly under its own socket, so each float finds its own socket (sockets are per-prop; a float in the wrong socket would not seat). Each lip hangs .9 m, almost to a resting float’s centre: a shallower lip let float A, thrown back against it by a hard ferry tilt, squeeze underneath toward socket B. Between the sockets a sill ramps .4 m out of the vault (about 12° to it) to a step at x = 28.5: when the world is tipped back with the floats loose, float B rolls down-slope only as far as the step instead of into socket A’s recess, where it would never seat and would hold float A out for good.
4. **Turn over.** Wait by the end wall until both floats are gold, then follow the 4 m half-pipe round with gravity pointing out from its centre, turning the world through 180° until the vault is the floor (TURN OVER route hint, with a spin arrow).
5. **Home over the floats.** Upside down, the vault is a long 8° slope down toward the spawn. Between the sockets the rider climbs the sill’s gentle ramp and drops off its step. The two seated floats stand .38 m proud of it and are the footholds across the sockets; an empty socket is a 2 m pit the wheels drop into. The door hangs in a pocket under the well-head, beside the shaft and a few metres below the spawn deck.

Five apples: landing run-out, over the ferry, between the beams, on the end wall, and on the vault between the sockets.

## Validation

The replay pilot (`createTorricelliPilot`, campaign index 10) uses only bounded tilt and brake. At 120 Hz it completes with all five apples and both floats seated in 49.1 s over 84.5 m. Varying its tuning (creep .3–1.2, ferry tilt .45–1.0, vault speed 1.6–2.6, boarding .7–1.4) still completes.

- **Positive.** The tests check that the route completes with all apples, both floats seated, the ferry ridden, and the vault ridden with the world inverted.
- **Counterfactual.** With the floats removed (`buildTorricelli(…, false)`), the same pilot turns over and rides onto the vault but never gets past the empty sockets, and the map is not completed.
- **Hard ferry tilt.** Ferry tilts of .7 and .9 rad still complete: neither float escapes past its lip.
- **Back-tilt.** Stopping on the bank with float B loose, holding the world tipped back .25 or .5 rad for 15 s and then levelling it leaves both floats seated in their own sockets. With the sill flattened, .25 rad already rolls B into socket A’s recess for good.
- **Extreme ferry tilt.** At 1.1 rad and beyond the rider leaves the deck in a hop and its helmet strikes beam B’s lip: a crash, so the player restarts. With the old .5 m lip, 1.1 rad completed but 1.2 rad stranded float B in socket A (a soft lock), so the deeper lip trades a soft lock for a crash.
- **Negative.** Fixed controls (idle, full tilt with brake, full reverse tilt) do not complete the map.
- **Geometry.** Static tests check the deck’s rest and dock poses, the beam heights against the head and float, socket positions, the sill’s step and ramp, bounds and the TURN OVER hint.

## Residuals / known issues

Measured in the second audit cycle by scripted probes on top of the replay pilot (120 Hz). None of these were fixed: each is either rare in normal play or has no cheap geometric fix.

- **Hard back-tilt while float B rises (restart only).** B is loose for about 5 s after the helmet pushes it off its beam (about 15.7 s to 20.5 s in the replay). In that window, holding the world tipped back .6 rad for 1, 3 or 15 s is safe. Tipping back .7 rad for 3 s, or .8 rad for just 1 s, carries the rising float diagonally over the sill’s step and into socket A’s cap. It never seats there, and float A is held out below it. Holding .9–1 rad crashes the rider. No recovery was found. Tipping forward .8–1 rad frees float A, but it rolls up the vault into the door pocket while B stays in socket A. Tipping forward 1.2 rad or more, or spinning the world through a full turn, crashes the rider. A taller sill does not help, because the float passes the step beneath it while still rising. Blocking that path would need a deep fin that the inverted rider could not ride over. A player would need a 40° back-tilt at a moment when the route asks them to ride forward. That is uncommon, but it is not impossible.
- **A float flung out of the well mouth (unwinnable, rider lives).** 78 scripted flail patterns (bang-bang tilt, early turnovers, with and without brake, started at the bank, beam B or beam A) never lost a float in the first 40 s. Most of them crashed the rider first. One pattern, ±1 rad sawtooth every 2 s with the brake held from beam A, drove float B up the vault into the door pocket after about 20 s. It then went under the pocket’s stub, into the shaft and out of the open well mouth at x ≈ .6. A float that leaves the map cannot come back, so the map can only be restarted. A narrower well mouth cannot cheaply block this. The float hugs the spawn wall in the same 0–2 m corridor the rider falls through, and the float (2 m) is about as large as the bike. A prop-only barrier would need a new surface kind in the physics engine.
- **Extreme ferry tilt.** At 1.1 rad or more the ride ends in a crash on beam B’s lip, not in a soft lock. This is tested.
- **Not yet checked:** physical phone play (sensor tilt resolution near the .45–1.0 rad ferry window, readability of the gold and red floats on a small screen), and the Playwright e2e suite. The e2e campaign indices were updated but those specs were not run in either audit cycle. The 390×844 overview fits, but the PUSH, HOME and TURN OVER labels sit close together there.

## Notes

The renderer now draws a seated inverted prop in the settled gold-rimmed stone colours; loose inverted props stay red. This is the campaign’s first map where inverted props operate a required gate (see [map residuals](maps-residuals.md)).
