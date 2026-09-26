import { angleDiff, norm, project, screenToWorld } from '../engine/iso';
import type { Input } from '../engine/input';
import { inventoryHit } from '../paint/inventory';
import { DAIS_TIERS } from '../paint/props';
import { ELEMENT_INFO, effectiveness, multiplier, weaknessesOf, type Element } from './elements';
import { ENEMIES, type EnemyDef } from './enemyDefs';
import type { Enemy, Floater, Herb, Particle, Pickup, Player, Projectile, Swing, Toast } from './entities';
import { RELICS, relicStats } from './relics';
import { loadSave, writeSave, clearSave, freshSave, type SaveData } from './save';
import { LOADOUT_SLOTS, WEAPONS, type WeaponDef } from './weapons';
import { buildMaps, collides, groundAt, isBlocked, nearestRoad, solidAt, type MapId, type MapInfo } from './world';

export const VIEW_W = 1280;
export const VIEW_H = 720;
/** Camera zoom applied to the world (not the UI). */
export const ZOOM = 1.25;
/** How far above Thistle's feet the camera centers, in screen px. */
const CAM_LIFT = 50;

const PLAYER_SPEED = 4.2;
const DODGE_SPEED = 13;
const DODGE_TIME = 0.17;
const DODGE_COOLDOWN = 0.55;
const LUNGE_TIME = 0.16;

type GameState = 'intro' | 'play' | 'dead';

interface Fade {
  t: number;
  dur: number;
  mid: () => void;
  fired: boolean;
}

export class Game {
  maps = buildMaps();
  save: SaveData = loadSave();
  inventoryOpen = false;

  state: GameState = 'intro';
  mapId: MapId = 'tower';
  time = 0;

  player: Player;
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  particles: Particle[] = [];
  floaters: Floater[] = [];
  swings: Swing[] = [];
  herbs: Herb[] = [];
  toasts: Toast[] = [];

  camX = 0;
  camY = 0;
  shake = 0;
  hitstop = 0;
  fade: Fade | null = null;
  deadT = 0;
  darkness = 0; // Mistfen fog, 0..1
  showHelp = false;
  resetArmed = 0;

  /** Enemies in the valley persist while you pop back up the tower, and reroll on a new run. */
  private valleyEnemies: Enemy[] | null = null;
  private nextEnemyId = 1;
  private hints = new Set<string>();

  constructor(readonly input: Input) {
    this.player = this.newPlayer();
    this.placePlayer(this.maps.tower.spawnPoint.x, this.maps.tower.spawnPoint.y);
    this.snapCamera();
  }

  get map(): MapInfo {
    return this.maps[this.mapId];
  }

  get stats() {
    return relicStats(this.save.relics);
  }

  get loadout(): WeaponDef[] {
    return this.save.loadout.slice(0, LOADOUT_SLOTS).map((id) => WEAPONS[id]).filter(Boolean);
  }

  /** Add or remove a weapon from the four quick slots (used by the Armory screen). */
  toggleLoadout(id: string) {
    const l = this.save.loadout;
    const i = l.indexOf(id);
    if (i >= 0) {
      if (l.length > 1) l.splice(i, 1);
    } else if (l.length < LOADOUT_SLOTS) l.push(id);
    else l[this.player.slot] = id;
    this.player.slot = Math.min(this.player.slot, l.length - 1);
    writeSave(this.save);
  }

  get weapon(): WeaponDef {
    const l = this.loadout;
    return l[Math.min(this.player.slot, l.length - 1)];
  }

  /** Pickups still waiting on the current map (anything already owned is gone for good). */
  get pickups(): Pickup[] {
    return this.map.pickups
      .filter((p) => !this.save.weapons.includes(p.item) && !this.save.relics.includes(p.item))
      .map((p) => ({ x: p.x + 0.5, y: p.y + 0.5, item: p.item, kind: p.item in WEAPONS ? 'weapon' : 'relic' }));
  }

  private newPlayer(): Player {
    const maxHp = this.stats.maxHp;
    return {
      x: 0, y: 0, z: 0, r: 0.26, hp: maxHp, maxHp, faceAngle: Math.PI / 4, walkPhase: 0, speed: 0, velX: 0, velY: 0,
      attackT: 99, aimX: 1, aimY: 1, moving: false, animT: 0,
      attackCd: 0, attackFacingT: 0, dodgeT: 0, dodgeCd: 0, dodgeX: 0, dodgeY: 0, iframes: 0,
      lungeT: 0, lungeX: 0, lungeY: 0, lungeHit: new Set(), slot: 0, flash: 0, hazardTick: 0, kbX: 0, kbY: 0,
    };
  }

