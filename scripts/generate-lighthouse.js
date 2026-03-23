#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const outputFile = path.resolve(
  __dirname,
  "../examples/lighthouse-35-immersive.boxel.json"
);

const palette = [
  { name: "rock-dark", color: "#4A5663", description: "海沿いの岩場の深い影" },
  { name: "rock-mid", color: "#667382", description: "岩場の中間色" },
  { name: "rock-light", color: "#8592A0", description: "岩の天面と波打ち際" },
  { name: "foundation-stone", color: "#8A7E70", description: "基壇と擁壁の石" },
  { name: "foundation-trim", color: "#B6AA99", description: "基壇の笠石と段差" },
  { name: "tower-wall", color: "#F0EBDD", description: "灯台主塔の白い塗り壁" },
  { name: "tower-shadow", color: "#D7D0C2", description: "塔の陰側と厚み表現" },
  { name: "trim-white", color: "#FBF8F0", description: "窓回りや帯の白い縁石" },
  { name: "stair-stone", color: "#BEB4A5", description: "螺旋階段と踊り場" },
  { name: "catwalk-metal", color: "#5B6670", description: "バルコニー床と手すり" },
  { name: "bronze", color: "#8A6A3F", description: "灯室の金物と装飾" },
  { name: "glass-bright", color: "#A9D8E8", description: "灯室の明るいガラス" },
  { name: "glass-deep", color: "#5F7D8B", description: "窓奥と反射の濃いガラス" },
  { name: "roof-red", color: "#91443A", description: "灯室屋根の赤い板金" },
  { name: "roof-dark", color: "#692D27", description: "屋根の影側と棟" },
  { name: "wood", color: "#8A6443", description: "付属舎の床と建具" },
  { name: "door-dark", color: "#5B3F28", description: "扉と窓枠の濃い木部" },
  { name: "beacon-gold", color: "#FFD36E", description: "灯火とフレネルレンズ" },
];

const blocks = new Map();

function key(x, y, z) {
  return `${x},${y},${z}`;
}

function setBlock(x, y, z, color) {
  blocks.set(key(x, y, z), { x, y, z, color });
}

function removeBlock(x, y, z) {
  blocks.delete(key(x, y, z));
}

function fillBox(x1, y1, z1, x2, y2, z2, color, opts = {}) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  const minZ = Math.min(z1, z2);
  const maxZ = Math.max(z1, z2);
  const hollow = opts.hollow ?? false;
  const noCap = opts.noCap ?? false;

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        if (hollow) {
          const onX = x === minX || x === maxX;
          const onY = y === minY || y === maxY;
          const onZ = z === minZ || z === maxZ;
          if (!(onX || onY || onZ)) {
            continue;
          }
          if (noCap && onY) {
            continue;
          }
        }
        setBlock(x, y, z, color);
      }
    }
  }
}

function forEachCircle(cx, cz, radius, callback) {
  const min = Math.floor(radius) + 1;
  for (let x = cx - min; x <= cx + min; x += 1) {
    for (let z = cz - min; z <= cz + min; z += 1) {
      const dx = x - cx;
      const dz = z - cz;
      const dist = Math.hypot(dx, dz);
      callback(x, z, dist);
    }
  }
}

function disc(cx, cz, radius, y, color, innerRadius = -Infinity) {
  forEachCircle(cx, cz, radius + 0.2, (x, z, dist) => {
    if (dist <= radius + 0.25 && dist >= innerRadius - 0.25) {
      setBlock(x, y, z, color);
    }
  });
}

function ring(cx, cz, outerRadius, innerRadius, y, color) {
  forEachCircle(cx, cz, outerRadius + 0.4, (x, z, dist) => {
    if (dist <= outerRadius + 0.25 && dist >= innerRadius - 0.35) {
      setBlock(x, y, z, color);
    }
  });
}

function cylinder(cx, cz, radius, y1, y2, color, opts = {}) {
  const hollow = opts.hollow ?? false;
  const innerRadius = opts.innerRadius ?? radius - 1;
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
    if (hollow) {
      ring(cx, cz, radius, innerRadius, y, color);
    } else {
      disc(cx, cz, radius, y, color);
    }
  }
}

