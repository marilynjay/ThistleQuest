// Thistle, drawn as a painted puppet: a small 3D skeleton is posed and projected into the
// isometric view every frame, then each body part is painted as a shaded shape. This gives
// smooth 360-degree facing and fluid animation without any sprite sheets.

import type { Vec } from '../engine/iso';
import { orb, shade, type Ctx, type Proj } from './kit';
import { drawWeapon, WEAPON_SHAPES } from './weaponArt';

export interface ThistlePose {
  x: number;
  y: number;
  z: number;
  facing: number; // radians in world space
  walk: number; // walk-cycle phase (radians)
  speed: number; // 0 idle .. 1 full run
  t: number; // time, for idle motion
  weapon: string;
  attack: number; // 0 = not attacking, else 0..1 progress through the swing
  attackKind: 'melee' | 'bolt' | 'lunge';
  dodge: number; // 0..1 while rolling
  velX: number; // world velocity, for hair sway
  velY: number;
}

const SKIN = '#f2d3b8';
const VEST = '#dcd0b0';
const SHIRT = '#4a5a6a';
const PANTS = '#2a2733';
const BOOTS = '#4a3222';
const BELT = '#5a3a24';
const HAIR = '#3f9a4a';
const HAIR_DARK = '#1d5429';
const HAIR_LIGHT = '#9be08a';
const INK = 'rgba(22,16,26,0.85)';

// toward the camera, in world xy
const CAM = { x: Math.SQRT1_2, y: Math.SQRT1_2 };

type W3 = { x: number; y: number; z: number };

interface Part {
  depth: number;
  draw: () => void;
}

/** A limb as one smooth stroke through its joints: outline, base color, then a highlight. */
function strokeLimb(ctx: Ctx, pts: Vec[], width: number, color: string) {
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    if (pts.length === 3) ctx.quadraticCurveTo(pts[1].x, pts[1].y, pts[2].x, pts[2].y);
    else for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  path();
  ctx.lineWidth = width + 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  path();
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
  // soft highlight along the lit (upper-left) edge
  ctx.save();
  ctx.translate(-width * 0.2, -width * 0.12);
  path();
  ctx.lineWidth = width * 0.35;
  ctx.strokeStyle = shade(color, 0.28);
  ctx.globalAlpha = 0.8;
  ctx.stroke();
  ctx.restore();
}