  private placePlayer(x: number, y: number) {
    this.player.x = x;
    this.player.y = y;
    this.player.kbX = this.player.kbY = 0;
    this.player.dodgeT = this.player.lungeT = 0;
  }

  private snapCamera() {
    const s = project(this.player.x, this.player.y, this.player.z);
    this.camX = s.x;
    this.camY = s.y - CAM_LIFT;
  }

  // -------------------------------------------------------------------------
  // Main update
  // -------------------------------------------------------------------------

  update(dt: number) {
    this.time += dt;
    const input = this.input;

    if (this.state === 'intro') {
      if (input.anyPressed || input.mousePressed) {
        this.state = 'play';
        if (!this.save.seenIntro) {
          this.save.seenIntro = true;
          writeSave(this.save);
          this.showHelp = true;
        }
        this.toast("The Wizard's Tower", 'Rest on the dais to heal. The arched door leads down.', '#c9a24a', 4);
      }
      this.updateToasts(dt);
      return;
    }

    if (input.wasPressed('h')) this.showHelp = !this.showHelp;
    if ((input.wasPressed('tab') || input.wasPressed('i')) && this.state === 'play') this.inventoryOpen = !this.inventoryOpen;
    if (input.wasPressed('escape')) this.inventoryOpen = false;
    this.handleResetKey();
    if (this.inventoryOpen) {
      if (input.mousePressed) {
        const hit = inventoryHit(this, input.mouseX, input.mouseY);
        if (hit?.kind === 'weapon') this.toggleLoadout(hit.id);
      }
      this.updateToasts(dt);
      return;
    }

    if (this.fade) {
      this.fade.t += dt;
      if (!this.fade.fired && this.fade.t >= this.fade.dur / 2) {
        this.fade.fired = true;
        this.fade.mid();
      }
      if (this.fade.t >= this.fade.dur) this.fade = null;
    }

    if (this.hitstop > 0) {
      this.hitstop -= dt;
      this.updateCamera(dt);
      return;
    }

    if (this.state === 'dead') {
      this.deadT += dt;
      if (this.deadT > 2.4 && !this.fade) this.startFade(() => this.respawn(), 1.2);
    } else if (!this.fade || this.fade.t > this.fade.dur / 2) {
      this.updatePlayer(dt);
    }

    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateEffects(dt);
    this.updateHerbs();
    this.updateToasts(dt);
    this.updateCamera(dt);
  }