function sphereCap(cx, cy, cz, radius, color, opts = {}) {
  const topHalf = opts.topHalf ?? false;
  const min = Math.floor(radius) + 1;
  for (let x = cx - min; x <= cx + min; x += 1) {
    for (let y = cy - min; y <= cy + min; y += 1) {
      for (let z = cz - min; z <= cz + min; z += 1) {
        const dx = x - cx;
        const dy = y - cy;
        const dz = z - cz;
        if (topHalf && y < cy) {
          continue;
        }
        if (Math.hypot(dx, dy, dz) <= radius + 0.2) {
          setBlock(x, y, z, color);
        }
      }
    }
  }
}

function clearBox(x1, y1, z1, x2, y2, z2) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  const minZ = Math.min(z1, z2);
  const maxZ = Math.max(z1, z2);

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        removeBlock(x, y, z);
      }
    }
  }
}

function paintIfPresent(points, color) {
  for (const [x, y, z] of points) {
    if (blocks.has(key(x, y, z))) {
      setBlock(x, y, z, color);
    }
  }
}

function addWindowColumn(x, z, y1, y2, frameColor, glassColor) {
  for (let y = y1; y <= y2; y += 1) {
    setBlock(x, y, z, glassColor);
    for (const [fx, fz] of [
      [x + Math.sign(x || 1), z],
      [x, z + Math.sign(z || 1)],
    ]) {
      if (blocks.has(key(fx, y, fz))) {
        setBlock(fx, y, fz, frameColor);
      }
    }
  }
}

function addRockLayer(y, radius, color, offsets) {
  for (const [cx, cz, r] of offsets) {
    disc(cx, cz, radius + r, y, color);
  }
}

function buildRockBase() {
  addRockLayer(0, 6, "#4A5663", [
    [0, 0, 4],
    [-6, 4, 1],
    [7, 3, 0],
    [-4, -8, 2],
    [5, -9, 1],
    [0, 10, 1],
  ]);
  addRockLayer(1, 5, "#667382", [
    [0, 0, 3],
    [-5, 4, 0],
    [6, 2, 0],
    [-2, -7, 1],
    [3, -8, 0],
    [1, 9, 0],
  ]);
  addRockLayer(2, 4, "#8592A0", [
    [0, 0, 2],
    [-4, 3, 0],
    [4, 1, 0],
    [-1, -6, 0],
    [2, -7, 0],
  ]);
  ring(0, 0, 10, 8.7, 3, "#B6AA99");
}

function buildFoundation() {
  for (let y = 3; y <= 4; y += 1) {
    disc(0, 0, 9, y, "#8A7E70");
  }
  ring(0, 0, 10, 8.6, 4, "#B6AA99");
  ring(0, 0, 8.2, 7.4, 5, "#B6AA99");
  disc(0, 0, 7, 5, "#8A7E70");
  fillBox(7, 3, -5, 14, 4, 5, "#8A7E70");
  ring(0, 0, 6.8, 5.9, 0, "#B6AA99");
  fillBox(8, 3, -4, 13, 3, 4, "#B6AA99");
  fillBox(8, 2, -3, 12, 2, 3, "#B6AA99");
  fillBox(9, 1, -2, 11, 1, 2, "#B6AA99");
}

function buildTower() {
  disc(0, 0, 5, 5, "#8A7E70");
  cylinder(0, 0, 6, 6, 13, "#F0EBDD", { hollow: true, innerRadius: 5 });
  ring(0, 0, 7, 6.05, 9, "#FBF8F0");
  ring(0, 0, 7, 6.05, 13, "#FBF8F0");
  cylinder(0, 0, 5, 14, 25, "#F0EBDD", { hollow: true, innerRadius: 4 });
  ring(0, 0, 6, 5.05, 18, "#FBF8F0");
  ring(0, 0, 6, 5.05, 22, "#FBF8F0");
  ring(0, 0, 6.6, 4.8, 25, "#B6AA99");

  for (let y = 6; y <= 25; y += 1) {
    for (const [x, z] of [
      [-6, 0],
      [-5, 2],
      [-5, 3],
      [-4, 4],
      [-3, 5],
      [-2, 5],
      [0, 6],
      [2, 5],
      [3, 5],
    ]) {
      if (blocks.has(key(x, y, z))) {
        setBlock(x, y, z, "#D7D0C2");
      }
    }
  }

  clearBox(-2, 6, -6, 2, 8, -4);
  fillBox(-1, 6, -5, 1, 8, -5, "#5B3F28");
  clearBox(-1, 7, -5, 1, 8, -5);
  fillBox(-2, 6, -7, 2, 6, -7, "#8A7E70");
  fillBox(-1, 7, -7, 1, 8, -7, "#8A6A3F");
  fillBox(-2, 9, -6, 2, 9, -6, "#FBF8F0");
}

