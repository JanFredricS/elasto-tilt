# Torricelli’s Well

*Nature abhors a vacuum.* Campaign map 11 (difficulty 8.25, between the Contrary Conservatory and the Gravity Engine), blue palette. Source: `src/levels/torricelli.ts`; tests: `tests/torricelli.test.ts`.

## Route

1. **Down the well.** The spawn deck ends at a rounded edge over a 9.4 m shaft, built with Newton’s Ouroboros’ fall grammar: a .4 m convex edge, a sheer wall at −92° (slightly undercut), a 3 m curved catcher, a −12° run-out and a 6 m bend onto the cistern floor 14 m below the deck. Brake to a creep, tip the world a little forward, roll over the edge and hold the world level through the fall.
2. **The ferry.** A 4.5 m pool of water (hazard) covers the cistern floor. A 2.8 m pendulum deck (length 4.2 m, mass 20, damping 1.5) rests with its top flush with the near floor, touching the near wall, so the rider rolls straight aboard. Hold BRAKE and tip the world forward about .5 rad: the loaded deck swings until it docks against the far bank, whose edge is built where the deck’s far corner is when swung .45 rad, so the far bank is about 1 m higher than the near floor. The deck is only a ferry, not a bridge: at rest it reaches less than halfway across.
3. **Seat the floats.** On the far bank, two floats (inverted props, 1 m radius) rest against the lips of two low beams. The beam’s underside clears the rider’s head but not the float, so riding under a beam lets the helmet push its float along to the beam’s open end. There the float rises to the vaulted roof, which slopes up toward home at 8°, and rolls up until its own round-capped socket swallows it, seating as fixed gold stone. Each beam ends directly under its own socket, so each float finds its own socket (sockets are per-prop; a float in the wrong socket would not seat).
4. **Turn over.** Wait by the end wall until both floats are gold, then follow the 4 m half-pipe round with gravity pointing out from its centre, turning the world through 180° until the vault is the floor (TURN OVER route hint, with a spin arrow).
5. **Home over the floats.** Upside down, the vault is a long 8° slope down toward the spawn. The two seated floats stand .38 m proud of it and are the footholds across the sockets; an empty socket is a 2 m pit the wheels drop into. The door hangs in a pocket under the well-head, beside the shaft and a few metres below the spawn deck.

Five apples: landing run-out, over the ferry, between the beams, on the end wall, and on the vault between the sockets.

## Validation

The replay pilot (`createTorricelliPilot`, campaign index 10) uses only bounded tilt and brake. At 120 Hz it completes with all five apples and both floats seated in 48.3 s over 84 m.

- **Positive.** The tests check that the route completes with all apples, both floats seated, the ferry ridden, and the vault ridden with the world inverted.
- **Counterfactual.** With the floats removed (`buildTorricelli(…, false)`), the same pilot turns over and rides onto the vault but never gets past the empty sockets, and the map is not completed.
- **Negative.** Fixed controls (idle, full tilt with brake, full reverse tilt) do not complete the map.
- **Geometry.** Static tests check the deck’s rest and dock poses, the beam heights against the head and float, socket positions, bounds and the TURN OVER hint.

## Notes

The renderer now draws a seated inverted prop in the settled gold-rimmed stone colours; loose inverted props stay red. This is the campaign’s first map where inverted props operate a required gate (see [map residuals](maps-residuals.md)).