  private handleResetKey() {
    this.resetArmed = Math.max(0, this.resetArmed - 1 / 60);
    if (this.input.wasPressed('f9')) {
      if (this.resetArmed > 0) {
        clearSave();
        this.save = freshSave();
        this.save.seenIntro = true;
        writeSave(this.save);
        this.player = this.newPlayer();
        this.goTo('tower', this.maps.tower.spawnPoint.x, this.maps.tower.spawnPoint.y);
        this.valleyEnemies = null;
        this.toast('Save erased', 'A fresh start. Your broom remains.', '#ff8a8a', 3);
        this.resetArmed = 0;
      } else {
        this.resetArmed = 3;
        this.toast('Erase all progress?', 'Press F9 again to confirm.', '#ff8a8a', 3);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Player
  // -------------------------------------------------------------------------

  private updatePlayer(dt: number) {
    const p = this.player;
    const input = this.input;
    const stats = this.stats;
    p.maxHp = stats.maxHp;

    // Aim: mouse position on screen -> world
    const mw = this.mouseWorld();
    const aim = norm(mw.x - p.x, mw.y - p.y);
    if (aim.x || aim.y) {
      p.aimX = aim.x;
      p.aimY = aim.y;
    }

    // Movement input is screen-relative: W is up the screen.
    let mx = 0;
    let my = 0;
    if (input.isDown('w') || input.isDown('arrowup')) { mx -= 1; my -= 1; }
    if (input.isDown('s') || input.isDown('arrowdown')) { mx += 1; my += 1; }
    if (input.isDown('a') || input.isDown('arrowleft')) { mx -= 1; my += 1; }
    if (input.isDown('d') || input.isDown('arrowright')) { mx += 1; my -= 1; }
    const move = norm(mx, my);
    p.moving = move.x !== 0 || move.y !== 0;

    // Weapon switching
    const count = this.loadout.length;
    for (let i = 0; i < LOADOUT_SLOTS; i++) {
      if (input.wasPressed(String(i + 1)) && i < count) this.selectSlot(i);
    }
    if (input.wasPressed('q')) this.selectSlot((p.slot + 1) % count);
    if (input.wheel !== 0 && count > 1) this.selectSlot((p.slot + (input.wheel > 0 ? 1 : count - 1)) % count);

    // Timers
    p.attackCd -= dt;
    p.dodgeCd -= dt;
    p.iframes -= dt;
    p.flash -= dt;
    p.attackFacingT -= dt;

    // Dodge
    if ((input.wasPressed(' ') || input.wasPressed('shift') || input.wasPressed('mouse2')) && p.dodgeCd <= 0 && p.lungeT <= 0) {
      const d = p.moving ? move : { x: p.aimX, y: p.aimY };
      p.dodgeX = d.x;
      p.dodgeY = d.y;
      p.dodgeT = DODGE_TIME;
      p.dodgeCd = DODGE_COOLDOWN;
      p.iframes = Math.max(p.iframes, DODGE_TIME + 0.08);
      for (let i = 0; i < 6; i++) this.puff(p.x, p.y, '#d8cfbd', 0.6);
    }

    let vx = 0;
    let vy = 0;
    if (p.dodgeT > 0) {
      p.dodgeT -= dt;
      vx = p.dodgeX * DODGE_SPEED;
      vy = p.dodgeY * DODGE_SPEED;
      if (Math.random() < 0.6) this.puff(p.x, p.y, '#bfb6a3', 0.3);
    } else if (p.lungeT > 0) {
      p.lungeT -= dt;
      const w = this.weapon;
      const sp = w.range / LUNGE_TIME;
      vx = p.lungeX * sp;
      vy = p.lungeY * sp;
      this.lungeHits(w);
      this.spark(p.x, p.y, ELEMENT_INFO[w.element].color, 2);
    } else {
      vx = move.x * PLAYER_SPEED;
      vy = move.y * PLAYER_SPEED;
    }
    vx += p.kbX;
    vy += p.kbY;
    p.kbX *= Math.pow(0.001, dt);
    p.kbY *= Math.pow(0.001, dt);
    const prevX = p.x;
    const prevY = p.y;
    this.moveBody(p, vx * dt, vy * dt, p.r);

    // Attack (hold to keep swinging)
    if ((input.mouseDown || input.isDown('j')) && p.attackCd <= 0 && p.dodgeT <= 0 && p.lungeT <= 0) this.attack();

    // Facing: turn smoothly toward the aim while fighting, otherwise toward where we walk
    const faceAim = p.attackFacingT > 0 || !p.moving;
    const fx = faceAim ? p.aimX : move.x;
    const fy = faceAim ? p.aimY : move.y;
    const target = Math.atan2(fy, fx);
    let d = target - p.faceAngle;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    p.faceAngle += d * Math.min(1, dt * 14);
    p.animT = p.moving ? p.animT + dt : 0;
    p.attackT += dt;
    const actual = Math.hypot(p.x - prevX, p.y - prevY) / dt;
    p.velX = (p.x - prevX) / dt;
    p.velY = (p.y - prevY) / dt;
    p.speed += (Math.min(1, actual / PLAYER_SPEED) - p.speed) * Math.min(1, dt * 12);
    p.walkPhase += dt * Math.min(actual, PLAYER_SPEED * 1.2) * 2.6;
    p.z += (this.floorHeight(p.x, p.y) - p.z) * Math.min(1, dt * 20);

    this.checkTiles(dt);
    this.checkInteract();
  }

  private selectSlot(i: number) {
    if (i === this.player.slot) return;
    this.player.slot = i;
    const w = this.weapon;
    this.spark(this.player.x, this.player.y, ELEMENT_INFO[w.element].color, 6);
  }

  mouseWorld() {
    const sx = (this.input.mouseX - VIEW_W / 2) / ZOOM + this.camX;
    const sy = (this.input.mouseY - VIEW_H / 2) / ZOOM + this.camY;
    return screenToWorld(sx, sy);
  }

  /** Height of the floor under a point (the dais steps up in the tower). */
  floorHeight(x: number, y: number) {
    if (this.mapId !== 'tower') return 0;
    const c = this.maps.tower.spawnPoint;
    let h = 0;
    for (const [half, z] of DAIS_TIERS) if (Math.abs(x - c.x) < half && Math.abs(y - c.y) < half) h = z;
    return h;
  }

  private moveBody(b: { x: number; y: number }, dx: number, dy: number, r: number) {
    const m = this.map;
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.2) || 1;
    for (let i = 0; i < steps; i++) {
      const sx = dx / steps;
      const sy = dy / steps;
      if (!collides(m, b.x + sx, b.y, r)) b.x += sx;
      if (!collides(m, b.x, b.y + sy, r)) b.y += sy;
    }
  }

  private attack() {
    const p = this.player;
    const w = this.weapon;
    p.attackCd = w.cooldown;
    p.attackFacingT = 0.35;
    p.attackT = 0;
    const color = ELEMENT_INFO[w.element].color;
    const angle = Math.atan2(p.aimY, p.aimX);

    if (w.kind === 'melee') {
      this.swings.push({ x: p.x, y: p.y, angle, arc: w.arc, range: w.range, t: 0, dur: 0.16, color });
      // tiny step into the swing
      this.moveBody(p, p.aimX * 0.12, p.aimY * 0.12, p.r);
      for (const e of this.enemies) {
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d > w.range + e.def.radius) continue;
        if (d > 0.5 && angleDiff(Math.atan2(dy, dx), angle) > w.arc / 2) continue;
        this.hitEnemy(e, w.damage, w.element, p.aimX, p.aimY, w.knockback);
      }
    } else if (w.kind === 'bolt') {
      const speed = 11;
      this.projectiles.push({
        x: p.x + p.aimX * 0.4, y: p.y + p.aimY * 0.4, vx: p.aimX * speed, vy: p.aimY * speed,
        life: w.range / speed, damage: w.damage, element: w.element, from: 'player', r: 0.18, knockback: w.knockback,
      });
      this.spark(p.x + p.aimX * 0.4, p.y + p.aimY * 0.4, color, 3);
    } else if (w.kind === 'lunge') {
      p.lungeT = LUNGE_TIME;
      p.lungeX = p.aimX;
      p.lungeY = p.aimY;
      p.lungeHit.clear();
      p.iframes = Math.max(p.iframes, LUNGE_TIME + 0.05);
      this.shake = Math.max(this.shake, 2);
    }
  }

  private lungeHits(w: WeaponDef) {
    const p = this.player;
    for (const e of this.enemies) {
      if (p.lungeHit.has(e.id)) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) < 0.75 + e.def.radius) {
        p.lungeHit.add(e.id);
        this.hitEnemy(e, w.damage, w.element, p.lungeX, p.lungeY, w.knockback);
      }
    }
  }

  private hitEnemy(e: Enemy, base: number, element: Element, dirX: number, dirY: number, kb: number) {
    if (e.hp <= 0) return;
    const eff = effectiveness(element, e.def.element);
    const amount = Math.max(1, Math.round(base * multiplier(eff) * this.stats.damageMult));
    e.hp -= amount;
    e.flash = 0.12;
    e.aggro = true;
    e.lastHitT = this.time;
    const kbMult = eff === 'weak' ? 1.6 : eff === 'resist' ? 0.5 : 1;
    const heavy = e.def.id === 'beetle' ? 0.5 : 1;
    e.kbX += dirX * kb * kbMult * heavy;
    e.kbY += dirY * kb * kbMult * heavy;
    const stun = eff === 'weak' ? 0.6 : eff === 'resist' ? 0 : 0.15;
    if (stun > 0 && (e.state !== 'charge' || eff === 'weak')) {
      e.state = 'stun';
      e.t = stun;
    }

    const col = eff === 'weak' ? ELEMENT_INFO[element].color : eff === 'resist' ? '#8a8494' : '#f4eedd';
    this.floaters.push({ x: e.x, y: e.y, z: 18, text: String(amount), color: col, t: 0, scale: eff === 'weak' ? 2 : 1 });
    if (eff === 'weak') this.floaters.push({ x: e.x, y: e.y, z: 30, text: 'WEAK!', color: col, t: 0, scale: 1 });
    if (eff === 'resist') this.floaters.push({ x: e.x, y: e.y, z: 28, text: 'resist', color: col, t: 0, scale: 1 });
    this.spark(e.x, e.y, ELEMENT_INFO[element].color, eff === 'weak' ? 12 : 5);
    this.hitstop = Math.max(this.hitstop, eff === 'weak' ? 0.07 : 0.035);
    this.shake = Math.max(this.shake, eff === 'weak' ? 4 : 2);

    if (eff === 'resist') {
      const tips = weaknessesOf(e.def.element).map((x) => ELEMENT_INFO[x].name).join(' or ');
      this.hint('resist', 'Resisted!', `${e.def.name}s shrug off ${ELEMENT_INFO[element].name}. Try ${tips}.`, '#b8b2c2');
    } else if (eff === 'weak') {
      this.hint('weak', 'A weak spot!', `${ELEMENT_INFO[element].name} hits ${ELEMENT_INFO[e.def.element].name} creatures twice as hard.`, ELEMENT_INFO[element].color);
    }

    if (e.hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: Enemy) {
    const color = ELEMENT_INFO[e.def.element].color;
    for (let i = 0; i < 16; i++) this.spark(e.x, e.y, i % 2 ? color : '#f4eedd', 1, 3.5);
    if (Math.random() < 0.2) this.herbs.push({ x: e.x, y: e.y, t: 0 });
    this.enemies = this.enemies.filter((o) => o !== e);
    if (this.mapId === 'valley') this.valleyEnemies = this.enemies;
  }

  damagePlayer(amount: number, fromX: number, fromY: number, element: Element) {
    const p = this.player;
    if (this.state !== 'play' || p.iframes > 0) return;
    p.hp -= amount;
    p.iframes = 0.7;
    p.flash = 0.15;
    const d = norm(p.x - fromX, p.y - fromY);
    p.kbX += d.x * 6;
    p.kbY += d.y * 6;
    this.shake = Math.max(this.shake, 5);
    this.hitstop = Math.max(this.hitstop, 0.05);
    this.floaters.push({ x: p.x, y: p.y, z: 24, text: `-${amount}`, color: '#ff6b6b', t: 0, scale: 1 });
    this.spark(p.x, p.y, ELEMENT_INFO[element].color, 6);
    if (p.hp <= 0) this.die();
  }

  private die() {
    const p = this.player;
    p.hp = 0;
    this.state = 'dead';
    this.deadT = 0;
    for (let i = 0; i < 30; i++) this.spark(p.x, p.y, i % 2 ? '#5dbb4a' : '#c9a24a', 1, 3);
    this.save.deaths++;
    writeSave(this.save);
  }

  private respawn() {
    this.save.runs++;
    writeSave(this.save);
    this.herbs = [];
    const slot = this.player.slot;
    this.player = this.newPlayer();
    this.player.slot = Math.min(slot, this.loadout.length - 1);
    this.goTo('tower', this.maps.tower.spawnPoint.x, this.maps.tower.spawnPoint.y);
    this.valleyEnemies = null; // a new run rolls fresh encounters
    this.state = 'play';
    this.player.iframes = 1;
    this.toast(`Run ${this.save.runs}`, 'The artifact pulls you home. Everything you found is still yours.', '#5dbb4a', 4);
  }

  // -------------------------------------------------------------------------
  // Tiles, hazards, interaction, map transitions
  // -------------------------------------------------------------------------

  private checkTiles(dt: number) {
    const p = this.player;
    const g = groundAt(this.map, p.x, p.y);

    if (g === 'stairs' && !this.fade) {
      this.startFade(() => {
        const v = this.maps.valley.spawnPoint;
        this.goTo('valley', v.x, v.y);
        this.toast('Thistledown Vale', 'Many roads lead away from here. Not all of them are kind.', '#8fd46a', 4);
      });
    }
    if (g === 'door' && !this.fade) {
      this.startFade(() => this.goTo('tower', 4.0, 12.35));
    }
    if (g === 'exit') {
      const road = nearestRoad(p.x, p.y);
      this.toast(road.name, "This road isn't finished yet. Turn back for now!", '#ffe066', 2.5, true);
      const d = norm(this.map.w / 2 - p.x, this.map.h / 2 - p.y);
      p.kbX = d.x * 8;
      p.kbY = d.y * 8;
    }

    // Scorched ground burns: soft-gates the Ashen Road until the right relic exists.
    if ((g === 'ash' || g === 'ashpath') && this.state === 'play') {
      p.hazardTick -= dt;
      if (p.hazardTick <= 0) {
        p.hazardTick = 0.5;
        p.hp -= 3;
        p.flash = 0.08;
        this.spark(p.x, p.y, '#ff8a3d', 3);
        this.floaters.push({ x: p.x, y: p.y, z: 24, text: '-3', color: '#ff8a3d', t: 0, scale: 1 });
        this.hint('ash', 'The ground is scorching!', 'Some relic out there might protect you. Or just be quick.', '#ff8a3d');
        if (p.hp <= 0) this.die();
      }
    } else p.hazardTick = 0;

    // The Mistfen swallows your sight.
    const target = g === 'marsh' ? 1 : 0;
    this.darkness += (target - this.darkness) * Math.min(1, dt * 2.5);
    if (g === 'marsh') this.hint('marsh', 'The Mistfen', "You can barely see. Maybe something could light the way...", '#8fb3a0');

    // Resting at the podium heals.
    if (this.mapId === 'tower') {
      const pod = this.maps.tower.spawnPoint;
      if (Math.hypot(p.x - pod.x, p.y - pod.y) < 1.7 && p.hp < p.maxHp) {
        p.hp = Math.min(p.maxHp, p.hp + 40 * dt);
        if (Math.random() < 0.3) this.spark(p.x, p.y, '#c9a0ff', 1, 0.8);
      }
    }
  }

  interactPrompt: string | null = null;
  signText: { title: string; body: string; x: number; y: number } | null = null;

  private checkInteract() {
    const p = this.player;
    this.interactPrompt = null;
    this.signText = null;
    for (const pk of this.pickups) {
      if (Math.hypot(pk.x - p.x, pk.y - p.y) < 1.3) {
        const name = pk.kind === 'weapon' ? WEAPONS[pk.item].name : RELICS[pk.item].name;
        this.interactPrompt = `[E] Take ${name}`;
        if (this.input.wasPressed('e')) this.collect(pk);
        return;
      }
    }
    for (const s of this.map.signs) {
      if (Math.hypot(s.x + 0.5 - p.x, s.y + 0.5 - p.y) < 1.8) {
        const road = nearestRoad(s.x, s.y);
        this.signText = { title: road.name, body: road.warning, x: s.x + 0.5, y: s.y + 0.5 };
        return;
      }
    }
  }

  private collect(pk: Pickup) {
    if (pk.kind === 'weapon') {
      const w = WEAPONS[pk.item];
      this.save.weapons.push(w.id);
      if (this.save.loadout.length < LOADOUT_SLOTS) {
        this.save.loadout.push(w.id);
        this.player.slot = this.save.loadout.length - 1;
      }
      const el = ELEMENT_INFO[w.element];
      this.toast(`${w.name} - ${el.name}`, w.blurb, el.color, 5);
      this.hint('switch', 'New weapon!', 'Press 1-4 or scroll the mouse wheel to switch. Tab opens the Armory.', '#f4eedd');
    } else {
      const r = RELICS[pk.item];
      this.save.relics.push(r.id);
      this.player.maxHp = this.stats.maxHp;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + (r.maxHpBonus ?? 0));
      this.toast(`Relic: ${r.name}`, `${r.blurb} Forever.`, r.color, 5);
    }
    writeSave(this.save);
    for (let i = 0; i < 20; i++) this.spark(pk.x, pk.y, '#fff6d6', 1, 2.5);
  }

  private goTo(id: MapId, x: number, y: number) {
    if (this.mapId === 'valley') this.valleyEnemies = this.enemies;
    this.mapId = id;
    this.projectiles = [];
    this.swings = [];
    this.particles = [];
    this.floaters = [];
    this.herbs = [];
    this.darkness = 0;
    if (id === 'valley') {
      if (!this.valleyEnemies) this.valleyEnemies = this.rollEncounters();
      this.enemies = this.valleyEnemies;
    } else {
      this.enemies = [];
    }
    this.placePlayer(x, y);
    this.snapCamera();
  }

  private startFade(mid: () => void, dur = 0.7) {
    this.fade = { t: 0, dur, mid, fired: false };
  }

  // -------------------------------------------------------------------------
  // Enemies
  // -------------------------------------------------------------------------

  private rollEncounters(): Enemy[] {
    const out: Enemy[] = [];
    const pools: Record<string, string[]> = { w: ['frostwisp'], b: ['beetle'], i: ['imp'], e: ['frostwisp', 'beetle', 'imp'] };
    let group = 0;
    for (const s of this.maps.valley.spawns) {
      if (Math.random() > 0.8) continue; // sometimes a spot is quiet this run
      group++;
      const pool = pools[s.kind];
      const kind = pool[Math.floor(Math.random() * pool.length)];
      const def = ENEMIES[kind];
      const count = def.id === 'frostwisp' ? 2 + Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        for (let tries = 0; tries < 12; tries++) {
          const x = s.x + 0.5 + (Math.random() - 0.5) * 2.4;
          const y = s.y + 0.5 + (Math.random() - 0.5) * 2.4;
          if (!collides(this.maps.valley, x, y, def.radius)) {
            out.push(this.makeEnemy(def, x, y, group));
            break;
          }
        }
      }
    }
    return out;
  }

  private makeEnemy(def: EnemyDef, x: number, y: number, group: number): Enemy {
    return {
      id: this.nextEnemyId++, def, x, y, homeX: x, homeY: y, hp: def.hp, state: 'idle', t: Math.random() * 2,
      kbX: 0, kbY: 0, dirX: 0, dirY: 0, flash: 0, faceAngle: Math.random() * Math.PI * 2, moving: false, windupDur: 1, animT: Math.random() * 10,
      contactCd: 0, shootCd: 1 + Math.random() * 2, aggro: false, group, lastHitT: -99,
    };
  }

  private updateEnemies(dt: number) {
    const p = this.player;
    const alive = this.state === 'play';
    for (const e of this.enemies) {
      const def = e.def;
      e.animT += dt;
      e.flash -= dt;
      e.contactCd -= dt;
      e.t -= dt;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy);
      const to = norm(dx, dy);

      if (!e.aggro && alive && dist < def.aggroRange) {
        e.aggro = true;
        for (const o of this.enemies) if (o.group === e.group) o.aggro = true;
      }
      if (e.aggro && (!alive || dist > def.aggroRange * 2.2)) {
        e.aggro = false;
        e.state = 'idle';
      }

      let vx = 0;
      let vy = 0;
      if (e.state === 'stun') {
        if (e.t <= 0) e.state = e.aggro ? 'chase' : 'idle';
      } else if (!e.aggro) {
        // amble around home
        if (e.t <= 0) {
          e.t = 1 + Math.random() * 2;
          const a = Math.random() * Math.PI * 2;
          const back = norm(e.homeX - e.x, e.homeY - e.y);
          e.dirX = Math.random() < 0.4 ? 0 : Math.cos(a) * 0.5 + back.x * 0.5;
          e.dirY = Math.random() < 0.4 ? 0 : Math.sin(a) * 0.5 + back.y * 0.5;
        }
        vx = e.dirX * def.speed * 0.35;
        vy = e.dirY * def.speed * 0.35;
      } else if (def.behavior === 'chase') {
        vx = to.x * def.speed;
        vy = to.y * def.speed;
      } else if (def.behavior === 'charge') {
        if (e.state === 'windup') {
          if (e.t <= 0) {
            e.state = 'charge';
            e.t = 0.65;
          }
        } else if (e.state === 'charge') {
          vx = e.dirX * 8.5;
          vy = e.dirY * 8.5;
          if (Math.random() < 0.5) this.puff(e.x, e.y, '#8a7a64', 0.5);
          const before = { x: e.x, y: e.y };
          this.moveBody(e, vx * dt, vy * dt, def.radius);
          const movedLittle = Math.hypot(e.x - before.x, e.y - before.y) < 8.5 * dt * 0.3;
          vx = vy = 0;
          if (movedLittle) {
            // bonk into a wall: dazed
            e.state = 'stun';
            e.t = 1.1;
            this.shake = Math.max(this.shake, 3);
            for (let i = 0; i < 8; i++) this.spark(e.x, e.y, '#c19a6b', 1);
          } else if (e.t <= 0) {
            e.state = 'rest';
            e.t = 0.9;
          }
        } else if (e.state === 'rest') {
          if (e.t <= 0) e.state = 'chase';
        } else {
          e.state = 'chase';
          if (dist < 4.5 && alive) {
            e.state = 'windup';
            e.t = 0.7;
            e.windupDur = 0.7;
            e.dirX = to.x;
            e.dirY = to.y;
          } else {
            vx = to.x * def.speed;
            vy = to.y * def.speed;
          }
        }
      } else if (def.behavior === 'ranged') {
        e.shootCd -= dt;
        if (e.state === 'windup') {
          if (e.t <= 0) {
            e.state = 'chase';
            e.shootCd = 1.8 + Math.random() * 1.2;
            const speed = 5.5;
            this.projectiles.push({ x: e.x, y: e.y, vx: to.x * speed, vy: to.y * speed, life: 2, damage: 10, element: 'flame', from: 'enemy', r: 0.2, knockback: 0 });
          }
        } else {
          e.state = 'chase';
          const side = e.id % 2 ? 1 : -1;
          if (dist < 3.2) { vx = -to.x; vy = -to.y; }
          else if (dist > 6) { vx = to.x; vy = to.y; }
          else { vx = -to.y * side * 0.7; vy = to.x * side * 0.7; }
          vx *= def.speed;
          vy *= def.speed;
          if (e.shootCd <= 0 && dist < 8 && alive) {
            e.state = 'windup';
            e.t = 0.45;
            e.windupDur = 0.45;
          }
        }
      }

      if (e.state === 'windup' || e.state === 'stun') {
        vx = 0;
        vy = 0;
      }
      vx += e.kbX;
      vy += e.kbY;
      e.kbX *= Math.pow(0.0005, dt);
      e.kbY *= Math.pow(0.0005, dt);
      this.moveBody(e, vx * dt, vy * dt, def.radius);
      e.moving = Math.hypot(vx - e.kbX, vy - e.kbY) > 0.2;
      const faceTo = e.state === 'charge' ? Math.atan2(e.dirY, e.dirX) : e.aggro ? Math.atan2(to.y, to.x) : e.moving ? Math.atan2(vy, vx) : e.faceAngle;
      let fd = faceTo - e.faceAngle;
      while (fd > Math.PI) fd -= Math.PI * 2;
      while (fd < -Math.PI) fd += Math.PI * 2;
      e.faceAngle += fd * Math.min(1, dt * 8);

      // contact damage
      if (alive && e.state !== 'stun' && dist < def.radius + p.r + 0.08 && e.contactCd <= 0) {
        this.damagePlayer(e.state === 'charge' ? def.contactDamage + 6 : def.contactDamage, e.x, e.y, def.element);
        e.contactCd = 0.9;
        if (e.state === 'charge') {
          e.state = 'rest';
          e.t = 0.9;
        }
      }
    }

    // keep enemies from stacking on each other
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        const a = this.enemies[i];
        const b = this.enemies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const min = a.def.radius + b.def.radius;
        if (d > 0 && d < min) {
          const push = (min - d) / 2;
          this.moveBody(a, (-dx / d) * push, (-dy / d) * push, a.def.radius);
          this.moveBody(b, (dx / d) * push, (dy / d) * push, b.def.radius);
        }
      }
    }
  }

  private updateProjectiles(dt: number) {
    const m = this.map;
    const p = this.player;
    const keep: Projectile[] = [];
    for (const pr of this.projectiles) {
      pr.life -= dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      if (Math.random() < 0.7) this.spark(pr.x, pr.y, ELEMENT_INFO[pr.element].color, 1, 0.3);
      const blocked = solidAt(m, pr.x, pr.y) !== null || groundAt(m, pr.x, pr.y) === 'void';
      let hit = false;
      if (pr.from === 'player') {
        for (const e of this.enemies) {
          if (Math.hypot(e.x - pr.x, e.y - pr.y) < e.def.radius + pr.r) {
            const d = norm(pr.vx, pr.vy);
            this.hitEnemy(e, pr.damage, pr.element, d.x, d.y, pr.knockback);
            hit = true;
            break;
          }
        }
      } else if (Math.hypot(p.x - pr.x, p.y - pr.y) < p.r + pr.r && p.iframes <= 0 && this.state === 'play') {
        this.damagePlayer(pr.damage, pr.x - pr.vx, pr.y - pr.vy, pr.element);
        hit = true;
      }
      if (hit || blocked || pr.life <= 0) {
        for (let i = 0; i < 5; i++) this.spark(pr.x, pr.y, ELEMENT_INFO[pr.element].color, 1);
        continue;
      }
      keep.push(pr);
    }
    this.projectiles = keep;
  }

  private updateHerbs() {
    const p = this.player;
    this.herbs = this.herbs.filter((h) => {
      h.t += 1 / 60;
      if (Math.hypot(h.x - p.x, h.y - p.y) < 0.6 && this.state === 'play') {
        const heal = 15;
        p.hp = Math.min(p.maxHp, p.hp + heal);
        this.floaters.push({ x: p.x, y: p.y, z: 24, text: `+${heal}`, color: '#8fd46a', t: 0, scale: 1 });
        for (let i = 0; i < 8; i++) this.spark(p.x, p.y, '#8fd46a', 1);
        return false;
      }
      return true;
    });
  }

  // -------------------------------------------------------------------------
  // Effects, toasts, camera
  // -------------------------------------------------------------------------

  private updateEffects(dt: number) {
    for (const pt of this.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vz -= pt.gravity * dt;
      pt.z = Math.max(0, pt.z + pt.vz * dt);
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
    for (const f of this.floaters) f.t += dt;
    this.floaters = this.floaters.filter((f) => f.t < 0.9);
    for (const s of this.swings) s.t += dt;
    this.swings = this.swings.filter((s) => s.t < s.dur);
    this.shake = Math.max(0, this.shake - dt * 20);
  }

  private updateToasts(dt: number) {
    for (const t of this.toasts) t.t += dt;
    this.toasts = this.toasts.filter((t) => t.t < t.dur);
  }

  toast(title: string, sub: string | undefined, color: string, dur = 3, unique = false) {
    if (unique && this.toasts.some((t) => t.title === title)) return;
    this.toasts = this.toasts.filter((t) => t.title !== title);
    this.toasts.push({ title, sub, color, t: 0, dur });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  private hint(key: string, title: string, sub: string, color: string) {
    if (this.hints.has(key)) return;
    this.hints.add(key);
    this.toast(title, sub, color, 5);
  }

  private updateCamera(dt: number) {
    const s = project(this.player.x, this.player.y, this.player.z);
    const k = Math.min(1, dt * 6);
    this.camX += (s.x - this.camX) * k;
    this.camY += (s.y - CAM_LIFT - this.camY) * k;
  }

  spark(x: number, y: number, color: string, n = 1, speed = 2) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = Math.random() * speed;
      this.particles.push({
        x, y, z: 8 + Math.random() * 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 20 + Math.random() * 40,
        life: 0.3 + Math.random() * 0.4, max: 0.7, color, size: 1, gravity: 120,
      });
    }
  }

  puff(x: number, y: number, color: string, speed = 0.5) {
    const a = Math.random() * Math.PI * 2;
    this.particles.push({
      x: x + Math.cos(a) * 0.15, y: y + Math.sin(a) * 0.15, z: 1, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      vz: 8, life: 0.35, max: 0.35, color, size: 2, gravity: 0,
    });
  }

  /** Is (x, y) blocked for line-of-sight style checks? Exposed for the renderer. */
  blocked(x: number, y: number) {
    return isBlocked(this.map, x, y);
  }
}
