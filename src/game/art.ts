import { makeSprite, paintSprite, hash2, type Sprite } from '../engine/sprite';

// ---------------------------------------------------------------------------
// Thistle: famulus of the tower. Long green hair, grey-blue smock, work apron.
// ---------------------------------------------------------------------------

const THISTLE_PAL = {
  o: '#1a1626',
  h: '#5dbb4a',
  H: '#2f7a34',
  g: '#a6e883',
  k: '#f3d2b3',
  K: '#d9a585',
  e: '#2a2338',
  t: '#5a6f96',
  T: '#3c4a6b',
  a: '#d6c7a1',
  A: '#b3a37c',
  p: '#4a3f5c',
  b: '#5b3a29',
};

const FRONT_BODY = [
  '...oooooo...',
  '..ohhgghho..',
  '.ohhhgghhho.',
  '.ohHkkkkHho.',
  '.ohkekkekho.',
  '.ohkkkkkkho.',
  'ohhHkKKkHhho',
  'ohhotkktohho',
  'ohHttaattHho',
  'ohHtaaaatHHo',
  '.oHtaAAatHo.',
  '.okTaaaaTko.',
  '..oTaAAaTo..',
  '..oTTTTTTo..',
  '...oppppo...',
];

const BACK_BODY = [
  '...oooooo...',
  '..ohhgghho..',
  '.ohhhgghhho.',
  '.ohhhhhhhho.',
  '.ohhhHhhhho.',
  '.ohhhHHhhho.',
  'ohhhhHHhhhho',
  'ohhhhHhhhhho',
  'ohhhHhhHhhho',
  'ohHhhHhhHhHo',
  '.oHtHhhHtHo.',
  '.okThHHhTko.',
  '..oTTHHTTo..',
  '..oTTTTTTo..',
  '...oppppo...',
];

const SIDE_BODY = [
  '....ooooo...',
  '...ohhgghho.',
  '..ohhhhgghho',
  '.ohhhhhhkkko',
  '.ohhhhhhkeko',
  '.ohhhhhhkkko',
  '.ohhhhhKkko.',
  '.ohhhhottoo.',
  '.ohhhhttaao.',
  '.ohHhhtaaAo.',
  '..oHhhtaaAo.',
  '..oHHTtkkao.',
  '...oHTaaAo..',
  '...oTTTTTo..',
  '....opppo...',
];

const LEGS_FRONT = {
  stand: ['...opoopo...', '...oboobo...', '..obboobbo..'],
  a: ['...opoopo...', '..obboopo...', '......obbo..'],
  b: ['...opoopo...', '...opoobbo..', '..obbo......'],
};

const LEGS_SIDE = {
  stand: ['....oppo....', '....obbo....', '....obbbo...'],
  a: ['...opo.opo..', '..obo...obo.', '..oo....oo..'],
  b: ['....oppo....', '....obbo....', '....obbbo...'],
};

export type Facing = 'down' | 'up' | 'left' | 'right';

export interface CharacterFrames {
  frames: Record<Facing, Sprite[]>; // [stand, walkA, walkB]
}

function buildThistle(): CharacterFrames {
  const mk = (body: string[], legs: string[], mirror = false) => makeSprite([...body, ...legs], THISTLE_PAL, mirror);
  const set = (body: string[], L: typeof LEGS_FRONT, mirror = false) => [
    mk(body, L.stand, mirror),
    mk(body, L.a, mirror),
    mk(body, L.b, mirror),
  ];
  return {
    frames: {
      down: set(FRONT_BODY, LEGS_FRONT),
      up: set(BACK_BODY, LEGS_FRONT),
      right: set(SIDE_BODY, LEGS_SIDE),
      left: set(SIDE_BODY, LEGS_SIDE, true),
    },
  };
}

// ---------------------------------------------------------------------------
// Enemies
// ---------------------------------------------------------------------------

const WISP = [
  '.....c.....',
  '....cwc....',
  '...cwwwc...',
  '..cwwwwwc..',
  '.cwwwwwwwc.',
  '.cwewwwewc.',
  '.cwwwwwwwc.',
  '.ccwwwwwcc.',
  '..ccwcwcc..',
  '...c.c.c...',
];
const WISP2 = [
  '.....c.....',
  '....cwc....',
  '...cwwwc...',
  '..cwwwwwc..',
  '.cwwwwwwwc.',
  '.cwewwwewc.',
  '.cwwwwwwwc.',
  '.ccwwwwwcc.',
  '..cwcwcwc..',
  '..c.c.c.c..',
];
const WISP_PAL = { c: '#4fb3dc', w: '#e8fbff', e: '#1a2a44' };

const BEETLE = [
  '....oooooooo....',
  '..oollsssslloo..',
  '.olllsssssssllo.',
  '.olssssSSssssso.',
  'osssssSSSSsssso.',
  'osSSSSSSSSSSSSo.',
  '.oSSSoeooeoSSo..',
  '.o.o.oooooo.o.o.',
  'o..o........o..o',
];
const BEETLE2 = [
  '....oooooooo....',
  '..oollsssslloo..',
  '.olllsssssssllo.',
  '.olssssSSssssso.',
  'osssssSSSSsssso.',
  'osSSSSSSSSSSSSo.',
  '.oSSSoeooeoSSo..',
  '..o.ooooooo.o...',
  '.o..o......o.o..',
];
const BEETLE_PAL = { o: '#1c1612', s: '#8a7a64', S: '#5b4e3f', l: '#b8a78a', e: '#ffcf4a' };

