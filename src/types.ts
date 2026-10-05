/** Shared contract. Map-space is metres, x right, y UP; angles in radians. */
export interface Vec { x: number; y: number }
export interface Surface extends Vec {
  id: string; w: number; h: number; angle?: number; kind?: 'ground' | 'hazard' | 'cradle';
  /** Surfaces sharing a chain id form one continuous run (in list order, ridden on their +y faces).
   *  They render as drawn; physics buries valley joints (or, for an all-convex run, uses one convex
   *  hull) so wheels don't catch on the seams between segments. */
  chain?: string;
}
export interface Apple extends Vec { id: string }
export interface Prop extends Vec {
  id: string; shape: 'box' | 'ball'; w: number; h: number; inverted?: boolean;
  /** Collider density (default 1.5) and friction (default .9). */
  density?: number; friction?: number;
  /** When the prop rests within `tolerance` of this point (speed below `speed`, default .2 m/s), it becomes fixed terrain. */
  socket?: { x: number; y: number; tolerance: number; speed?: number };
}
export interface Swing { id: string; anchor: Vec; length: number; width: number; damping?: number; angle?: number; mass?: number }
export interface TimePlatform { id: string; from: Vec; to: Vec; w: number; h: number }
export interface Portal extends Vec { id: string; target: Vec; rotation: number; radius: number }
/** Visual guidance only. Angles are map-space radians: 0 points right, positive turns counterclockwise. */
export interface RouteHint extends Vec { angle: number; label?: string }
export interface Level {
  id: string; name: string; subtitle: string; mechanic: string; hint: string;
  spawn: Vec; surfaces: Surface[]; apples: Apple[]; exit: Vec;
  bounds: { min: Vec; max: Vec }; swings?: Swing[]; props?: Prop[];
  portals?: Portal[]; timePlatforms?: TimePlatform[]; routeHints?: RouteHint[];
  timeAxis?: Vec; timeTravel?: number; initialAngle?: number;
  /** Normal riding view only; verticalOffset is a fraction of viewport height. */
  camera?: { zoom: number; verticalOffset?: number };
  accent?: string; difficulty: number;
}
export interface Controls {
  /** Keyboard/touch rotation rate, used when no phone angle target is supplied. */
  tilt: number;
  brake: boolean;
  /** Calibrated phone pose in radians. Holding this value must not keep spinning. */
  worldAngle?: number;
}
export interface BodyView extends Vec { id: string; angle: number; w: number; h: number; kind: 'frame' | 'wheel' | 'head' | 'prop' | 'swing' | 'time'; shape: 'box' | 'ball'; inverted?: boolean; settled?: boolean }
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
  read(dt: number, currentWorldAngle?: number): Controls;
  enableMotion(): Promise<string>;
  calibrate(): void;
  setBrake(pressed: boolean): void;
  setTouchTilt(value: number): void;
  reset(worldAngle?: number): void;
  destroy(): void;
  readonly mode: string;
}
export interface GameRenderer {
  load(level: Level): void;
  render(state: Snapshot, dt: number): void;
  overview(enabled: boolean): void;
  resize(): void;
  destroy(): void;
}
export interface UICallbacks {
  start(): void; selectLevel(index: number): void; restart(): void;
  menu(): void;
  pause(): void; resume(): void; enableMotion(): Promise<string>;
  calibrate(): void; brake(pressed: boolean): void; tilt(value: number): void;
  debug(enabled: boolean): void;
  survey(): void;
}
export interface UIState {
  levelIndex: number; unlocked: number; apples: number; totalApples: number;
  elapsed: number; status: 'menu' | 'playing' | 'paused' | 'crashed' | 'complete';
  fps: number; frameMs: number; physicsMs: number; worldAngle: number;
  timeline: number; timeDirection: number; inputMode: string; debug: boolean;
  surveying: boolean;
}
export interface GameUI { update(state: UIState): void; destroy(): void }
