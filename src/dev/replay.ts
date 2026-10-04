import { createEarlyReplayPilot } from '../levels/early';
import { lateLevels } from '../levels/late';
import type { Controls, Snapshot } from '../types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Input-only campaign pilot. Call once before each fixed 1/120 s physics step. */
export function createReplayPilot(index: number): (state: Snapshot) => Controls {
  if (!Number.isInteger(index) || index < 0 || index > 9) throw new RangeError('Campaign index must be 0–9');
  if (index < 5) return createEarlyReplayPilot(index);

  const level = lateLevels[index - 5];
  let previous: Snapshot['bike'] | undefined;
  let angle = 0;
  let lastRawAngle = 0;
  return (state: Snapshot): Controls => {
    const dx = previous ? state.bike.x - previous.x : 0;
    const dy = previous ? state.bike.y - previous.y : 0;
    previous = state.bike;
    const raw = state.bodies.find(body => body.id === 'frame')!.angle;
    angle += Math.atan2(Math.sin(raw - lastRawAngle), Math.cos(raw - lastRawAngle));
    lastRawAngle = raw;
    const velocity = (dx * Math.cos(angle) + dy * Math.sin(angle)) * 120;
    const returning =
      (level.id === 'newtons-attic' && state.collected.includes('attic-e') && !state.collected.includes('attic-f')) ||
      (level.id === 'clockwork-apple' && state.collected.includes('clock-b')) ||
      (level.id === 'eschers-orchard' && state.collected.includes('escher-h')) ||
      (level.id === 'contrary-conservatory' && state.collected.includes('contrary-g'));
    const target = angle + clamp(((returning ? -1.6 : 1.6) - velocity) * .22, -.3, .3);
    return { tilt: clamp((target - state.worldAngle) * 8, -1, 1), brake: false };
  };
}
