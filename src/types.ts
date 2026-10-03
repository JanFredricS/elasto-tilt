/** Shared contract. Map-space is metres, x right, y UP; angles in radians. */
export interface Vec { x: number; y: number }
export interface Surface extends Vec { id: string; w: number; h: number; angle?: number; kind?: 'ground' | 'hazard' | 'cradle' }
export interface Apple extends Vec { id: string }
export interface Prop extends Vec { id: string; shape: 'box' | 'ball'; w: number; h: number; inverted?: boolean }
export interface Swing { id: string; anchor: Vec; length: number; width: number; damping?: number; angle?: number }
export interface TimePlatform { id: string; from: Vec; to: Vec; w: number; h: number }
export interface Portal extends Vec { id: string; target: Vec; rotation: number; radius: number }
export interface Level {
  id: string; name: string; subtitle: string; mechanic: string; hint: string;
  spawn: Vec; surfaces: Surface[]; apples: Apple[]; exit: Vec;
  bounds: { min: Vec; max: Vec }; swings?: Swing[]; props?: Prop[];
  portals?: Portal[]; timePlatforms?: TimePlatform[];
  timeAxis?: Vec; timeTravel?: number; initialAngle?: number;
  accent?: string; difficulty: number;
}
export interface Controls { tilt: number; brake: boolean }
export interface BodyView extends Vec { id: string; angle: number; w: number; h: number; kind: 'frame' | 'wheel' | 'head' | 'prop' | 'swing' | 'time'; shape: 'box' | 'ball'; inverted?: boolean }
export interface Snapshot {
  bodies: BodyView[]; bike: Vec; worldAngle: number; collected: string[];
  status: 'playing' | 'crashed' | 'complete'; elapsed: number;
  timeline: number; timeDirection: number; physicsMs: number;
}
export interface PhysicsGame {
  load(level: Level): void;
  step(dt: number, controls: Controls): Snapshot;
  snapshot(): Snapshot;
  destroy(): void;
}
export interface InputController {
  read(dt: number): Controls;
  enableMotion(): Promise<string>;
  calibrate(): void;
  setBrake(pressed: boolean): void;
  setTouchTilt(value: number): void;
  reset(): void;
  destroy(): void;
  readonly mode: string;
}
export interface GameRenderer {
  load(level: Level): void;
  render(state: Snapshot, dt: number): void;
  resize(): void;
  destroy(): void;
}
export interface UICallbacks {
  start(): void; selectLevel(index: number): void; restart(): void;
  pause(): void; resume(): void; enableMotion(): Promise<string>;
  calibrate(): void; brake(pressed: boolean): void; tilt(value: number): void;
  debug(enabled: boolean): void;
}
export interface UIState {
  levelIndex: number; unlocked: number; apples: number; totalApples: number;
  elapsed: number; status: 'menu' | 'playing' | 'paused' | 'crashed' | 'complete';
  fps: number; frameMs: number; physicsMs: number; worldAngle: number;
  timeline: number; timeDirection: number; inputMode: string; debug: boolean;
}
export interface GameUI { update(state: UIState): void; destroy(): void }