const IMP = [
  '.y.......y.',
  '.oy.....yo.',
  '..orrrrro..',
  '.orrrrrrro.',
  '.oreerreero',
  '.orrrRRrrro',
  '..orRRRRro.',
  '.oorrrrrroo',
  'orRrrrrrrRo',
  '..oRrrrRo..',
  '..orRoRro..',
  '..oRo.oRo..',
  '..oo...oo..',
];
const IMP2 = [
  '.y.......y.',
  '.oy.....yo.',
  '..orrrrro..',
  '.orrrrrrro.',
  '.oreerreero',
  '.orrrRRrrro',
  '..orRRRRro.',
  '.oorrrrrroo',
  'orRrrrrrrRo',
  '..oRrrrRo..',
  '..orRoRro..',
  '...oRoRo...',
  '...oo.oo...',
];
const IMP_PAL = { o: '#2a0f0c', r: '#d9482b', R: '#8c2418', y: '#f2e1b0', e: '#ffe45c' };

// ---------------------------------------------------------------------------
// Weapon and relic icons (HUD slots and pedestals)
// ---------------------------------------------------------------------------

const ICON_PAL = {
  o: '#1a1626',
  t: '#8b5a2b',
  y: '#e3c16f',
  Y: '#b8923f',
  f: '#ff8a3d',
  F: '#ffd08a',
  s: '#cfd6e0',
  g: '#c9a24a',
  c: '#8ee3ff',
  w: '#ffffff',
  z: '#ffe066',
  n: '#6d6558',
  r: '#c9864a',
  R: '#8a5530',
  l: '#6fbf4a',
  b: '#9fb4c7',
  B: '#5f7488',
};

const ICONS: Record<string, string[]> = {
  broom: [
    '.......o.',
    '......oto',
    '.....oto.',
    '....oto..',
    '...oto...',
    '.oyyo....',
    'oyYyyo...',
    'oyyYo....',
    '.ooo.....',
  ],
  emberbrand: [
    '.......oo',
    '......oFo',
    '.....ofo.',
    '....ofo..',
    '.o.ofo...',
    '.ogfo....',
    '..og.....',
    '.oto.....',
    'oo.......',
  ],
  rimeshard: [
    '......owo',
    '.....ocwo',
    '.....occo',
    '....oto..',
    '...oto...',
    '..oto....',
    '.oto.....',
    'oto......',
    'oo.......',
  ],
  thunderpike: [
    '......ooo',
    '......ozo',
    '.....ozzo',
    '....otoo.',
    '...oto...',
    '..oto....',
    '.oto.....',
    'oto......',
    'oo.......',
  ],
  whetstone: [
    '.........',
    '...ooo...',
    '..obbbo..',
    '.obbwbbo.',
    '.obbbbBo.',
    '.oBbbBBo.',
    '..oBBBo..',
    '...ooo...',
    '.........',
  ],
  acorn: [
    '....o....',
    '...oRo...',
    '..oRRRo..',
    '.oRRRRRo.',
    '.orrrrro.',
    '.orrlrro.',
    '..orrro..',
    '...oro...',
    '....o....',
  ],
  herb: [
    '....o....',
    '...olo...',
    '.o.olo.o.',
    'olooloolo',
    '.ollllo..',
    '..olllo..',
    '...olo...',
    '....o....',
    '.........',
  ],
};

// ---------------------------------------------------------------------------
// Props (procedural)
// ---------------------------------------------------------------------------

function tree(seed: number): Sprite {
  const w = 22;
  const h = 34;
  return paintSprite(w, h, (ctx) => {
    // trunk
    ctx.fillStyle = '#3b2616';
    ctx.fillRect(9, 20, 4, 13);
    ctx.fillStyle = '#5b3c22';
    ctx.fillRect(10, 20, 2, 13);
    // canopy: overlapping blobs with a dark rim, mid tone, and highlight dither
    const blobs = [
      [11, 13, 9],
      [6, 17, 5.5],
      [16, 17, 5.5],
      [11, 7, 6.5],
    ];
    const layer = (r0: number, col: string, dx: number, dy: number, dither = false) => {
      ctx.fillStyle = col;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          for (const [bx, by, br] of blobs) {
            if ((x - bx - dx) ** 2 + (y - by - dy) ** 2 <= (br - r0) ** 2) {
              if (!dither || (x + y) % 2 === 0 || hash2(x, y, seed) > 0.6) ctx.fillRect(x, y, 1, 1);
              break;
            }
          }
        }
    };
    layer(0, '#12301c', 0, 0);
    layer(1, '#23522c', 0, 0);
    layer(2.5, '#347a3a', -1, -1);
    layer(4.5, '#5aa84d', -2, -2, true);
    // a few leaf flecks
    ctx.fillStyle = '#8fd46a';
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(4 + hash2(i, seed, 3) * 13);
      const y = Math.floor(3 + hash2(seed, i, 7) * 13);
      ctx.fillRect(x, y, 1, 1);
    }
  });
}

