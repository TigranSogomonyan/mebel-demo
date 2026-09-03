// Заглушки каталога в виде эскизов мастерской: ортогональная проекция,
// размерные выноски, штамп листа. Запуск: node tools/gen-images.mjs
// Реальные фото кладите в img/catalog/ и меняйте пути в js/catalog-data.js
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'img/catalog');
mkdirSync(OUT, { recursive: true });

const W = 1200, H = 900, FOOT = 62;   // FOOT — поле основной надписи под чертежом
const INK = '#17150F';
const PAPER = '#EFEDE6';
const MONO = "'JetBrains Mono','IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

// приглушённые тона древесины и эмали
const TONES = [
  { a: '#C7BCA6', b: '#AC9F86', c: '#8E8471' },
  { a: '#BFB6A4', b: '#A2977F', c: '#7E7460' },
  { a: '#B4B7AB', b: '#979B8B', c: '#74786A' },
  { a: '#C6BEB4', b: '#A79C90', c: '#827669' },
  { a: '#BDAE9A', b: '#9E8C74', c: '#776853' },
];

/* ——— примитивы чертежа ——— */
const s = (o = {}) => `fill="${o.fill || 'none'}" stroke="${o.stroke || INK}" stroke-width="${o.sw || 2}"${o.op ? ` opacity="${o.op}"` : ''}`;
const box = (x, y, w, h, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${s(o)}/>`;
const ln = (x1, y1, x2, y2, o = {}) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.stroke || INK}" stroke-width="${o.sw || 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${o.op ? ` opacity="${o.op}"` : ''}/>`;
const cir = (cx, cy, r, o = {}) => `<circle cx="${cx}" cy="${cy}" r="${r}" ${s(o)}/>`;
const txt = (x, y, t, o = {}) =>
  `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${o.size || 20}" fill="${o.fill || INK}" opacity="${o.op ?? .72}" letter-spacing="${o.ls ?? 1}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}>${t}</text>`;

// ручка-профиль
const grip = (x, y, w) => ln(x, y, x + w, y, { sw: 4, op: .55 });

// размерная линия с архитектурными засечками
function dimH(x1, x2, y, label) {
  const t = 7;
  return ln(x1, y, x2, y, { sw: 1.2, op: .55 }) +
    ln(x1 - t, y + t, x1 + t, y - t, { sw: 1.2, op: .55 }) +
    ln(x2 - t, y + t, x2 + t, y - t, { sw: 1.2, op: .55 }) +
    `<rect x="${(x1 + x2) / 2 - 46}" y="${y - 15}" width="92" height="30" fill="${PAPER}"/>` +
    txt((x1 + x2) / 2, y + 7, label, { size: 19, anchor: 'middle' });
}
function dimV(y1, y2, x, label) {
  const t = 7;
  return ln(x, y1, x, y2, { sw: 1.2, op: .55 }) +
    ln(x - t, y1 + t, x + t, y1 - t, { sw: 1.2, op: .55 }) +
    ln(x - t, y2 + t, x + t, y2 - t, { sw: 1.2, op: .55 }) +
    `<g transform="translate(${x} ${(y1 + y2) / 2}) rotate(-90)"><rect x="-46" y="-15" width="92" height="30" fill="${PAPER}"/>${txt(0, 7, label, { size: 19, anchor: 'middle' })}</g>`;
}

/* ——— сцены: ортогональный фасад предмета ——— */
const SCENES = {
  kitchen: (t) => ({
    art:
      box(120, 250, 470, 200, { fill: t.a }) + box(600, 250, 200, 200, { fill: t.b }) +
      box(810, 250, 270, 200, { fill: t.a }) +
      ln(255, 250, 255, 450) + ln(400, 250, 400, 450) + ln(945, 250, 945, 450) +
      grip(160, 440, 80) + grip(300, 440, 80) + grip(440, 440, 80) + grip(850, 440, 80) + grip(990, 440, 80) +
      `<path d="M600 250 h200 v40 l-45 110 h-110 l-45 -110 z" fill="${t.c}" opacity=".55" stroke="${INK}" stroke-width="2"/>` +
      box(120, 600, 960, 22, { fill: t.c }) +
      box(120, 622, 960, 210, { fill: t.a }) +
      ln(280, 622, 280, 832) + ln(440, 622, 440, 832) + ln(600, 622, 600, 832) + ln(760, 622, 760, 832) + ln(920, 622, 920, 832) +
      ln(120, 692, 440, 692) + ln(120, 762, 440, 762) +
      grip(160, 682, 80) + grip(320, 682, 80) + grip(160, 752, 80) + grip(320, 752, 80) +
      grip(480, 682, 80) + grip(640, 682, 80) + grip(800, 682, 80) + grip(960, 682, 80) +
      cir(520, 560, 26, { fill: 'none', sw: 2 }) + ln(520, 512, 520, 545, { sw: 3 }) + ln(520, 512, 560, 512, { sw: 3 }),
    dims: dimH(120, 1080, 868, '3600') + dimV(250, 832, 78, '2400') + dimH(600, 800, 218, '900'),
  }),

  wardrobe: (t) => ({
    art:
      box(230, 120, 740, 712, { fill: t.a }) +
      ln(476, 120, 476, 832) + ln(723, 120, 723, 832) +
      box(496, 150, 207, 652, { fill: t.c, op: .5 }) +
      ln(496, 150, 703, 802, { sw: 1, op: .35 }) + ln(703, 150, 496, 802, { sw: 1, op: .35 }) +
      ln(300, 200, 300, 760, { sw: 4, op: .5 }) + ln(900, 200, 900, 760, { sw: 4, op: .5 }) +
      ln(230, 300, 476, 300, { dash: '8 7', op: .5 }) + ln(230, 470, 476, 470, { dash: '8 7', op: .5 }) +
      ln(230, 620, 476, 620, { dash: '8 7', op: .5 }) +
      ln(723, 380, 970, 380, { dash: '8 7', op: .5 }) + ln(723, 560, 970, 560, { dash: '8 7', op: .5 }) +
      box(230, 832, 740, 24, { fill: t.c }),
    dims: dimH(230, 970, 892, '2700') + dimV(120, 856, 178, '2650'),
  }),

  living: (t) => ({
    art:
      box(150, 520, 900, 190, { fill: t.a }) +
      ln(375, 520, 375, 710) + ln(600, 520, 600, 710) + ln(825, 520, 825, 710) +
      grip(230, 700, 66) + grip(455, 700, 66) + grip(680, 700, 66) + grip(905, 700, 66) +
      box(150, 710, 900, 16, { fill: t.c }) +
      box(360, 150, 480, 300, { fill: t.c, op: .45 }) +
      box(150, 220, 150, 18, { fill: t.b }) + box(900, 300, 150, 18, { fill: t.b }) +
      box(150, 360, 150, 18, { fill: t.b }) + box(900, 430, 150, 18, { fill: t.b }) +
      cir(200, 195, 20, { fill: t.b }) + box(950, 250, 34, 50, { fill: t.b }),
    dims: dimH(150, 1050, 780, '3800') + dimV(150, 726, 100, '2300'),
  }),

  bedroom: (t) => ({
    art:
      box(330, 190, 540, 290, { fill: t.b }) +
      ln(420, 190, 420, 480, { op: .4 }) + ln(510, 190, 510, 480, { op: .4 }) +
      ln(600, 190, 600, 480, { op: .4 }) + ln(690, 190, 690, 480, { op: .4 }) + ln(780, 190, 780, 480, { op: .4 }) +
      box(300, 480, 600, 250, { fill: t.a }) +
      box(330, 440, 250, 90, { fill: t.c, op: .5 }) + box(620, 440, 250, 90, { fill: t.c, op: .5 }) +
      ln(300, 560, 900, 560) +
      box(150, 560, 130, 170, { fill: t.a }) + ln(150, 620, 280, 620) + grip(185, 595, 60) + grip(185, 675, 60) +
      box(920, 560, 130, 170, { fill: t.a }) + ln(920, 620, 1050, 620) + grip(955, 595, 60) + grip(955, 675, 60) +
      box(300, 730, 600, 18, { fill: t.c }),
    dims: dimH(300, 900, 800, '1600') + dimV(190, 748, 250, '1100'),
  }),

  kids: (t) => ({
    art:
      box(220, 150, 620, 60, { fill: t.b }) +
      box(220, 210, 620, 170, { fill: t.a, op: .5 }) +
      ln(320, 210, 320, 380, { op: .5 }) + ln(430, 210, 430, 380, { op: .5 }) + ln(540, 210, 540, 380, { op: .5 }) + ln(650, 210, 650, 380, { op: .5 }) + ln(740, 210, 740, 380, { op: .5 }) +
      box(220, 380, 620, 38, { fill: t.c }) +
      box(240, 418, 56, 400, { fill: t.b }) + box(764, 418, 56, 400, { fill: t.b }) +
      box(300, 600, 460, 38, { fill: t.a }) +
      ln(300, 418, 300, 600, { sw: 3 }) + ln(760, 418, 760, 600, { sw: 3 }) +
      box(340, 450, 130, 130, { fill: t.c, op: .5 }) +
      box(860, 520, 150, 300, { fill: t.a }) + ln(860, 620, 1010, 620) + ln(860, 720, 1010, 720) +
      grip(900, 596, 70) + grip(900, 696, 70) + grip(900, 796, 70),
    dims: dimH(220, 840, 860, '2000') + dimV(150, 818, 170, '1800'),
  }),

  hallway: (t) => ({
    art:
      box(190, 140, 300, 420, { fill: t.c, op: .45 }) +
      ln(190, 140, 490, 560, { sw: 1, op: .3 }) + ln(490, 140, 190, 560, { sw: 1, op: .3 }) +
      box(540, 130, 460, 300, { fill: t.a }) +
      ln(580, 180, 580, 250, { sw: 4, op: .6 }) + ln(690, 180, 690, 250, { sw: 4, op: .6 }) +
      ln(800, 180, 800, 250, { sw: 4, op: .6 }) + ln(910, 180, 910, 250, { sw: 4, op: .6 }) +
      box(540, 560, 460, 180, { fill: t.a }) + ln(770, 560, 770, 740) + grip(600, 730, 90) + grip(830, 730, 90) +
      box(190, 620, 300, 120, { fill: t.b }) + grip(240, 690, 200) +
      box(190, 740, 810, 18, { fill: t.c }),
    dims: dimH(190, 1000, 812, '3000') + dimV(130, 758, 140, '2600'),
  }),

  sofa: (t) => ({
    art:
      box(150, 340, 900, 200, { fill: t.a }) +
      box(185, 255, 830, 130, { fill: t.b }) +
      ln(462, 255, 462, 385) + ln(738, 255, 738, 385) +
      ln(185, 340, 1015, 340, { op: .5 }) +
      ln(430, 340, 430, 540) + ln(770, 340, 770, 540) +
      box(120, 300, 70, 240, { fill: t.c, op: .6 }) + box(1010, 300, 70, 240, { fill: t.c, op: .6 }) +
      ln(200, 540, 200, 610, { sw: 5 }) + ln(1000, 540, 1000, 610, { sw: 5 }) +
      ln(150, 610, 1050, 610, { sw: 1, op: .35, dash: '10 8' }),
    dims: dimH(120, 1080, 700, '2600') + dimV(255, 610, 70, '850'),
  }),

  office: (t) => ({
    art:
      box(160, 430, 880, 30, { fill: t.c }) +
      box(190, 460, 220, 300, { fill: t.a }) + ln(190, 560, 410, 560) + ln(190, 660, 410, 660) +
      grip(230, 535, 90) + grip(230, 635, 90) + grip(230, 735, 90) +
      ln(980, 460, 980, 790, { sw: 6 }) + ln(930, 790, 1030, 790, { sw: 6 }) +
      box(560, 140, 440, 240, { fill: t.a }) +
      ln(560, 220, 1000, 220) + ln(560, 300, 1000, 300) + ln(780, 140, 780, 380, { op: .5 }) +
      box(600, 160, 60, 40, { fill: t.b }) + box(820, 240, 90, 40, { fill: t.b }) +
      box(250, 300, 200, 130, { fill: t.b, op: .6 }) + ln(250, 365, 450, 365, { op: .4 }),
    dims: dimH(160, 1040, 830, '1800') + dimV(430, 790, 110, '750'),
  }),
};


/* ——— вариации: у каждой позиции в категории своя компоновка ——— */
SCENES['kitchen-island'] = (t) => ({
  art:
    box(120, 230, 430, 190, { fill: t.a }) +
    ln(263, 230, 263, 420) + ln(406, 230, 406, 420) +
    grip(160, 410, 70) + grip(303, 410, 70) + grip(446, 410, 70) +
    box(620, 150, 200, 380, { fill: t.b }) + ln(620, 300, 820, 300) + grip(660, 290, 120) +
    box(840, 150, 200, 380, { fill: t.b }) + ln(840, 330, 1040, 330) + grip(880, 320, 120) +
    box(120, 530, 430, 20, { fill: t.c }) + box(120, 550, 430, 170, { fill: t.a }) +
    ln(263, 550, 263, 720) + ln(406, 550, 406, 720) + grip(160, 610, 70) + grip(303, 610, 70) + grip(446, 610, 70) +
    box(620, 640, 420, 22, { fill: t.c }) + box(640, 662, 380, 130, { fill: t.a }) +
    ln(766, 662, 766, 792) + ln(892, 662, 892, 792) + grip(680, 720, 60) + grip(806, 720, 60) + grip(932, 720, 60) +
    cir(300, 500, 22, { sw: 2 }),
  dims: dimH(620, 1040, 600, '1800') + dimV(150, 720, 78, '2400'),
});

SCENES['kitchen-corner'] = (t) => ({
  art:
    box(150, 260, 340, 180, { fill: t.a }) + ln(320, 260, 320, 440) + grip(190, 430, 90) + grip(360, 430, 90) +
    box(510, 200, 120, 240, { fill: t.b }) +
    box(150, 560, 480, 20, { fill: t.c }) + box(150, 580, 480, 200, { fill: t.a }) +
    ln(310, 580, 310, 780) + ln(470, 580, 470, 780) +
    ln(150, 650, 310, 650) + grip(190, 640, 80) + grip(190, 720, 80) + grip(350, 640, 80) + grip(510, 640, 80) +
    box(700, 560, 20, 220, { fill: t.c }) +
    box(700, 200, 260, 580, { fill: t.b }) + ln(700, 440, 960, 440) + ln(700, 620, 960, 620) +
    grip(760, 430, 140) + grip(760, 610, 140) +
    cir(250, 520, 22, { sw: 2 }),
  dims: dimH(150, 630, 830, '2400') + dimV(200, 780, 100, '2100'),
});

SCENES['wardrobe-open'] = (t) => ({
  art:
    ln(200, 130, 200, 830, { sw: 3 }) + ln(1000, 130, 1000, 830, { sw: 3 }) +
    ln(200, 130, 1000, 130, { sw: 3 }) + ln(200, 830, 1000, 830, { sw: 3 }) +
    ln(466, 130, 466, 830, { sw: 2 }) + ln(733, 130, 733, 830, { sw: 2 }) +
    ln(200, 250, 466, 250, { sw: 3 }) + ln(230, 250, 230, 480, { dash: '6 9', op: .6 }) + ln(320, 250, 320, 480, { dash: '6 9', op: .6 }) + ln(410, 250, 410, 480, { dash: '6 9', op: .6 }) +
    ln(200, 500, 466, 500, { sw: 3 }) + ln(230, 500, 230, 640, { dash: '6 9', op: .6 }) + ln(330, 500, 330, 640, { dash: '6 9', op: .6 }) +
    box(210, 660, 246, 70, { fill: t.a }) + box(210, 740, 246, 70, { fill: t.a }) + grip(280, 700, 100) + grip(280, 780, 100) +
    ln(466, 320, 733, 320) + ln(466, 420, 733, 420) + ln(466, 520, 733, 520) + ln(466, 620, 733, 620) + ln(466, 720, 733, 720) +
    ln(733, 220, 1000, 220, { sw: 3 }) + ln(760, 220, 760, 560, { dash: '6 9', op: .6 }) + ln(870, 220, 870, 560, { dash: '6 9', op: .6 }) +
    box(745, 600, 240, 100, { fill: t.b }) + box(745, 710, 240, 100, { fill: t.b }) + grip(810, 650, 110) + grip(810, 760, 110),
  dims: dimH(200, 1000, 880, '3200') + dimV(130, 830, 150, '2700'),
});

SCENES['living-slim'] = (t) => ({
  art:
    box(180, 420, 840, 120, { fill: t.a }) +
    ln(460, 420, 460, 540) + ln(740, 420, 740, 540) +
    grip(250, 530, 120) + grip(530, 530, 120) + grip(810, 530, 120) +
    ln(180, 480, 1020, 480, { op: .35, dash: '10 8' }) +
    box(400, 180, 400, 200, { fill: t.c, op: .4 }) +
    ln(600, 380, 600, 420, { sw: 2, dash: '6 6' }) +
    ln(180, 620, 1020, 620, { sw: 1, op: .3, dash: '12 9' }),
  dims: dimH(180, 1020, 690, '2100') + dimV(420, 540, 120, '380'),
});

SCENES['bedroom-float'] = (t) => ({
  art:
    box(340, 200, 520, 250, { fill: t.b }) +
    ln(400, 210, 400, 440, { op: .45 }) + ln(460, 210, 460, 440, { op: .45 }) + ln(520, 210, 520, 440, { op: .45 }) +
    ln(580, 210, 580, 440, { op: .45 }) + ln(640, 210, 640, 440, { op: .45 }) + ln(700, 210, 700, 440, { op: .45 }) + ln(760, 210, 760, 440, { op: .45 }) + ln(820, 210, 820, 440, { op: .45 }) +
    box(260, 450, 680, 210, { fill: t.a }) +
    box(320, 660, 560, 40, { fill: t.c, op: .5 }) +
    ln(260, 706, 940, 706, { sw: 3, op: .55 }) +
    ln(300, 730, 900, 730, { sw: 1, op: .3, dash: '14 10' }) +
    box(330, 415, 240, 70, { fill: t.c, op: .45 }) + box(630, 415, 240, 70, { fill: t.c, op: .45 }),
  dims: dimH(260, 940, 800, '1800') + dimV(200, 706, 200, '1000'),
});

SCENES['kids-loft'] = (t) => ({
  art:
    box(230, 170, 640, 44, { fill: t.b }) +
    ln(230, 214, 870, 214) +
    ln(260, 214, 260, 300, { sw: 3 }) + ln(340, 214, 340, 300, { sw: 3 }) + ln(420, 214, 420, 300, { sw: 3 }) +
    ln(500, 214, 500, 300, { sw: 3 }) + ln(580, 214, 580, 300, { sw: 3 }) + ln(660, 214, 660, 300, { sw: 3 }) + ln(740, 214, 740, 300, { sw: 3 }) + ln(820, 214, 820, 300, { sw: 3 }) +
    box(230, 300, 640, 26, { fill: t.c }) +
    ln(250, 326, 250, 820, { sw: 6 }) + ln(850, 326, 850, 820, { sw: 6 }) +
    box(300, 560, 470, 24, { fill: t.a }) +
    box(320, 584, 140, 230, { fill: t.a }) + ln(320, 660, 460, 660) + ln(320, 736, 460, 736) + grip(355, 640, 70) + grip(355, 716, 70) + grip(355, 792, 70) +
    ln(880, 340, 1010, 340, { sw: 4 }) + ln(880, 440, 1010, 440, { sw: 4 }) + ln(880, 540, 1010, 540, { sw: 4 }) + ln(880, 640, 1010, 640, { sw: 4 }) +
    ln(1010, 326, 1010, 820, { sw: 6 }),
  dims: dimH(230, 870, 870, '2000') + dimV(170, 820, 180, '1800'),
});

SCENES['hallway-slim'] = (t) => ({
  art:
    box(360, 150, 480, 300, { fill: t.a }) + ln(600, 150, 600, 450) +
    grip(420, 440, 120) + grip(660, 440, 120) +
    ln(400, 500, 400, 570, { sw: 5 }) + ln(500, 500, 500, 570, { sw: 5 }) +
    ln(600, 500, 600, 570, { sw: 5 }) + ln(700, 500, 700, 570, { sw: 5 }) + ln(800, 500, 800, 570, { sw: 5 }) +
    ln(360, 500, 840, 500, { sw: 3 }) +
    box(360, 640, 480, 120, { fill: t.b }) +
    `<path d="M360 640 h480 v40 l-90 80 h-390 z" fill="${t.c}" opacity=".4" stroke="${INK}" stroke-width="2"/>` +
    grip(420, 700, 120) + grip(660, 700, 120),
  dims: dimH(360, 840, 830, '1400') + dimV(150, 760, 300, '2200'),
});

SCENES['armchair'] = (t) => ({
  art:
    box(400, 330, 400, 200, { fill: t.a }) +
    box(430, 240, 340, 110, { fill: t.b }) +
    box(370, 300, 60, 210, { fill: t.c, op: .6 }) + box(770, 300, 60, 210, { fill: t.c, op: .6 }) +
    ln(430, 530, 430, 610, { sw: 5 }) + ln(770, 530, 770, 610, { sw: 5 }) +
    ln(400, 400, 800, 400, { op: .4 }) +
    box(180, 560, 190, 130, { fill: t.a }) + ln(180, 620, 370, 620, { op: .4 }) +
    ln(210, 690, 210, 740, { sw: 4 }) + ln(340, 690, 340, 740, { sw: 4 }) +
    ln(150, 780, 1050, 780, { sw: 1, op: .3, dash: '12 9' }),
  dims: dimH(370, 830, 700, '820') + dimV(240, 610, 320, '760'),
});

SCENES['office-desk'] = (t) => ({
  art:
    box(280, 380, 640, 30, { fill: t.c }) +
    ln(340, 410, 340, 760, { sw: 7 }) + ln(860, 410, 860, 760, { sw: 7 }) +
    ln(300, 760, 380, 760, { sw: 7 }) + ln(820, 760, 900, 760, { sw: 7 }) +
    ln(340, 500, 860, 500, { sw: 5 }) +
    box(360, 420, 200, 60, { fill: t.a, op: .6 }) +
    box(480, 240, 280, 140, { fill: t.b }) + ln(600, 380, 600, 400, { sw: 3 }) + ln(540, 400, 660, 400, { sw: 3 }) +
    ln(380, 355, 470, 355, { sw: 3, op: .5 }) +
    cir(760, 350, 22, { sw: 2, op: .6 }) +
    txt(940, 470, '680—1180', { size: 18, op: .45 }),
  dims: dimH(280, 920, 830, '1400') + dimV(380, 760, 220, '750'),
});

/* ——— лист ——— */
function sheet(scene, toneIdx, variant, code) {
  const t = TONES[toneIdx % TONES.length];
  const parts = SCENES[scene](t);
  const grid = `
    <pattern id="mm" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="${INK}" stroke-width="0.6" opacity="0.07"/>
    </pattern>
    <pattern id="mm5" width="200" height="200" patternUnits="userSpaceOnUse">
      <path d="M200 0H0V200" fill="none" stroke="${INK}" stroke-width="0.9" opacity="0.11"/>
    </pattern>`;

  let body, frame = '', stamp = '';

  if (variant === 1) {                       // чертёж с размерами и штампом
    body = parts.art + parts.dims;
    frame = '';
    stamp =
      `<rect x="0" y="${H}" width="${W}" height="${FOOT}" fill="${PAPER}"/>` +
      ln(0, H, W, H, { sw: 1.4, op: .4 }) +
      ln(W - 470, H, W - 470, H + FOOT, { sw: 1.2, op: .25 }) +
      ln(W - 200, H, W - 200, H + FOOT, { sw: 1.2, op: .25 }) +
      txt(34, H + 38, 'ФОРМА · МЕБЕЛЬ НА ЗАКАЗ · ЭСКИЗ ПЕРЕД ЗАМЕРОМ', { size: 17, op: .55 }) +
      txt(W - 440, H + 38, code, { size: 17, op: .55 }) +
      txt(W - 170, H + 38, 'М 1:20', { size: 17, op: .55 });
  } else if (variant === 2) {                // предмет в интерьере, без размеров
    body =
      `<rect x="0" y="0" width="${W}" height="${H}" fill="${t.a}" opacity="0.16"/>` +
      `<rect x="0" y="${H - 96}" width="${W}" height="96" fill="${t.c}" opacity="0.28"/>` +
      ln(0, H - 96, W, H - 96, { sw: 2, op: .5 }) +
      parts.art;
  } else {                                   // фрагмент — крупный план
    body = `<g transform="translate(${-W * 0.28}, ${-H * 0.22}) scale(1.62)">${parts.art}</g>`;
    frame = `<rect x="0" y="${H}" width="${W}" height="${FOOT}" fill="${PAPER}"/>` +
      ln(0, H, W, H, { sw: 1.4, op: .4 }) +
      txt(34, H + 38, 'ФРАГМЕНТ · ' + code, { size: 17, op: .5 });
  }

  const HH = variant === 2 ? H : H + FOOT;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${HH}" width="${W}" height="${HH}" role="img">
  <defs>${grid}</defs>
  <rect width="${W}" height="${HH}" fill="${PAPER}"/>
  <rect width="${W}" height="${H}" fill="url(#mm)"/>
  <rect width="${W}" height="${H}" fill="url(#mm5)"/>
  ${body}
  ${frame}
  ${stamp}
</svg>`;
}

const ITEMS = [
  ['kuhnya-nord', 'kitchen', 0, 'КХ-01'], ['kuhnya-terra', 'kitchen-island', 4, 'КХ-02'], ['kuhnya-line', 'kitchen-corner', 2, 'КХ-03'],
  ['garderobnaya-modul', 'wardrobe-open', 1, 'ШК-01'], ['shkaf-kupe-mirazh', 'wardrobe', 3, 'ШК-02'],
  ['gostinaya-astra', 'living', 0, 'ГС-01'], ['tv-zona-slim', 'living-slim', 2, 'ГС-02'],
  ['spalnya-kokon', 'bedroom', 4, 'СП-01'], ['krovat-flou', 'bedroom-float', 1, 'СП-02'],
  ['detskaya-khoma', 'kids', 2, 'ДТ-01'], ['krovat-cherdak-lofti', 'kids-loft', 0, 'ДТ-02'],
  ['prihozhaya-port', 'hallway', 3, 'ПР-01'], ['prihozhaya-kompakt', 'hallway-slim', 1, 'ПР-02'],
  ['divan-lento', 'sofa', 2, 'МГ-01'], ['kreslo-tabu', 'armchair', 4, 'МГ-02'],
  ['kabinet-rektor', 'office', 1, 'КБ-01'], ['stol-strit', 'office-desk', 3, 'КБ-02'],
];

let n = 0;
for (const [slug, scene, tone, code] of ITEMS) {
  for (let v = 1; v <= 3; v++) { writeFileSync(resolve(OUT, `${slug}-${v}.svg`), sheet(scene, tone + (v - 1), v, code)); n++; }
}
const CATS = [['kitchen', 0], ['wardrobe', 1], ['living', 0], ['bedroom', 4], ['kids', 2], ['hallway', 3], ['sofa', 2], ['office', 1]];
for (const [scene, tone] of CATS) { writeFileSync(resolve(OUT, `cat-${scene}.svg`), sheet(scene, tone, 2, '')); n++; }
console.log(`Готово: ${n} листов в img/catalog/`);
