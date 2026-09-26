import type { Element } from './elements';
import type { EnemyDef } from './enemyDefs';

export interface Player {
  x: number;
  y: number;
  z: number;
  r: number;
  hp: number;
  maxHp: number;
  faceAngle: number;
  walkPhase: number;
  speed: number; // 0..1, smoothed
  velX: number;
  velY: number;
  attackT: number; // seconds since the last attack started
  aimX: number;
  aimY: number;
  moving: boolean;
  animT: number;
  attackCd: number;
  attackFacingT: number; // while > 0, face the aim direction instead of the walk direction
  dodgeT: number;
  dodgeCd: number;
  dodgeX: number;
  dodgeY: number;
  iframes: number;
  lungeT: number;
  lungeX: number;
  lungeY: number;
  lungeHit: Set<number>;
  slot: number;
  flash: number;
  hazardTick: number;
  kbX: number;
  kbY: number;
}

export type EnemyState = 'idle' | 'chase' | 'windup' | 'charge' | 'rest' | 'stun';

export interface Enemy {
  id: number;
  def: EnemyDef;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  hp: number;
  state: EnemyState;
  t: number;
  kbX: number;
  kbY: number;
  dirX: number;
  dirY: number;
  flash: number;
  faceAngle: number;
  moving: boolean;
  windupDur: number;
  animT: number;
  contactCd: number;
  shootCd: number;
  aggro: boolean;
  group: number;
  lastHitT: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;
  element: Element;
  from: 'player' | 'enemy';
  r: number;
  knockback: number;
}

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  color: string;
  size: number;
  gravity: number;
}

export interface Floater {
  x: number;
  y: number;
  z: number;
  text: string;
  color: string;
  t: number;
  scale: number;
}

export interface Swing {
  x: number;
  y: number;
  angle: number;
  arc: number;
  range: number;
  t: number;
  dur: number;
  color: string;
}

export interface Pickup {
  x: number;
  y: number;
  item: string; // weapon or relic id
  kind: 'weapon' | 'relic';
}

export interface Herb {
  x: number;
  y: number;
  t: number;
}

export interface Toast {
  title: string;
  sub?: string;
  color: string;
  t: number;
  dur: number;
}
