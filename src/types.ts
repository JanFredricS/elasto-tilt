/** Shared contract. Map-space is metres, x right, y UP; angles in radians. */
export interface Vec { x: number; y: number }
export interface Surface extends Vec {
  id: string; w: number; h: number; angle?: number; kind?: 'ground' | 'hazard' | 'cradle' | 'spring';
  /** Surfaces sharing a chain id form one continuous run (in list order, ridden on their +y faces).
   *  They render as drawn; physics buries valley joints (or, for an all-convex run, uses one convex
   *  hull) so wheels don't catch on the seams between segments. */
  chain?: string;
  /** Friction of the stone (default 1.1). An authored value is a material choice (e.g. a slick
   *  rail) and wins over the grippy tyres instead of being averaged with them. */
  friction?: number;
  /** 'spring' only: coefficient of restitution of the elastic pad (default SPRING_RESTITUTION). */
  restitution?: number;
}
export interface Apple extends Vec { id: string }
export interface Prop extends Vec {
  /** 'wedge' is a right triangle in its w×h box: right angle bottom-right, slope rising to the right (◢). */
  id: string; shape: 'box' | 'ball' | 'wedge'; w: number; h: number; inverted?: boolean;
  /** 'wedge' only: height of a vertical bumper face at the slope's foot (default 0, a sharp toe). */
  toe?: number;
  /** Collider density (default 1.5) and friction (default .9). */
  density?: number; friction?: number;
  /** Linear damping (default .12): a high value makes a prop grind along, capping how fast it can be pushed. */
  damping?: number;
  /** When the prop rests within `tolerance` of this point (speed below `speed`, default .2 m/s, and,
   *  if `angle` is set, turned no more than that from level), it becomes fixed terrain. */
  socket?: { x: number; y: number; tolerance: number; speed?: number; angle?: number };
}
export interface Swing { id: string; anchor: Vec; length: number; width: number; damping?: number; angle?: number; mass?: number }
/** A kinematic block driven by the route clock (or, with a `period`, by its own cycle): at
 * phase 0 it is at `from`, at 1 at `to`, moving along a straight path or two segments through `via`. */
export interface TimePlatform { id: string; from: Vec; to: Vec; via?: Vec; w: number; h: number;
  /** Seconds per round trip. A platform with a period ignores the route clock and runs on its
   *  own: from → to → from, eased like a pendulum (it dwells at both ends), starting `offset` of
   *  a cycle along (0 at `from`, .5 at `to`). */
  period?: number; offset?: number }
export interface Portal extends Vec { id: string; target: Vec; rotation: number; radius: number }
/** Visual guidance only. Angles are map-space radians: 0 points right, positive turns counterclockwise. */
/** `spin` swaps the straight arrow for a circular one showing which way to rotate
 *  gravity: 1 for a rising world angle (the scene rolls clockwise on screen), -1 falling. */
export interface RouteHint extends Vec { angle: number; label?: string; spin?: 1 | -1 }
export interface Level {
  id: string; name: string; subtitle: string; mechanic: string; hint: string;
  spawn: Vec; surfaces: Surface[]; apples: Apple[]; exit: Vec;
  bounds: { min: Vec; max: Vec }; swings?: Swing[]; props?: Prop[];
  portals?: Portal[]; timePlatforms?: TimePlatform[]; routeHints?: RouteHint[];
  timeAxis?: Vec; timeTravel?: number; initialAngle?: number;
  /** Top speed (m/s) of time platforms along their paths; default 2. */
  timeSpeed?: number;
  /** Normal riding view only; verticalOffset is a fraction of viewport height. */
  camera?: { zoom: number; verticalOffset?: number };
  accent?: string; difficulty: number;
  /** Brake pad torque as a fraction of the default (1). A softer brake slows a fast rider
   *  without pitching them over the bars, but holds the bike only on gentler slopes. */
  brakeScale?: number;
  /** Time-map HUD label (default 'CLOCKWORK'). */
  timeLabel?: string;
}
export interface Controls {
  /** Keyboard/touch rotation rate, used when no phone angle target is supplied. */
  tilt: number;
  brake: boolean;
  /** Calibrated phone pose in radians. Holding this value must not keep spinning. */
  worldAngle?: number;
}
export interface BodyView extends Vec { id: string; angle: number; w: number; h: number; kind: 'frame' | 'wheel' | 'head' | 'prop' | 'swing' | 'time'; shape: 'box' | 'ball' | 'wedge'; inverted?: boolean; settled?: boolean; toe?: number }
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
/** 'assisted': eased curve with dead zone and cruise gain. 'direct': phone twist = world rotation, 1:1. */
export type SteeringMode = 'assisted' | 'direct';
export interface InputController {
  read(dt: number, currentWorldAngle?: number): Controls;
  enableMotion(): Promise<string>;
  calibrate(): void;
  /** Switch the motion mapping without moving the world. */
  setSteering(mode: SteeringMode): void;
  readonly steering: SteeringMode;
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
  calibrate(): void; setSteering(mode: SteeringMode): void; brake(pressed: boolean): void; tilt(value: number): void;
  debug(enabled: boolean): void;
  survey(): void;
}
export interface UIState {
  levelIndex: number; unlocked: number; apples: number; totalApples: number;
  elapsed: number; status: 'menu' | 'playing' | 'paused' | 'crashed' | 'complete';
  fps: number; frameMs: number; physicsMs: number; worldAngle: number;
  timeline: number; timeDirection: number; inputMode: string; debug: boolean;
  surveying: boolean; steering: SteeringMode;
}
export interface GameUI { update(state: UIState): void; destroy(): void }