export function drawThistle(ctx: Ctx, S: Proj, p: ThistlePose) {
  const fx = Math.cos(p.facing);
  const fy = Math.sin(p.facing);
  const rx = fy; // Thistle's right-hand side
  const ry = -fx;
  const facingCam = fx * CAM.x + fy * CAM.y; // 1 = looking at us, -1 = away
  // screen-space directions of "forward" and "right"
  const fsx = fx - fy;
  const fsy = (fx + fy) / 2;
  const rsx = rx - ry;

  const run = p.speed;
  const ph = p.walk;
  const crouch = p.dodge > 0 ? Math.sin(p.dodge * Math.PI) : 0;
  const bob = Math.abs(Math.cos(ph)) * 0.035 * run - crouch * 0.3;
  const breathe = Math.sin(p.t * 2.2) * 0.008 * (1 - run);
  const lunging = p.attackKind === 'lunge' && p.attack > 0;
  const lean = 0.07 * run + crouch * 0.4 + (lunging ? 0.25 : 0);

  const W = (lat: number, fwd: number, up: number): W3 => ({
    x: p.x + rx * lat + fx * fwd,
    y: p.y + ry * lat + fy * fwd,
    z: p.z + up,
  });
  const scr = (w: W3) => S(w.x, w.y, w.z);
  const depthOf = (w: W3) => w.x + w.y;

  // --- skeleton ------------------------------------------------------------
  const hipUp = 0.88 + bob;
  const waistUp = 1.04 + bob + breathe;
  const chestUp = 1.24 + bob + breathe;
  const shoulderUp = 1.37 + bob + breathe;
  const headUp = 1.63 + bob + breathe;
  const leanF = (up: number) => lean * Math.max(0, up - 0.85);

  const HR = Math.abs(S(0, 0, 0.2).y - S(0, 0, 0).y); // head radius in screen px

  const legs = [-1, 1].map((side) => {
    const swing = Math.sin(ph) * side * 0.28 * run;
    const lift = Math.max(0, Math.cos(ph) * side) * 0.13 * run;
    const hip = W(side * 0.09, 0, hipUp);
    const ankle = W(side * 0.085, swing - 0.02 + (p.dodge > 0 ? -0.1 : 0), lift + 0.08);
    const knee = W(side * 0.09, swing * 0.5 + 0.06 + lift * 0.9 + crouch * 0.25, (hipUp + lift + 0.08) / 2 + 0.02);
    const toe = W(side * 0.085, swing + 0.14 + (p.dodge > 0 ? -0.1 : 0), lift + 0.02);
    return { side, hip, knee, ankle, toe };
  });

  const shoulderL = W(-0.2, leanF(shoulderUp), shoulderUp - 0.03);
  const shoulderR = W(0.2, leanF(shoulderUp), shoulderUp - 0.03);
  const swingArm = (side: number) => -Math.sin(ph) * side * 0.2 * run;
  let handL = W(-0.22, swingArm(-1) + leanF(0.95), 0.9 + bob);
  let handR = W(0.22, swingArm(1) + leanF(0.95) + 0.05, 0.92 + bob);
  let wdir = { x: fx * 0.4 + rx * 0.08, y: fy * 0.4 + ry * 0.08, z: -1 };
  if (p.weapon === 'thunderpike') wdir = { x: fx * 0.15, y: fy * 0.15, z: 1 };

  if (p.attack > 0) {
    const a = 1 - (1 - p.attack) * (1 - p.attack);
    if (p.attackKind === 'melee') {
      const ang = 1.2 - a * 2.6;
      handR = W(Math.sin(ang) * 0.45 + 0.05, Math.cos(ang) * 0.36 + 0.15, 1.18 - a * 0.22);
      wdir = { x: fx * Math.cos(ang) + rx * Math.sin(ang), y: fy * Math.cos(ang) + ry * Math.sin(ang), z: 0.15 - a * 0.3 };
      handL = W(-0.25, -0.05, 1.0);
    } else if (p.attackKind === 'bolt') {
      const recoil = Math.sin(a * Math.PI) * 0.08;
      handR = W(0.1, 0.5 - recoil, 1.3);
      wdir = { x: fx, y: fy, z: 0.25 };
    } else {
      handR = W(0.1, 0.42, 1.1);
      handL = W(-0.05, 0.28, 1.05);
      wdir = { x: fx, y: fy, z: -0.05 };
    }
  } else if (p.dodge > 0) {
    handR = W(0.22, 0.2, 0.65);
    handL = W(-0.22, 0.2, 0.65);
  }
  const elbowOf = (sh: W3, hand: W3, side: number): W3 => ({
    x: (sh.x + hand.x) / 2 + rx * side * 0.05 - fx * 0.04,
    y: (sh.y + hand.y) / 2 + ry * side * 0.05 - fy * 0.04,
    z: (sh.z + hand.z) / 2 - 0.02,
  });

  const head = W(0, leanF(headUp) + 0.01, headUp);
  const hs = scr(head);
  const parts: Part[] = [];

  // --- legs ------------------------------------------------------------------
  for (const L of legs) {
    parts.push({
      depth: depthOf(L.knee) - 0.05,
      draw: () => {
        const hip = scr(L.hip);
        const knee = scr(L.knee);
        const ankle = scr(L.ankle);
        const toe = scr(L.toe);
        strokeLimb(ctx, [hip, knee, ankle], HR * 0.86, PANTS);
        // boot: from mid-shin down, then the foot
        const shin = { x: knee.x + (ankle.x - knee.x) * 0.4, y: knee.y + (ankle.y - knee.y) * 0.4 };
        strokeLimb(ctx, [shin, ankle], HR * 0.8, BOOTS);
        strokeLimb(ctx, [{ x: ankle.x, y: ankle.y + HR * 0.15 }, toe], HR * 0.58, BOOTS);
        // folded boot cuff
        ctx.strokeStyle = shade(BOOTS, 0.25);
        ctx.lineWidth = HR * 0.18;
        ctx.beginPath();
        ctx.moveTo(shin.x - HR * 0.36, shin.y);
        ctx.lineTo(shin.x + HR * 0.36, shin.y);
        ctx.stroke();
      },
    });
  }

  // --- torso -----------------------------------------------------------------
  const levels: [number, number, number, number][] = [
    // up, half-width, half-depth, forward offset
    [shoulderUp + 0.02, 0.215, 0.1, leanF(shoulderUp)],
    [chestUp, 0.195, 0.11, leanF(chestUp)],
    [waistUp, 0.14, 0.09, leanF(waistUp)],
    [hipUp + 0.03, 0.15, 0.09, 0],
  ];
  const torsoC = W(0, 0, chestUp);
  parts.push({
    depth: depthOf(torsoC),
    draw: () => {
      const left: Vec[] = [];
      const right: Vec[] = [];
      for (const [up, hw, hd, fo] of levels) {
        const pts = [W(-hw, fo - hd, up), W(hw, fo - hd, up), W(hw, fo + hd, up), W(-hw, fo + hd, up)].map(scr);
        const xs = pts.map((q) => q.x);
        const y = pts.reduce((s, q) => s + q.y, 0) / 4;
        left.push({ x: Math.min(...xs), y });
        right.push({ x: Math.max(...xs), y });
      }
      const outline = () => {
        ctx.beginPath();
        ctx.moveTo(left[0].x + 2, left[0].y - 1);
        ctx.quadraticCurveTo(left[1].x - 1, left[1].y, left[2].x, left[2].y);
        ctx.lineTo(left[3].x, left[3].y);
        ctx.lineTo(right[3].x, right[3].y);
        ctx.lineTo(right[2].x, right[2].y);
        ctx.quadraticCurveTo(right[1].x + 1, right[1].y, right[0].x - 2, right[0].y - 1);
        ctx.quadraticCurveTo((left[0].x + right[0].x) / 2, left[0].y - HR * 0.35, left[0].x + 2, left[0].y - 1);
        ctx.closePath();
      };
      // undershirt (the whole torso), then the vest panels over it
      outline();
      const minX = Math.min(...left.map((q) => q.x));
      const maxX = Math.max(...right.map((q) => q.x));
      const g = ctx.createLinearGradient(minX, 0, maxX, 0);
      g.addColorStop(0, shade(VEST, 0.22));
      g.addColorStop(0.55, VEST);
      g.addColorStop(1, shade(VEST, -0.38));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      if (facingCam > -0.2) {
        const vis = Math.min(1, (facingCam + 0.2) * 2.5);
        ctx.save();
        outline();
        ctx.clip();
        ctx.globalAlpha = vis;
        // V-neck opening showing the dark shirt beneath
        const nl = scr(W(-0.08, leanF(shoulderUp) + 0.1, shoulderUp + 0.02));
        const nr = scr(W(0.08, leanF(shoulderUp) + 0.1, shoulderUp + 0.02));
        const nb = scr(W(0, leanF(waistUp) + 0.1, waistUp + 0.04));
        ctx.beginPath();
        ctx.moveTo(nl.x, nl.y - 2);
        ctx.quadraticCurveTo(nb.x - HR * 0.1, (nl.y + nb.y) / 2, nb.x, nb.y);
        ctx.quadraticCurveTo(nb.x + HR * 0.1, (nr.y + nb.y) / 2, nr.x, nr.y - 2);
        ctx.closePath();
        ctx.fillStyle = SHIRT;
        ctx.fill();
        ctx.strokeStyle = shade(VEST, -0.4);
        ctx.lineWidth = 1;
        ctx.stroke();
        // lacing across the opening
        ctx.strokeStyle = '#c9a86a';
        ctx.lineWidth = 0.9;
        for (let i = 0; i < 3; i++) {
          const k = 0.3 + i * 0.22;
          const a = { x: nl.x + (nb.x - nl.x) * k, y: nl.y + (nb.y - nl.y) * k };
          const b = { x: nr.x + (nb.x - nr.x) * k, y: nr.y + (nb.y - nr.y) * k };
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y + 1.5);
          ctx.stroke();
        }
        ctx.restore();
      }
      // belt
      const bl = scr(W(-0.15, 0, hipUp + 0.07));
      const br = scr(W(0.15, 0, hipUp + 0.07));
      const bfr = scr(W(0, 0.1, hipUp + 0.07));
      const bbk = scr(W(0, -0.1, hipUp + 0.07));
      const xs = [bl.x, br.x, bfr.x, bbk.x];
      const by = (bl.y + br.y + bfr.y + bbk.y) / 4;
      ctx.fillStyle = BELT;
      ctx.beginPath();
      ctx.roundRect(Math.min(...xs) - 0.5, by - HR * 0.2, Math.max(...xs) - Math.min(...xs) + 1, HR * 0.4, 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      if (facingCam > 0) {
        ctx.fillStyle = '#d8b25a';
        ctx.fillRect(bfr.x - HR * 0.17, by - HR * 0.17, HR * 0.34, HR * 0.34);
        ctx.fillStyle = BELT;
        ctx.fillRect(bfr.x - HR * 0.07, by - HR * 0.07, HR * 0.14, HR * 0.14);
      }
      // a janitor's rag tucked into the belt, on the right hip
      const rag = scr(W(0.16, -0.03, hipUp + 0.02));
      const sway = Math.sin(p.t * 3 + ph) * 1.5;
      ctx.fillStyle = '#8aa6b8';
      ctx.beginPath();
      ctx.moveTo(rag.x - HR * 0.22, rag.y);
      ctx.lineTo(rag.x + HR * 0.25, rag.y);
      ctx.quadraticCurveTo(rag.x + HR * 0.3, rag.y + HR * 0.6, rag.x + HR * 0.1 + sway, rag.y + HR * 1.1);
      ctx.lineTo(rag.x - HR * 0.25 + sway, rag.y + HR * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,40,50,0.6)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    },
  });

  // --- arms ------------------------------------------------------------------
  for (const [side, sh, hand] of [[-1, shoulderL, handL], [1, shoulderR, handR]] as const) {
    const el = elbowOf(sh, hand, side);
    parts.push({
      depth: depthOf(el) + 0.02,
      draw: () => {
        const s = scr(sh);
        const e = scr(el);
        const h = scr(hand);
        strokeLimb(ctx, [s, e, h], HR * 0.58, SKIN);
        // leather bracer on the forearm
        const b0 = { x: e.x + (h.x - e.x) * 0.3, y: e.y + (h.y - e.y) * 0.3 };
        const b1 = { x: e.x + (h.x - e.x) * 0.8, y: e.y + (h.y - e.y) * 0.8 };
        strokeLimb(ctx, [b0, b1], HR * 0.66, '#6a4428');
        orb(ctx, h.x, h.y, HR * 0.33, HR * 0.33, SKIN, INK);
      },
    });
  }

  // --- weapon ----------------------------------------------------------------
  const shape = WEAPON_SHAPES[p.weapon];
  if (shape) {
    const wl = Math.hypot(wdir.x, wdir.y, wdir.z) || 1;
    const d = { x: wdir.x / wl, y: wdir.y / wl, z: wdir.z / wl };
    const L = shape.length;
    const at = (k: number): W3 => ({ x: handR.x + d.x * L * k, y: handR.y + d.y * L * k, z: Math.max(p.z + 0.02, handR.z + d.z * L * k) });
    parts.push({
      depth: depthOf(handR) + 0.03,
      draw: () => drawWeapon(ctx, p.weapon, scr(at(-shape.grip)), scr(at(1 - shape.grip)), 1.15, p.t),
    });
  }

  // --- long hair down the back ---------------------------------------------
  const swayX = -p.velX * 0.05;
  const swayY = -p.velY * 0.05;
  const hairAnchor = W(0, leanF(headUp) - 0.12, headUp - 0.3);
  parts.push({
    depth: depthOf(hairAnchor) - 0.03,
    draw: () => {
      const wave = (i: number) => Math.sin(p.t * 2.2 + ph + i) * 0.02;
      const locks = 6;
      const tips: Vec[] = [];
      for (let i = 0; i < locks; i++) {
        const k = i / (locks - 1) - 0.5; // -0.5..0.5 across the back
        const len = 0.66 + Math.cos(k * Math.PI) * 0.08 + ((i * 37) % 5) * 0.012;
        const w = W(k * 0.36 + wave(i), -0.18 - run * 0.14, headUp - len);
        tips.push(scr({ x: w.x + swayX, y: w.y + swayY, z: w.z }));
      }
      const topL = scr(W(-0.19, leanF(headUp) - 0.05, headUp + 0.02));
      const topR = scr(W(0.19, leanF(headUp) - 0.05, headUp + 0.02));
      const swayed = (w: W3, k: number) => scr({ x: w.x + swayX * k, y: w.y + swayY * k, z: w.z });
      const midL = swayed(W(-0.23, leanF(shoulderUp) - 0.15, shoulderUp), 0.5);
      const midR = swayed(W(0.23, leanF(shoulderUp) - 0.15, shoulderUp), 0.5);
      // order the tips left-to-right on screen so the hem zig-zags cleanly
      const ordered = rsx >= 0 ? tips : [...tips].reverse();
      const [sL, sR] = rsx >= 0 ? [topL, topR] : [topR, topL];
      const [mL, mR] = rsx >= 0 ? [midL, midR] : [midR, midL];
      ctx.beginPath();
      ctx.moveTo(sL.x, sL.y);
      ctx.quadraticCurveTo(mL.x - HR * 0.2, mL.y, ordered[0].x, ordered[0].y);
      for (let i = 1; i < ordered.length; i++) {
        const a = ordered[i - 1];
        const b = ordered[i];
        // notch between locks
        ctx.quadraticCurveTo((a.x + b.x) / 2, Math.min(a.y, b.y) - HR * 0.55, b.x, b.y);
      }
      ctx.quadraticCurveTo(mR.x + HR * 0.2, mR.y, sR.x, sR.y);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, Math.min(sL.y, sR.y), 0, Math.max(...ordered.map((q) => q.y)));
      g.addColorStop(0, HAIR);
      g.addColorStop(0.6, shade(HAIR, -0.15));
      g.addColorStop(1, HAIR_DARK);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(8,30,14,0.8)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      // strands
      ctx.save();
      ctx.clip();
      ctx.lineWidth = 1;
      for (let i = 0; i < ordered.length; i++) {
        const tip = ordered[i];
        const top = { x: sL.x + (sR.x - sL.x) * (i / (ordered.length - 1)), y: sL.y + (sR.y - sL.y) * (i / (ordered.length - 1)) };
        ctx.strokeStyle = i % 2 ? 'rgba(160,230,140,0.45)' : 'rgba(10,40,18,0.35)';
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.quadraticCurveTo(top.x + (tip.x - top.x) * 0.3 + HR * 0.2, (top.y + tip.y) / 2, tip.x, tip.y - HR * 0.2);
        ctx.stroke();
      }
      ctx.restore();
    },
  });

  // --- head, face and hair cap ----------------------------------------------
  parts.push({
    depth: depthOf(head),
    draw: () => {
      // neck
      const neckBase = scr(W(0, leanF(shoulderUp), shoulderUp));
      strokeLimb(ctx, [neckBase, { x: hs.x, y: hs.y + HR * 0.55 }], HR * 0.42, shade(SKIN, -0.06));

      // skull
      const skin = ctx.createRadialGradient(hs.x - HR * 0.3, hs.y - HR * 0.35, HR * 0.1, hs.x, hs.y, HR * 1.1);
      skin.addColorStop(0, shade(SKIN, 0.18));
      skin.addColorStop(0.7, SKIN);
      skin.addColorStop(1, shade(SKIN, -0.18));
      ctx.beginPath();
      ctx.ellipse(hs.x, hs.y + HR * 0.05, HR * 0.92, HR, 0, 0, Math.PI * 2);
      ctx.fillStyle = skin;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.1;
      ctx.stroke();

      // face features: built in screen space from the facing direction
      const fcx = hs.x + fsx * HR * 0.42;
      const fcy = hs.y + HR * 0.18 + fsy * HR * 0.1;
      const faceVis = Math.max(0, Math.min(1, (facingCam + 0.3) * 2));
      if (faceVis > 0) {
        ctx.save();
        ctx.globalAlpha = faceVis;
        const spread = Math.max(0.25, Math.abs(rsx) / 1.414) * HR * 0.36;
        for (const side of [-1, 1]) {
          const ex = fcx + side * spread;
          if (Math.abs(ex - hs.x) > HR * 0.78) continue;
          const ey = fcy - HR * 0.05;
          ctx.fillStyle = '#fffaf2';
          ctx.beginPath();
          ctx.ellipse(ex, ey, HR * 0.17, HR * 0.18, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#3a8a4a';
          ctx.beginPath();
          ctx.ellipse(ex + fsx * HR * 0.03, ey + HR * 0.02, HR * 0.11, HR * 0.14, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0e1a10';
          ctx.beginPath();
          ctx.arc(ex + fsx * HR * 0.04, ey + HR * 0.04, HR * 0.065, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex - HR * 0.05, ey - HR * 0.05, HR * 0.045, 0, Math.PI * 2);
          ctx.fill();
          // upper lash line
          ctx.strokeStyle = 'rgba(42,26,32,0.8)';
          ctx.lineWidth = Math.max(0.8, HR * 0.05);
          ctx.beginPath();
          ctx.ellipse(ex, ey, HR * 0.17, HR * 0.18, 0, Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
          // a straight, slightly heavier brow
          ctx.strokeStyle = HAIR_DARK;
          ctx.lineWidth = Math.max(1, HR * 0.1);
          ctx.beginPath();
          ctx.moveTo(ex - HR * 0.19, ey - HR * 0.3);
          ctx.lineTo(ex + HR * 0.19, ey - HR * 0.33);
          ctx.stroke();
        }
        // nose and a small, calm mouth
        ctx.strokeStyle = 'rgba(160,100,80,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(fcx + fsx * HR * 0.1, fcy + HR * 0.12);
        ctx.lineTo(fcx + fsx * HR * 0.14, fcy + HR * 0.24);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(120,64,58,0.8)';
        ctx.lineWidth = Math.max(1, HR * 0.06);
        ctx.beginPath();
        ctx.moveTo(fcx - HR * 0.1 + fsx * HR * 0.08, fcy + HR * 0.4);
        ctx.quadraticCurveTo(fcx + fsx * HR * 0.08, fcy + HR * 0.46, fcx + HR * 0.1 + fsx * HR * 0.08, fcy + HR * 0.39);
        ctx.stroke();
        ctx.restore();
      }

      // pointed ear on whichever side faces the camera
      if (Math.abs(rsx) > 0.5) {
        // the visible ear sits opposite the way the face is turned on screen
        const earSide = fsx > 0 ? -1 : 1;
        const ex = hs.x + earSide * HR * 0.8;
        const ey = hs.y + HR * 0.1;
        ctx.beginPath();
        ctx.moveTo(ex, ey - HR * 0.2);
        ctx.quadraticCurveTo(ex + earSide * HR * 0.35, ey - HR * 0.4, ex + earSide * HR * 0.5, ey - HR * 0.65);
        ctx.quadraticCurveTo(ex + earSide * HR * 0.2, ey + HR * 0.05, ex, ey + HR * 0.22);
        ctx.closePath();
        ctx.fillStyle = shade(SKIN, -0.05);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // hair cap: covers the crown; its lower edge is a fringe of locks across the forehead
      const capTop = hs.y - HR * 1.12;
      ctx.save();
      ctx.beginPath();
      if (faceVis > 0.05) {
        const fringeY = fcy - HR * 0.42;
        const leftX = hs.x - HR * 1.05;
        const rightX = hs.x + HR * 1.05;
        // side curtains reach the jaw on both sides; fringe dips between them
        ctx.moveTo(leftX, hs.y + HR * 0.55);
        ctx.quadraticCurveTo(leftX - HR * 0.1, capTop + HR * 0.2, hs.x - HR * 0.1, capTop);
        ctx.quadraticCurveTo(rightX + HR * 0.1, capTop + HR * 0.2, rightX, hs.y + HR * 0.55);
        // right side curtain inner edge
        const curtainR = Math.min(rightX - HR * 0.15, fcx + HR * 0.72);
        const curtainL = Math.max(leftX + HR * 0.15, fcx - HR * 0.72);
        ctx.quadraticCurveTo(curtainR + HR * 0.05, hs.y + HR * 0.1, curtainR - HR * 0.05, fringeY + HR * 0.05);
        // fringe: four swept locks
        const n = 4;
        for (let i = 1; i <= n; i++) {
          const x = curtainR + ((curtainL - curtainR) * i) / n;
          const dip = i % 2 ? HR * 0.32 : HR * 0.14;
          ctx.quadraticCurveTo(x + (curtainR - curtainL) / n * 0.3, fringeY - HR * 0.12, x, fringeY + dip);
        }
        ctx.quadraticCurveTo(curtainL - HR * 0.05, hs.y + HR * 0.1, leftX, hs.y + HR * 0.55);
        ctx.closePath();
      } else {
        ctx.ellipse(hs.x, hs.y - HR * 0.05, HR * 1.07, HR * 1.12, 0, 0, Math.PI * 2);
      }
      const cg = ctx.createRadialGradient(hs.x - HR * 0.35, capTop + HR * 0.35, HR * 0.1, hs.x, hs.y, HR * 1.4);
      cg.addColorStop(0, HAIR_LIGHT);
      cg.addColorStop(0.35, HAIR);
      cg.addColorStop(1, HAIR_DARK);
      ctx.fillStyle = cg;
      ctx.fill();
      ctx.strokeStyle = 'rgba(8,30,14,0.85)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      // a glossy highlight arc
      ctx.strokeStyle = 'rgba(200,255,180,0.5)';
      ctx.lineWidth = Math.max(1, HR * 0.12);
      ctx.beginPath();
      ctx.arc(hs.x, hs.y - HR * 0.1, HR * 0.78, Math.PI * 1.15, Math.PI * 1.55);
      ctx.stroke();
      ctx.restore();
    },
  });

  // locks falling over the shoulders in front
  if (facingCam > -0.25) {
    for (const side of [-1, 1]) {
      const top = W(side * 0.16, leanF(headUp) + 0.03, headUp - 0.05);
      parts.push({
        depth: depthOf(top) + 0.1,
        draw: () => {
          const a = scr(top);
          const e = W(side * 0.17, leanF(chestUp) + 0.1, chestUp - 0.06);
          const end = scr({ x: e.x + swayX * 0.4, y: e.y + swayY * 0.4, z: e.z });
          const mid = scr(W(side * 0.2, leanF(shoulderUp) + 0.08, shoulderUp + 0.02));
          ctx.beginPath();
          ctx.moveTo(a.x - HR * 0.22, a.y);
          ctx.quadraticCurveTo(mid.x - HR * 0.3, mid.y, end.x, end.y);
          ctx.quadraticCurveTo(mid.x + HR * 0.3, mid.y, a.x + HR * 0.22, a.y);
          ctx.closePath();
          ctx.fillStyle = HAIR;
          ctx.fill();
          ctx.strokeStyle = 'rgba(8,30,14,0.8)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.strokeStyle = 'rgba(170,240,150,0.45)';
          ctx.beginPath();
          ctx.moveTo(a.x, a.y + 2);
          ctx.quadraticCurveTo(mid.x, mid.y, end.x, end.y - 2);
          ctx.stroke();
        },
      });
    }
  }

  parts.sort((a, b) => a.depth - b.depth);
  for (const part of parts) part.draw();
}