function buildAnnex() {
  fillBox(7, 5, -5, 14, 10, 5, "#8A6443");
  fillBox(7, 6, -5, 14, 11, 5, "#F0EBDD", { hollow: true });
  clearBox(8, 6, -4, 13, 10, 4);

  fillBox(9, 6, -5, 11, 9, -5, "#5B3F28");
  clearBox(10, 7, -5, 10, 8, -5);
  fillBox(9, 6, -6, 11, 6, -6, "#8A7E70");

  clearBox(7, 6, -1, 7, 8, 1);
  clearBox(6, 6, -1, 6, 8, 1);

  for (const x of [9, 12]) {
    fillBox(x, 7, 5, x, 8, 5, "#5F7D8B");
    fillBox(x, 7, -5, x, 8, -5, "#5F7D8B");
  }
  for (const z of [-2, 2]) {
    fillBox(14, 7, z, 14, 8, z, "#5F7D8B");
  }

  for (let layer = 0; layer < 3; layer += 1) {
    fillBox(6 + layer, 11 + layer, -6 + layer, 15 - layer, 11 + layer, 6 - layer, layer === 2 ? "#692D27" : "#91443A");
  }
  fillBox(10, 14, -1, 11, 15, 1, "#692D27");
  fillBox(10, 16, 0, 10, 17, 0, "#8A6A3F");
  fillBox(9, 9, -6, 11, 9, -6, "#8A6A3F");
}

function buildInterior() {
  disc(0, 0, 4, 6, "#BEB4A5");
  disc(0, 0, 4, 14, "#BEB4A5");
  disc(0, 0, 4, 22, "#BEB4A5");
  clearBox(-2, 6, -2, 2, 6, 2);
  clearBox(-2, 14, -2, 2, 14, 2);
  clearBox(-2, 22, -2, 2, 22, 2);

  fillBox(8, 5, -4, 13, 5, 4, "#8A6443");
  fillBox(9, 6, -2, 12, 6, 2, "#8A6443");
  fillBox(13, 6, -2, 14, 8, 2, "#8A6A3F");
  fillBox(13, 9, -1, 14, 9, 1, "#8A6A3F");

  const stairPath = [
    [0, -3],
    [1, -3],
    [2, -2],
    [3, -1],
    [3, 0],
    [3, 1],
    [2, 2],
    [1, 3],
    [0, 3],
    [-1, 3],
    [-2, 2],
    [-3, 1],
    [-3, 0],
    [-3, -1],
    [-2, -2],
    [-1, -3],
  ];

  for (let y = 6; y <= 25; y += 1) {
    const [x, z] = stairPath[(y - 6) % stairPath.length];
    setBlock(x, y, z, "#BEB4A5");
    if ((y - 6) % 4 === 0) {
      const nx = x === 0 ? 0 : x + (x > 0 ? -1 : 1);
      const nz = z === 0 ? 0 : z + (z > 0 ? -1 : 1);
      setBlock(nx, y, nz, "#BEB4A5");
    }
  }

  for (const y of [10, 18]) {
    fillBox(-1, y, 2, 1, y, 4, "#BEB4A5");
  }

  fillBox(-1, 26, -4, 1, 26, -1, "#5B6670");
  clearBox(-1, 27, -3, 1, 27, -1);
  setBlock(0, 27, -3, "#BEB4A5");
  setBlock(0, 27, -2, "#BEB4A5");
}

function buildWindows() {
  addWindowColumn(0, 6, 8, 9, "#FBF8F0", "#5F7D8B");
  addWindowColumn(-6, 0, 9, 10, "#FBF8F0", "#5F7D8B");
  addWindowColumn(5, 0, 16, 18, "#FBF8F0", "#A9D8E8");
  addWindowColumn(0, 5, 19, 21, "#FBF8F0", "#A9D8E8");
  addWindowColumn(-5, 0, 22, 24, "#FBF8F0", "#A9D8E8");
}