function rock(seed: number): Sprite {
  return paintSprite(16, 11, (ctx) => {
    const blob = (r: number, col: string, dx = 0, dy = 0) => {
      ctx.fillStyle = col;
      for (let y = 0; y < 11; y++)
        for (let x = 0; x < 16; x++) {
          const nx = (x - 8 - dx) / (7 - r);
          const ny = (y - 6 - dy) / (5 - r * 0.7);
          if (nx * nx + ny * ny <= 1 + (hash2(x, y, seed) - 0.5) * 0.25) ctx.fillRect(x, y, 1, 1);
        }
    };
    blob(0, '#23202a');
    blob(1, '#6b6a73');
    blob(2.2, '#8f8e96', -1, -1);
    blob(4, '#b3b2b8', -2, -2);
  });
}

function podium(): Sprite {
  return paintSprite(20, 30, (ctx) => {
    const r = (x: number, y: number, w: number, h: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };
    // base steps
    r(1, 24, 18, 5, '#1a1626');
    r(2, 24, 16, 4, '#8a8195');
    r(2, 27, 16, 1, '#5d566a');
    r(4, 20, 12, 5, '#1a1626');
    r(5, 20, 10, 4, '#a49bb0');
    // column
    r(6, 10, 8, 11, '#1a1626');
    r(7, 10, 6, 10, '#c3bacd');
    r(7, 10, 2, 10, '#ded7e6');
    r(11, 10, 2, 10, '#8f86a0');
    // gold band
    r(6, 14, 8, 2, '#c9a24a');
    // bowl
    r(3, 7, 14, 4, '#1a1626');
    r(4, 7, 12, 3, '#c9a24a');
    r(4, 7, 12, 1, '#f0d27a');
  });
}

function pedestal(): Sprite {
  return paintSprite(12, 12, (ctx) => {
    const r = (x: number, y: number, w: number, h: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };
    r(1, 8, 10, 4, '#1a1626');
    r(2, 8, 8, 3, '#7c7a86');
    r(3, 2, 6, 7, '#1a1626');
    r(4, 2, 4, 6, '#a3a1ad');
    r(4, 2, 1, 6, '#c9c7d1');
    r(2, 1, 8, 2, '#1a1626');
    r(3, 1, 6, 1, '#c9c7d1');
  });
}

function signpost(): Sprite {
  return paintSprite(16, 20, (ctx) => {
    const r = (x: number, y: number, w: number, h: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };
    r(7, 6, 3, 14, '#2a1a10');
    r(8, 6, 1, 14, '#6b4526');
    r(0, 2, 16, 7, '#2a1a10');
    r(1, 3, 14, 5, '#8b5a2b');
    r(1, 3, 14, 1, '#a8733d');
    r(3, 5, 9, 1, '#4a2f18');
  });
}

function debris(): Sprite {
  // a smashed table: the aftermath of the wizard's last stand
  return paintSprite(18, 10, (ctx) => {
    const r = (x: number, y: number, w: number, h: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };
    r(1, 3, 11, 4, '#1a1626');
    r(2, 3, 9, 3, '#7a4f2c');
    r(2, 3, 9, 1, '#9c6a3e');
    r(9, 1, 8, 3, '#1a1626');
    r(10, 1, 6, 2, '#7a4f2c');
    r(3, 6, 2, 4, '#4a2f18');
    r(13, 4, 2, 5, '#4a2f18');
    r(6, 8, 3, 1, '#e8dfc8');
    r(14, 8, 2, 1, '#e8dfc8');
  });
}

export interface Art {
  thistle: CharacterFrames;
  enemies: Record<string, { right: Sprite[]; left: Sprite[] }>;
  icons: Record<string, Sprite>;
  trees: Sprite[];
  rocks: Sprite[];
  podium: Sprite;
  pedestal: Sprite;
  signpost: Sprite;
  debris: Sprite;
}

export function buildArt(): Art {
  const pair = (a: string[], b: string[], pal: Record<string, string>) => ({
    right: [makeSprite(a, pal), makeSprite(b, pal)],
    left: [makeSprite(a, pal, true), makeSprite(b, pal, true)],
  });
  const icons: Record<string, Sprite> = {};
  for (const [id, rows] of Object.entries(ICONS)) icons[id] = makeSprite(rows, ICON_PAL);
  return {
    thistle: buildThistle(),
    enemies: {
      wisp: pair(WISP, WISP2, WISP_PAL),
      beetle: pair(BEETLE, BEETLE2, BEETLE_PAL),
      imp: pair(IMP, IMP2, IMP_PAL),
    },
    icons,
    trees: [tree(1), tree(2), tree(3)],
    rocks: [rock(1), rock(2)],
    podium: podium(),
    pedestal: pedestal(),
    signpost: signpost(),
    debris: debris(),
  };
}
