/** Authored time has a reversible target and a separately speed-limited collider phase.
 * A stopped rider may see the collider finish catching up to the requested position.
 * Endpoints saturate; displacement beyond an endpoint is intentionally not stored.
 */
export class RouteClock {
  target = 0;
  phase = 0;
  private pending = 0;
  advance(distance: number, travel: number, maximumLength: number, dt: number) {
    this.pending += distance;
    if (Math.abs(this.pending) >= .006) {
      this.target = Math.max(0, Math.min(1, this.target + this.pending / Math.max(.5, travel)));
      this.pending = 0;
    }
    const limit = 2 * dt / Math.max(1, maximumLength);
    const delta = Math.max(-limit, Math.min(limit, this.target - this.phase));
    this.phase += delta;
    return Math.sign(delta);
  }
}
/** Conservative slip policy: only persistent gravity-supporting contacts can
 * carry; never subtract more signed travel than the rider actually made. This
 * avoids inventing backwards travel on landing, side impacts, or wheel slip.
 */
export function carriedTravel(riderDelta: number, platformDelta: number, persistent: boolean) {
  if (!persistent || riderDelta * platformDelta <= 0) return 0;
  return Math.sign(riderDelta) * Math.min(Math.abs(riderDelta), Math.abs(platformDelta));
}