function buildLantern() {
  ring(0, 0, 7.5, 5.1, 26, "#5B6670");
  ring(0, 0, 8.2, 7.2, 27, "#5B6670");
  ring(0, 0, 8.2, 7.2, 28, "#5B6670");
  for (const [x, z] of [
    [0, -8],
    [3, -7],
    [6, -5],
    [8, 0],
    [6, 5],
    [3, 7],
    [0, 8],
    [-3, 7],
    [-6, 5],
    [-8, 0],
    [-6, -5],
    [-3, -7],
  ]) {
    fillBox(x, 25, z, x, 26, z, "#8A6A3F");
  }

  disc(0, 0, 3.8, 27, "#5B6670");
  cylinder(0, 0, 4, 28, 31, "#A9D8E8", { hollow: true, innerRadius: 3 });

  const bronzePosts = [
    [0, -4],
    [3, -3],
    [4, 0],
    [3, 3],
    [0, 4],
    [-3, 3],
    [-4, 0],
    [-3, -3],
  ];
  for (const [x, z] of bronzePosts) {
    fillBox(x, 28, z, x, 31, z, "#8A6A3F");
  }

  clearBox(-1, 28, -4, 1, 29, -4);
  fillBox(-1, 28, -4, 1, 29, -4, "#A9D8E8");
  clearBox(0, 28, -4, 0, 29, -4);

  cylinder(0, 0, 1, 28, 31, "#FFD36E", { hollow: false });
  fillBox(-2, 29, 0, 2, 29, 0, "#8A6A3F");
  fillBox(0, 29, -2, 0, 29, 2, "#8A6A3F");
  sphereCap(0, 30, 0, 2, "#FFD36E", { topHalf: true });

  disc(0, 0, 4.2, 32, "#692D27");
  disc(0, 0, 3.2, 33, "#91443A");
  disc(0, 0, 2.2, 34, "#91443A");
  disc(0, 0, 1.2, 35, "#692D27");
  setBlock(0, 36, 0, "#FFD36E");
}

function buildExteriorDetails() {
  for (const y of [7, 11, 15, 19, 23]) {
    for (const [x, z] of [
      [6, 0],
      [0, 6],
      [-6, 0],
      [0, -6],
    ]) {
      if (blocks.has(key(x, y, z))) {
        setBlock(x, y, z, "#FBF8F0");
      }
    }
  }

  fillBox(-3, 3, -13, 3, 3, -8, "#8A7E70");
  fillBox(-2, 4, -12, 2, 4, -8, "#B6AA99");
  fillBox(-1, 5, -10, 1, 5, -8, "#B6AA99");
  fillBox(-3, 4, -14, 3, 4, -14, "#5B6670");
  fillBox(-2, 5, -14, -2, 6, -14, "#5B6670");
  fillBox(2, 5, -14, 2, 6, -14, "#5B6670");
  fillBox(0, 6, -14, 0, 6, -14, "#FFD36E");

  for (const [x, z] of [
    [11, -6],
    [12, -6],
    [13, -5],
    [14, -3],
    [14, 3],
    [13, 5],
    [12, 6],
    [11, 6],
  ]) {
    fillBox(x, 5, z, x, 6, z, "#5B6670");
  }
}

function computeBounds() {
  const structure = Array.from(blocks.values());
  const xs = structure.map((block) => block.x);
  const ys = structure.map((block) => block.y);
  const zs = structure.map((block) => block.z);

  return {
    min: {
      x: Math.min(...xs),
      y: Math.min(...ys),
      z: Math.min(...zs),
    },
    max: {
      x: Math.max(...xs),
      y: Math.max(...ys),
      z: Math.max(...zs),
    },
  };
}

buildRockBase();
buildFoundation();
buildTower();
buildAnnex();
buildInterior();
buildWindows();
buildLantern();
buildExteriorDetails();

paintIfPresent(
  [
    [0, 3, -8],
    [0, 4, -8],
    [10, 6, -5],
    [10, 7, -5],
    [10, 8, -5],
    [10, 14, 0],
    [10, 15, 0],
    [10, 16, 0],
  ],
  "#5B3F28"
);

const structure = Array.from(blocks.values()).sort((a, b) =>
  a.y - b.y || a.x - b.x || a.z - b.z
);
const blueprint = {
  version: "1.0",
  name: "lighthouse-35-immersive",
  description: "35m級の沿岸灯台。付属舎から入って螺旋階段で灯室とバルコニーへ上がれる。",
  palette,
  bounds: computeBounds(),
  structure,
  scaffold: [],
};

fs.writeFileSync(outputFile, `${JSON.stringify(blueprint, null, 2)}\n`);
console.log(`Wrote ${outputFile} with ${structure.length} blocks.`);
