/*!
 * cat-scene : chatonne écaille de tortue en pixel art isométrique (bannière + avatar)
 * Moteur autonome, sans dépendance. Voir README.md.
 *
 *   CatScene.create(canvas, { preset: 'banner' })   // bannière 480x160
 *   CatScene.create(canvas, { preset: 'avatar' })   // avatar 128x128
 */
(function (root) {
  'use strict';

  /* ================= Préréglages (cadrage + scénario) ================= */
  var PRESETS = {
    banner: { width: 480, height: 160, K: 4, OX: 232, OY: 140, scenario: 'banner', vignette: 'banner', stillAt: 3000 },
    avatar: { width: 128, height: 128, K: 12, OX: -236, OY: 260, scenario: 'avatar', vignette: 'avatar', stillAt: 4300 }
  };

  /* ================= Apparence de la chatonne (à faire évoluer) ================= */
  var CAT_STYLE = {
    fur:      ['#070504', '#0f0b09', '#18120e', '#231a14', '#30241b', '#3f3024'],   // pelage principal, du plus sombre au plus clair
    flecks:   ['#1f1813', '#2e241c', '#3f3227', '#524234', '#675443', '#7c6754'],   // mouchetures brun clair
    earInner: '#8a5f55',
    eyes:     '#5fb8ad',      // yeux bleu-vert
    eyesHalf: '#4a9289',
    eyesShut: '#6a4a30',
    pupil:    '#100a06',
    nose:     '#c47a6e',
    flecksAmount: 1           // 0 = pelage uni, 1 = actuel, 2 = très moucheté
  };

  function createScene(cv, options) {
    var opt = {}, k0;
    var base = PRESETS[(options && options.preset) || 'banner'];
    for (k0 in base) opt[k0] = base[k0];
    for (k0 in (options || {})) opt[k0] = options[k0];
    var STYLE = {};
    for (k0 in CAT_STYLE) STYLE[k0] = CAT_STYLE[k0];
    for (k0 in (opt.cat || {})) STYLE[k0] = opt.cat[k0];

    /* ================= Configuration ================= */
    cv.width = opt.width; cv.height = opt.height;
    var ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    var K = opt.K;                   // 1 unité du monde = 5 cm = K pixels
    var OX = opt.OX, OY = opt.OY;    // origine du monde à l'écran
    var g = ctx;                     // contexte de dessin courant (calques)

    function layer() { var c = document.createElement('canvas'); c.width = W; c.height = H; return c; }

    /* ================= Couleurs ================= */
    function hex2rgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    function rgb2hex(c) { return '#' + c.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
    function shade(h, a) { var c = hex2rgb(h); return rgb2hex(c.map(function (v) { return a < 0 ? v * (1 + a) : v + (255 - v) * a; })); }
    function pal(h) { return [shade(h, -0.55), shade(h, -0.38), shade(h, -0.2), h, shade(h, 0.1), shade(h, 0.2)]; }

    var RACK = ['#0b0c0f', '#121418', '#191c21', '#21252b', '#2a2f36', '#343a42'];
    var METAL = ['#111317', '#181b20', '#20242a', '#2a2f36', '#363c44', '#424952'];
    var WOOD = pal('#6c4d35');
    var FRAME = pal('#5d6270');
    var TERRA = pal('#a4583a');
    var CERAM = pal('#8d8983');
    var MUG = pal('#b9b4ad');

    /* ================= Primitives de dessin ================= */
    function P(x, y, z) { return [OX + (x - y) * K, OY + ((x + y) / 2 - z) * K]; }

    function fillPoly(pts, col) {
      g.fillStyle = col;
      var minY = Infinity, maxY = -Infinity, i;
      for (i = 0; i < pts.length; i++) { if (pts[i][1] < minY) minY = pts[i][1]; if (pts[i][1] > maxY) maxY = pts[i][1]; }
      minY = Math.max(minY, -1); maxY = Math.min(maxY, H + 1);
      for (var py = Math.floor(minY); py <= Math.ceil(maxY); py++) {
        var sy = py + 0.5, xs = [];
        for (i = 0; i < pts.length; i++) {
          var a = pts[i], b = pts[(i + 1) % pts.length];
          if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) xs.push(a[0] + (sy - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
        }
        xs.sort(function (m, n) { return m - n; });
        for (i = 0; i + 1 < xs.length; i += 2) {
          var x0 = Math.round(xs[i]), x1 = Math.round(xs[i + 1]);
          if (x1 > x0) g.fillRect(x0, py, x1 - x0, 1);
        }
      }
    }

    function line(a, b, col) {
      g.fillStyle = col;
      var x0 = Math.round(a[0]), y0 = Math.round(a[1]), x1 = Math.round(b[0]), y1 = Math.round(b[1]);
      var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
      for (var n = 0; n < 2000; n++) {
        g.fillRect(x0, y0, 1, 1);
        if (x0 === x1 && y0 === y1) break;
        var e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    function thick(a, b, col, w) { for (var i = 0; i < w; i++) line([a[0] + i, a[1]], [b[0] + i, b[1]], col); }
    function px(p, col, w, h) { g.fillStyle = col; g.fillRect(Math.round(p[0]), Math.round(p[1]), w || 1, h || w || 1); }

    /* Quadrilatères dans les plans x = X, y = Y, z = Z */
    function qX(X, y0, y1, z0, z1, c) { fillPoly([P(X, y0, z0), P(X, y1, z0), P(X, y1, z1), P(X, y0, z1)], c); }
    function qY(Y, x0, x1, z0, z1, c) { fillPoly([P(x0, Y, z0), P(x1, Y, z0), P(x1, Y, z1), P(x0, Y, z1)], c); }
    function qZ(Z, x0, x1, y0, y1, c) { fillPoly([P(x0, y0, Z), P(x1, y0, Z), P(x1, y1, Z), P(x0, y1, Z)], c); }
    function discX(X, yc, zc, r, c) { var p = []; for (var i = 0; i < 20; i++) { var a = i / 20 * 6.2832; p.push(P(X, yc + r * Math.cos(a), zc + r * Math.sin(a))); } fillPoly(p, c); }
    function discY(Y, xc, zc, r, c) { var p = []; for (var i = 0; i < 20; i++) { var a = i / 20 * 6.2832; p.push(P(xc + r * Math.cos(a), Y, zc + r * Math.sin(a))); } fillPoly(p, c); }

    /* Extrusion verticale ombrée selon l'orientation de chaque face */
    function loft(bot, top, z0, z1, pl, topCol) {
      var n = bot.length, cx = 0, cy = 0, i;
      for (i = 0; i < n; i++) { cx += bot[i][0]; cy += bot[i][1]; }
      cx /= n; cy /= n;
      for (i = 0; i < n; i++) {
        var a = bot[i], b = bot[(i + 1) % n];
        var nx = b[1] - a[1], ny = a[0] - b[0];
        if (nx * ((a[0] + b[0]) / 2 - cx) + ny * ((a[1] + b[1]) / 2 - cy) < 0) { nx = -nx; ny = -ny; }
        var l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
        if (nx + ny <= 0.01) continue;
        var f = (ny - nx + 1.4143) / 2.8286;
        var ta = top[i], tb = top[(i + 1) % n];
        fillPoly([P(a[0], a[1], z0), P(b[0], b[1], z0), P(tb[0], tb[1], z1), P(ta[0], ta[1], z1)], pl[Math.round(f * (pl.length - 2))]);
      }
      if (topCol !== null) fillPoly(top.map(function (p) { return P(p[0], p[1], z1); }), topCol || pl[pl.length - 1]);
    }
    function extrude(pts, z0, z1, pl, topCol) { loft(pts, pts, z0, z1, pl, topCol); }
    function box(x0, y0, z0, x1, y1, z1, pl, topCol) { extrude([[x1, y1], [x0, y1], [x0, y0], [x1, y0]], z0, z1, pl, topCol); }
    function circle(x, y, r, n) { n = n || 18; var p = []; for (var i = 0; i < n; i++) { var a = i / n * 6.2832; p.push([x + r * Math.cos(a), y + r * Math.sin(a)]); } return p; }
    function cyl(x, y, z0, z1, r, pl, topCol) { extrude(circle(x, y, r), z0, z1, pl, topCol); }
    function rrect(x0, y0, x1, y1, r) {
      var p = [], cs = [[x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180], [x1 - r, y0 + r, 270]];
      cs.forEach(function (c) { for (var i = 0; i <= 3; i++) { var a = (c[2] + 30 * i) * Math.PI / 180; p.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); } });
      return p;
    }
    function flat(pts, z, c) { fillPoly(pts.map(function (q) { return P(q[0], q[1], z); }), c); }
    function glow(x, y, z, r, rgba) {
      var c = P(x, y, z), gr = g.createRadialGradient(c[0], c[1], 0, c[0], c[1], r);
      gr.addColorStop(0, rgba); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(c[0] - r, c[1] - r, r * 2, r * 2);
    }

    /* Petit générateur pseudo-aléatoire déterministe */
    var seed = 11;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function hash(a, b) { var s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); }

    /* ================= Géométrie du décor ================= */
    var RACK_TOP = 13.3, DESK_TOP = 15.2, KB_TOP = 15.85;
    var YE = -10.6;                                  // façade des équipements (en retrait de la porte vitrée)
    var UH = 11.2 / 12;                              // hauteur d'un U
    function U(n) { return 1.35 + (n - 1) * UH; }    // bas du U n (1 = en bas)

    var STARS = [], CITY = [], LEDS = [];

    /* ---------- Pièce ---------- */
    function drawRoom() {
      /* Parquet */
      flat([[-20, -20], [70, -20], [70, 70], [-20, 70]], 0, '#33261d');
      for (var y = -20, row = 0; y < 70; y += 2.4, row++) {
        line(P(-20, y, 0), P(70, y, 0), '#261b14');
        if (row % 3 === 0) line(P(-20, y + 0.6, 0), P(70, y + 0.6, 0), '#382a20');
        for (var x = -20 + (row * 3.7) % 9; x < 70; x += 9) line(P(x, y, 0), P(x, y + 2.4, 0), '#261b14');
      }
      /* Clair de lune au sol */
      fillPoly([P(-19.5, 22, 0), P(-19.5, 34, 0), P(-8, 37, 0), P(-8, 25, 0)], 'rgba(140,170,235,0.07)');

      /* Murs */
      qX(-20, -20, 70, 0, 50, '#232834');
      qY(-20, -20, 70, 0, 50, '#2b3140');
      line(P(-20, -20, 0), P(-20, -20, 50), '#1b1f28');
      /* Plinthes */
      qX(-19.97, -20, 70, 0, 0.9, '#30364a'); line(P(-19.96, -20, 0.9), P(-19.96, 70, 0.9), '#3c4358');
      qY(-19.97, -20, 70, 0, 0.9, '#384054'); line(P(-20, -19.96, 0.9), P(70, -19.96, 0.9), '#454d63');

      /* Tapis devant la baie */
      flat(rrect(-1, -8, 15, 6.5, 2.5), 0.03, '#2f2539');
      flat(rrect(-0.3, -7.3, 14.3, 5.8, 2), 0.04, '#3d3049');
      flat(rrect(0.6, -6.4, 13.4, 4.9, 1.6), 0.05, '#2f2539');
      for (var rx = 2; rx <= 12; rx += 2.5) for (var ry = -4.8; ry <= 3.6; ry += 2.8) {
        flat([[rx, ry - 0.6], [rx + 0.6, ry], [rx, ry + 0.6], [rx - 0.6, ry]], 0.06, '#47385a');
      }

      drawWindow();
      drawCurtains();
      drawPoster();
      drawRadiator();
      drawShelf();

      /* Prise murale et câble de la baie */
      qY(-19.95, 18.4, 19.6, 1.4, 2.6, '#5a5f6b'); px(P(18.8, -19.94, 2.1), '#1a1c20', 1); px(P(19.2, -19.94, 2.1), '#1a1c20', 1);
      line(P(16, -17.5, 0.15), P(18.9, -17.5, 0.15), '#0d0e10'); line(P(18.9, -17.5, 0.15), P(18.9, -19.9, 1.9), '#0d0e10');

      /* Gamelle du chat */
      cyl(-9, -15, 0, 0.6, 1.1, pal('#3f6d8a'), '#2b4d63');
      flat(circle(-9, -15, 0.8), 0.55, '#5a3a22');
      for (var k = 0; k < 6; k++) px(P(-9 + Math.cos(k) * 0.45, -15 + Math.sin(k * 2) * 0.45, 0.62), '#8a5a32', 1);
    }

    function drawWindow() {
      var X = -19.95;
      qX(X - 0.01, 21.5, 34.5, 15.5, 31.5, '#4a4f5c');
      /* Ciel de nuit en bandes */
      var sky = ['#0c1328', '#0e162e', '#111a35', '#131d3b', '#162142', '#19254a', '#1c2a51', '#202f58'];
      for (var b = 0; b < sky.length; b++) {
        var z1 = 30.8 - b * (14.6 / sky.length), z0 = z1 - 14.6 / sky.length;
        qX(X, 22.2, 33.8, z0, z1, sky[b]);
      }
      /* Lune */
      discX(X + 0.01, 31.2, 28.2, 1.05, '#e9e4cc');
      discX(X + 0.02, 31.65, 28.45, 0.85, '#0f172f');
      /* Étoiles (scintillent en dynamique) */
      for (var i = 0; i < 18; i++) STARS.push([22.6 + rnd() * 10.8, 24 + rnd() * 6.5, rnd() * 6]);
      /* Silhouette de la ville */
      var bl = [[22.2, 23.7, 19.6], [23.7, 25.3, 22.1], [25.3, 26.3, 18.7], [26.3, 28.2, 23.6], [28.2, 29.3, 20.4], [29.3, 31.2, 22.6], [31.2, 32.3, 19.2], [32.3, 33.8, 21.2]];
      bl.forEach(function (bd, j) {
        qX(X + 0.01, bd[0], bd[1], 16.2, bd[2], j % 2 ? '#090d19' : '#0b1020');
        for (var wy = bd[0] + 0.25; wy < bd[1] - 0.2; wy += 0.5) {
          for (var wz = 16.8; wz < bd[2] - 0.5; wz += 0.75) {
            var r = rnd();
            if (r < 0.22) CITY.push([wy, wz, r < 0.05 ? '#8fb0ff' : '#f0c56a', rnd()]);
          }
        }
      });
      /* Montants et appui */
      qX(X + 0.03, 27.85, 28.15, 16.2, 30.8, '#4a4f5c');
      qX(X + 0.03, 22.2, 33.8, 23.4, 23.7, '#4a4f5c');
      box(-20, 21.2, 15.0, -18.9, 34.8, 15.5, FRAME);
    }

    function drawCurtains() {
      line(P(-19.4, 19.0, 32.9), P(-19.4, 37.0, 32.9), '#6f7480');
      line(P(-19.4, 19.0, 33.1), P(-19.4, 37.0, 33.1), '#8a8f9c');
      var cols = ['#3b2a37', '#4a3445', '#56404f', '#46323f'];
      [[34.2, 37.2], [18.8, 21.8]].forEach(function (c) {
        var n = 0;
        for (var y = c[0]; y < c[1] - 0.01; y += 0.5, n++) qX(-19.4, y, Math.min(y + 0.5, c[1]), 4.4, 32.8, cols[n % 4]);
        qX(-19.38, c[0], c[1], 4.4, 4.8, '#2e2129');
      });
    }

    function drawPoster() {
      var Y = -19.96;
      qY(Y, 21, 30.5, 14.5, 26.5, '#101216');
      qY(Y + 0.01, 21.4, 30.1, 14.9, 26.1, '#5f5c57');
      var sky = ['#2a2250', '#3c2858', '#552f62', '#743a69', '#93466c'];
      for (var i = 0; i < sky.length; i++) qY(Y + 0.02, 22, 29.5, 25.5 - (i + 1) * 1.2, 25.5 - i * 1.2, sky[i]);
      discY(Y + 0.03, 25.75, 19.6, 2.3, '#f0a050');
      for (var s = 0; s < 3; s++) qY(Y + 0.04, 23.3, 28.2, 19.65 + s * 0.55, 19.85 + s * 0.55, sky[4]);
      fillPoly([P(22, Y + 0.05, 19.4), P(24.2, Y + 0.05, 22.2), P(26, Y + 0.05, 19.4)], '#1f1739');
      fillPoly([P(25, Y + 0.05, 19.4), P(27.6, Y + 0.05, 21.4), P(29.5, Y + 0.05, 19.4)], '#271c45');
      qY(Y + 0.05, 22, 29.5, 15.5, 19.4, '#140f24');
      for (var gx = 22.5; gx < 29.5; gx += 1.1) line(P(gx, Y + 0.06, 15.5), P(25.75 + (gx - 25.75) * 0.3, Y + 0.06, 19.4), '#5a2357');
      line(P(22, Y + 0.06, 17.4), P(29.5, Y + 0.06, 17.4), '#5a2357');
    }

    function drawRadiator() {
      box(-15, -20, 1.6, -6, -19.3, 7.6, pal('#767c85'));
      for (var x = -14.6; x < -6.2; x += 0.6) line(P(x, -19.29, 1.9), P(x, -19.29, 7.3), '#535860');
      cyl(-6.4, -19.0, 1.0, 1.6, 0.25, METAL);
    }

    function drawShelf() {
      box(3, -20, 24.0, 17, -17.4, 24.5, WOOD);
      line(P(5, -19.9, 24), P(5, -19.9, 22.8), '#15171b'); line(P(15, -19.9, 24), P(15, -19.9, 22.8), '#15171b');
      var bw = [0.55, 0.7, 0.5, 0.65, 0.6, 0.75, 0.5, 0.6], bh = [2.6, 3.1, 2.4, 2.9, 2.2, 3.0, 2.5, 2.7];
      var bc = ['#7a4848', '#46677a', '#8a7748', '#4a5c3a', '#6a4a6a', '#3e4f6e', '#8a5a3a', '#5a6a72'];
      var x = 3.6;
      for (var i = 0; i < bw.length; i++) { box(x, -19.6, 24.5, x + bw[i], -17.9, 24.5 + bh[i], pal(bc[i])); x += bw[i] + 0.05; }
      box(x + 0.2, -19.6, 24.5, x + 0.9, -17.9, 25.0, pal('#6a4a6a'));          // livre couché
      /* Plante retombante */
      cyl(12.6, -18.7, 24.5, 25.7, 0.8, TERRA, '#2a1d14');
      var leaf = ['#2f6040', '#3e7c4c', '#55945e'];
      for (var v = 0; v < 4; v++) {
        var bx = 11.9 + v * 0.45, len = 2.5 + v % 2 * 1.6;
        for (var k = 0; k < 10; k++) {
          var t = k / 9;
          var q = P(bx + Math.sin(t * 3 + v) * 0.3, -17.3 + t * 0.2, 25.6 - t * len - (t > 0.2 ? 0 : 0));
          px(q, leaf[(k + v) % 3], 2, 2);
        }
      }
      for (var l = 0; l < 7; l++) px(P(12.2 + rnd() * 0.9, -18.5 + rnd() * 0.6, 25.8 + rnd() * 0.8), leaf[l % 3], 2, 2);
      /* Petit cadre photo */
      box(15.3, -19.4, 24.5, 15.6, -18.2, 26.0, METAL);
      qX(15.61, -19.2, -18.4, 24.8, 25.7, '#7d8a96');
    }

    /* ---------- Bureau ---------- */
    function drawDesk() {
      [[-19.2, -5.2], [-19.2, 17.2], [-8.8, -5.2], [-8.8, 17.2]].sort(function (a, b) { return a[0] + a[1] - b[0] - b[1]; })
        .forEach(function (l) { box(l[0] - 0.4, l[1] - 0.4, 0, l[0] + 0.4, l[1] + 0.4, 14.4, METAL); });
      box(-20, -6, 14.4, -8, 18, DESK_TOP, WOOD);
      line(P(-8, -6, DESK_TOP), P(-8, 18, DESK_TOP), WOOD[5]);

      /* Écran */
      extrude(rrect(-18.5, 3.5, -15.8, 7.5, 0.6), DESK_TOP, DESK_TOP + 0.25, METAL);
      box(-17.9, 5.2, DESK_TOP + 0.25, -17.3, 5.8, 18.4, METAL);
      box(-17.6, -0.8, 17.0, -16.9, 11.8, 23.6, RACK);
      qX(-16.88, -0.4, 11.4, 17.4, 23.2, '#05070a');

      /* Lampe de bureau */
      cyl(-18, -4.5, DESK_TOP, DESK_TOP + 0.3, 1.0, METAL);
      thick(P(-18, -4.5, DESK_TOP + 0.3), P(-17.2, -3.6, 20.6), '#3a3f47', 2);
      thick(P(-17.2, -3.6, 20.6), P(-14.8, -2.6, 21.3), '#3a3f47', 2);
      loft(circle(-14.6, -2.5, 1.25, 14), circle(-14.6, -2.5, 0.5, 14), 20.2, 21.5, pal('#c9a24a'));
      flat(circle(-14.6, -2.5, 1.0, 14), 20.21, '#ffe7b3');

      /* Tasse */
      cyl(-14.5, 14.2, DESK_TOP, DESK_TOP + 1.7, 0.85, MUG, MUG[4]);
      flat(circle(-14.5, 14.2, 0.68), DESK_TOP + 1.65, '#3b2112');
      thick(P(-14.5, 15.0, DESK_TOP + 1.3), P(-14.5, 15.5, DESK_TOP + 1.0), MUG[2], 2);
      thick(P(-14.5, 15.5, DESK_TOP + 1.0), P(-14.5, 15.0, DESK_TOP + 0.5), MUG[2], 2);

      /* Plante grasse */
      cyl(-18.3, 15.6, DESK_TOP, DESK_TOP + 1.2, 0.9, TERRA, '#2a1d14');
      var lv = ['#3e7c4c', '#4f8f58', '#2f6040'];
      for (var i = 0; i < 7; i++) {
        var a = i * 0.9, r = 0.35 + (i % 3) * 0.2;
        thick(P(-18.3, 15.6, DESK_TOP + 1.2), P(-18.3 + Math.cos(a) * r * 1.6, 15.6 + Math.sin(a) * r * 1.6, DESK_TOP + 1.6 + (i % 3) * 0.5), lv[i % 3], 2);
      }

      /* Ombre de la chaise de bureau */
      flat(circle(-4.6, 14.2, 3.6, 16), 0.01, 'rgba(0,0,0,0.35)');

      /* Lumière chaude de la lampe */
      glow(-14.6, -2.5, 18.5, 95, 'rgba(255,186,110,0.16)');
      glow(-14.6, -2.5, 17.0, 34, 'rgba(255,214,150,0.12)');
    }

    /* ---------- Chaise de bureau noire (premier plan) ---------- */
    function drawChair() {
      var cx = -4.6, cy = 14.2, a = 0.28, ca = Math.cos(a), sa = Math.sin(a);
      var BLK = pal('#2b2d32'), PIST = pal('#6b7079');
      function L(x, y) { return [cx + x * ca - y * sa, cy + x * sa + y * ca]; }
      function LP(pts) { return pts.map(function (p) { return L(p[0], p[1]); }); }

      /* Piétement 5 branches + roulettes */
      var sp = [];
      for (var i = 0; i < 5; i++) { var an = i * 1.2566 + 0.35, e = L(Math.cos(an) * 3.1, Math.sin(an) * 3.1); sp.push({ an: an, e: e }); }
      sp.sort(function (u, v) { return u.e[0] + u.e[1] - v.e[0] - v.e[1]; });
      sp.forEach(function (s) {
        cyl(s.e[0], s.e[1], 0, 0.85, 0.42, METAL);
        var dx = s.e[0] - cx, dy = s.e[1] - cy, l = Math.hypot(dx, dy), nx = -dy / l * 0.3, ny = dx / l * 0.3;
        extrude([[cx + nx, cy + ny], [s.e[0] + nx, s.e[1] + ny], [s.e[0] - nx, s.e[1] - ny], [cx - nx, cy - ny]], 0.85, 1.35, BLK);
      });
      cyl(cx, cy, 0.85, 1.6, 0.85, BLK);
      cyl(cx, cy, 1.6, 4.6, 0.6, BLK);
      cyl(cx, cy, 4.6, 7.8, 0.4, PIST);
      extrude(LP([[1.6, 1.6], [-1.6, 1.6], [-1.6, -1.6], [1.6, -1.6]]), 7.6, 8.3, BLK);

      function arm(s) {
        extrude(LP([[1.4, s * 4.6 + 0.35], [0.6, s * 4.6 + 0.35], [0.6, s * 4.6 - 0.35], [1.4, s * 4.6 - 0.35]]), 9.4, 12.3, BLK);
        extrude(LP(rrect(-2.6, s * 4.9 - 0.5, 2.6, s * 4.9 + 0.5, 0.4)), 12.3, 12.9, BLK, '#383b41');
      }
      arm(-1);
      /* Assise rembourrée */
      extrude(LP(rrect(-4.8, -4.6, 4.6, 4.6, 1.6)), 8.3, 9.7, BLK, '#303338');
      line(P(L(-4.6, 0)[0], L(-4.6, 0)[1], 9.7), P(L(-4.6, 3)[0], L(-4.6, 3)[1], 9.7), '#3d4046');
      arm(1);

      /* Dossier en maille, relié à l'assise */
      var s0 = L(3.8, 0), s1 = L(4.5, 0);
      thick(P(s0[0], s0[1], 8.8), P(s1[0], s1[1], 11.2), BLK[1], 2);
      function back(X, col) {
        var pts = [], r = 1.6, y0 = -4.3, y1 = 4.3, z0 = 10.9, z1 = 21.0;
        [[y1 - r, z1 - r, 0], [y0 + r, z1 - r, 90], [y0 + r, z0 + r, 180], [y1 - r, z0 + r, 270]].forEach(function (c) {
          for (var k = 0; k <= 4; k++) { var t = (c[2] + 22.5 * k) * Math.PI / 180, q = L(X, c[0] + r * Math.cos(t)); pts.push(P(q[0], q[1], c[1] + r * Math.sin(t))); }
        });
        fillPoly(pts, col);
        return pts;
      }
      back(4.2, BLK[1]);
      var outl = back(4.9, '#1b1c20');
      for (var z = 11.8; z < 20.4; z += 0.9) { var l0 = L(4.92, -3.6), l1 = L(4.92, 3.6); line(P(l0[0], l0[1], z), P(l1[0], l1[1], z), '#25272c'); }
      for (var y = -3.6; y <= 3.6; y += 0.9) { var m = L(4.92, y); line(P(m[0], m[1], 11.6), P(m[0], m[1], 20.3), '#222429'); }
      for (var k = 0; k < outl.length; k++) line(outl[k], outl[(k + 1) % outl.length], '#34373d');
    }

    /* ---------- Plante d'intérieur ---------- */
    function drawPlant() {
      var cx = -16.6, cy = 20.6;
      cyl(cx, cy, 0, 3.0, 1.5, CERAM, null);
      flat(circle(cx, cy, 1.5), 3.0, CERAM[4]);
      flat(circle(cx, cy, 1.25), 3.01, '#24180f');
      var leaves = [];
      for (var i = 0; i < 8; i++) {
        var ang = i * 0.82 + 0.3, bz = 5.5 + (i % 3) * 2.4 + (i > 5 ? 1.5 : 0), Ln = 2.5 + (i % 2) * 0.9;
        leaves.push({ ang: ang, bz: bz, L: Ln, bx: cx + Math.cos(ang) * 1.2, by: cy + Math.sin(ang) * 1.2 });
      }
      leaves.sort(function (a, b) { return a.bx + a.by - b.bx - b.by; });
      leaves.forEach(function (lf) {
        thick(P(cx, cy, 3.0), P(lf.bx, lf.by, lf.bz), '#2c4f33', 1);
        var ax = Math.cos(lf.ang), ay = Math.sin(lf.ang), sx = -ay, sy = ax, pts = [];
        for (var k = 0; k < 16; k++) {
          var t = k / 16 * 6.2832, u = lf.L * (1 - Math.cos(t)) / 2, v = lf.L * 0.42 * Math.sin(t) * (k % 4 === 2 ? 0.7 : 1);
          pts.push(P(lf.bx + ax * u + sx * v, lf.by + ay * u + sy * v, lf.bz - u * 0.35));
        }
        fillPoly(pts, (lf.ang % 1.6) > 0.8 ? '#33663f' : '#2b5937');
        line(P(lf.bx, lf.by, lf.bz), P(lf.bx + ax * lf.L, lf.by + ay * lf.L, lf.bz - lf.L * 0.35), '#4a8a56');
      });
    }

    /* ---------- Baie 12U ---------- */
    function led(x, z, kind, i) { LEDS.push({ x: x, z: z, kind: kind, i: i, thr: 0.05 + rnd() * 0.9 }); px(P(x, YE - 0.01, z), '#0e1410', 1); }

    function drawRack() {
      [[4.8, -19.2], [15.2, -19.2], [4.8, -10.8], [15.2, -10.8]].sort(function (a, b) { return a[0] + a[1] - b[0] - b[1]; })
        .forEach(function (c) { cyl(c[0], c[1], 0, 0.8, 0.42, RACK); });
      box(4, -20, 0.8, 16, -10, 13.0, RACK);
      box(4.1, -19.9, 13.0, 15.9, -10.1, RACK_TOP, RACK, '#1d2127');
      for (var x = 5.4; x < 15; x += 1.2) line(P(x, -18.6, RACK_TOP), P(x, -11.6, RACK_TOP), '#101215');
      for (var z = 11.1; z < 12.6; z += 0.45) line(P(16.01, -18.8, z), P(16.01, -11.2, z), '#0c0e11');
      for (z = 1.6; z < 3.1; z += 0.45) line(P(16.01, -18.8, z), P(16.01, -11.2, z), '#0c0e11');
      line(P(16, -10, 0.8), P(16, -10, 13.0), RACK[4]);
      line(P(4, -10, RACK_TOP), P(16, -10, RACK_TOP), RACK[5]);
      line(P(16, -10, RACK_TOP), P(16, -20, RACK_TOP), RACK[4]);
      qX(16.02, -12.4, -11.4, 6.6, 7.2, '#3a3f47');

      /* Intérieur + profondeur */
      qY(-10.01, 4.55, 15.45, 1.35, 12.55, '#060708');
      fillPoly([P(4.6, -10, 1.35), P(4.6, YE, 1.35), P(4.6, YE, 12.55), P(4.6, -10, 12.55)], '#121418');
      fillPoly([P(4.6, -10, 1.36), P(15.4, -10, 1.36), P(15.4, YE, 1.36), P(4.6, YE, 1.36)], '#16191d');
      /* Montants perforés */
      qY(YE, 4.75, 5.05, 1.35, 12.55, '#2a2e35'); qY(YE, 14.95, 15.25, 1.35, 12.55, '#2a2e35');
      for (z = 1.5; z < 12.5; z += UH / 3) { px(P(4.88, YE - 0.01, z), '#0b0c0e', 1); px(P(15.08, YE - 0.01, z), '#0b0c0e', 1); }

      var X0 = 5.05, X1 = 14.95, n;
      function face(n0, size, col) { var a = U(n0) + 0.04, b = U(n0) + size * UH - 0.04; qY(YE, X0, X1, a, b, col); line(P(X0, YE - 0.005, b), P(X1, YE - 0.005, b), shade(col, 0.22)); return [a, b]; }

      /* U12 : panneau de brassage 24 ports */
      var f = face(12, 1, '#23272d');
      qY(YE - 0.01, X0 + 0.3, X1 - 0.3, f[1] - 0.3, f[1] - 0.05, '#2c3038');
      var ports = [];
      for (n = 0; n < 24; n++) { var xp = 5.7 + n * (8.6 / 23); ports.push(xp); px(P(xp, YE - 0.01, f[0] + 0.25), '#040506', 1); }
      var zPatch = f[0] + 0.25;

      /* U11 : passe-câbles */
      f = face(11, 1, '#131519');
      qY(YE - 0.01, X0 + 0.4, X1 - 0.4, (f[0] + f[1]) / 2 - 0.08, (f[0] + f[1]) / 2 + 0.08, '#060708');
      for (n = 0; n < 5; n++) px(P(5.8 + n * 2.1, YE - 0.02, f[1] - 0.2), '#2a2e35', 2, 1);

      /* U10 : switch 24 ports */
      f = face(10, 1, '#2e343c');
      qY(YE - 0.01, X0 + 0.15, X0 + 0.55, f[0] + 0.1, f[1] - 0.1, '#30363e');
      var zSw = f[0] + 0.25;
      ports.forEach(function (xp, i) { px(P(xp, YE - 0.01, zSw), '#040506', 1); led(xp, f[1] - 0.2, 'port', i); });
      qY(YE - 0.01, 14.2, 14.85, f[0] + 0.15, f[0] + 0.5, '#0b0c0e');

      /* Câbles de brassage colorés */
      var cc = ['#2c5aa8', '#a8861a', '#23824a', '#9c3434', '#8d9097', '#6c43a0'];
      ports.forEach(function (xp, i) {
        if (hash(i, 5) < 0.4) return;
        var c = cc[Math.floor(i / 4) % cc.length], zm = U(11) + UH * 0.5;
        line(P(xp, YE + 0.05, zPatch - 0.05), P(xp + 0.06, YE + 0.15, zm), c);
        line(P(xp + 0.06, YE + 0.15, zm), P(xp, YE + 0.05, zSw + 0.05), c);
      });

      /* U9 : pare-feu */
      f = face(9, 1, '#2d333b');
      qY(YE - 0.01, 7.8, 10.2, f[0] + 0.15, f[1] - 0.15, '#0a1018');
      for (n = 0; n < 4; n++) { led(5.6 + n * 0.45, (f[0] + f[1]) / 2, 'fw', n); px(P(12.6 + n * 0.55, YE - 0.01, f[0] + 0.3), '#040506', 2, 1); }

      /* U8 : obturateur ventilé */
      f = face(8, 1, '#17191d');
      for (x = 5.6; x < 14.5; x += 0.5) px(P(x, YE - 0.01, (f[0] + f[1]) / 2), '#0b0c0e', 1);

      /* U7-U6 : serveur 2U, 6 baies */
      f = face(6, 2, '#1f2328');
      qY(YE - 0.01, X0 + 0.15, 6.6, f[0] + 0.15, f[1] - 0.15, '#262a30');
      led(5.6, f[1] - 0.45, 'power', 0); led(6.1, f[1] - 0.45, 'sys', 0); led(6.1, f[0] + 0.45, 'sys', 1);
      for (n = 0; n < 6; n++) {
        var bx = 6.9 + n * 1.33;
        qY(YE - 0.01, bx, bx + 1.22, f[0] + 0.15, f[1] - 0.15, '#2b3038');
        line(P(bx + 0.1, YE - 0.02, f[1] - 0.35), P(bx + 1.1, YE - 0.02, f[1] - 0.35), '#3f454e');
        led(bx + 1.0, f[0] + 0.35, 'disk', n);
      }

      /* U5-U4 : NAS 4 baies */
      f = face(4, 2, '#444a53');
      qY(YE - 0.01, 5.4, 8.6, f[1] - 0.5, f[1] - 0.3, '#3b414a');
      led(5.7, f[0] + 0.5, 'sys', 2); led(6.2, f[0] + 0.5, 'sys', 3);
      for (n = 0; n < 4; n++) {
        var nx = 9.3 + n * 1.4;
        qY(YE - 0.01, nx, nx + 1.3, f[0] + 0.15, f[1] - 0.15, '#22262c');
        for (var gz = f[0] + 0.35; gz < f[1] - 0.4; gz += 0.3) line(P(nx + 0.15, YE - 0.02, gz), P(nx + 1.15, YE - 0.02, gz), '#1a1d21');
        led(nx + 0.65, f[1] - 0.3, 'nas', n);
      }

      /* U3 : tablette avec box internet + mini PC */
      var a3 = U(3);
      qY(YE, X0, X1, a3, a3 + 0.12, '#2a2e35');
      qY(YE + 0.1, 5.8, 9.2, a3 + 0.12, a3 + UH - 0.1, '#7f848c');
      qY(YE + 0.09, 5.8, 9.2, a3 + UH - 0.22, a3 + UH - 0.1, '#959aa2');
      for (n = 0; n < 4; n++) LEDS.push({ x: 6.4 + n * 0.5, z: a3 + 0.4, kind: 'isp', i: n, thr: 0.05 + rnd() * 0.9, y: YE + 0.09 });
      qY(YE + 0.1, 10.0, 12.6, a3 + 0.12, a3 + UH - 0.25, '#15171a');
      LEDS.push({ x: 12.2, z: a3 + 0.4, kind: 'mini', i: 0, thr: 0.05 + rnd() * 0.9, y: YE + 0.09 });

      /* U2-U1 : onduleur avec écran */
      f = face(1, 2, '#272b31');
      qY(YE - 0.01, 6.0, 9.2, f[0] + 0.45, f[1] - 0.45, '#0a121a');
      for (n = 0; n < 3; n++) px(P(9.8 + n * 0.5, YE - 0.01, f[0] + 0.6), '#30353d', 1);
      for (x = 11.6; x < 14.6; x += 0.4) line(P(x, YE - 0.01, f[0] + 0.25), P(x, YE - 0.01, f[1] - 0.25), '#121418');
      led(9.8, f[1] - 0.45, 'ups', 0);

      /* Cadre de porte par-dessus (masque le débord du retrait) */
      var fc = RACK[3];
      qY(-9.99, 4.0, 4.6, 0.8, 13.0, fc); qY(-9.99, 15.4, 16.0, 0.8, 13.0, fc);
      qY(-9.99, 4.0, 16.0, 12.5, 13.0, fc); qY(-9.99, 4.0, 16.0, 0.8, 1.4, fc);
      for (x = 4.6; x < 15.4; x += 0.45) { px(P(x, -9.98, 12.75), '#0c0d10', 1); px(P(x, -9.98, 1.1), '#0c0d10', 1); }
    }

    /* Vitre teintée + reflets + poignée (calque au-dessus des voyants) */
    function drawGlass() {
      qY(-9.97, 4.6, 15.4, 1.4, 12.5, 'rgba(140,180,230,0.07)');
      fillPoly([P(6.2, -9.96, 12.5), P(7.6, -9.96, 12.5), P(5.2, -9.96, 4.0), P(4.6, -9.96, 4.0), P(4.6, -9.96, 6.4)], 'rgba(255,255,255,0.05)');
      fillPoly([P(9.0, -9.96, 12.5), P(9.5, -9.96, 12.5), P(6.8, -9.96, 1.4), P(6.3, -9.96, 1.4)], 'rgba(255,255,255,0.035)');
      line(P(4.62, -9.95, 1.5), P(4.62, -9.95, 12.4), 'rgba(255,255,255,0.08)');
      thick(P(15.05, -9.9, 5.6), P(15.05, -9.9, 8.6), '#8e959f', 2);
      line(P(15.05, -9.88, 5.6), P(15.05, -9.88, 8.6), '#c3c9d1');
      px(P(15.05, -9.9, 4.9), '#0a0b0d', 1, 2);
    }

    function drawVignette() {
      var gr = opt.vignette === 'avatar'
        ? g.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.72)
        : g.createRadialGradient(W / 2, H * 0.55, H * 0.6, W / 2, H * 0.55, W * 0.62);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.5)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }

    /* ================= Éléments animés du décor ================= */
    function drawSky(t) {
      STARS.forEach(function (s) {
        var b = 0.5 + 0.5 * Math.sin(t / 650 + s[2] * 3);
        if (b < 0.3) return;
        g.globalAlpha = b; px(P(-19.93, s[0], s[1]), '#dfe6ff', 1);
      });
      g.globalAlpha = 1;
      CITY.forEach(function (w, i) {
        if (hash(i, Math.floor(t / 5000 + w[3] * 10)) < 0.1) return;
        px(P(-19.93, w[0], w[1]), w[2], 1);
      });
    }

    function drawLeds(st) {
      var t = st.t;
      LEDS.forEach(function (l) {
        if (st.power <= l.thr) return;
        var col;
        if (st.halting) col = '#ef4444';
        else if (l.kind === 'port') { if (hash(l.i, 3) < 0.25) return; col = hash(l.i, Math.floor(t / 90) + l.i) > 0.72 ? '#f2b33d' : '#3ddc84'; }
        else if (l.kind === 'fw') col = l.i === 0 || hash(l.i, Math.floor(t / 160)) > 0.5 ? '#3ddc84' : '#1d5c36';
        else if (l.kind === 'power') col = '#5aa9ff';
        else if (l.kind === 'disk') col = hash(l.i, Math.floor(t / 110)) > 0.62 ? '#5aa9ff' : '#3ddc84';
        else if (l.kind === 'nas') col = hash(l.i + 7, Math.floor(t / 140)) > 0.55 ? '#f2b33d' : '#3ddc84';
        else if (l.kind === 'isp') col = l.i === 3 ? (Math.floor(t / 400) % 2 ? '#3ddc84' : '#1d5c36') : '#3ddc84';
        else if (l.kind === 'mini') col = '#e8f0ff';
        else col = '#3ddc84';
        px(P(l.x, l.y !== undefined ? l.y : YE - 0.02, l.z), col, 1);
      });
      var f0 = U(1) + 0.49, f1 = U(1) + 2 * UH - 0.49;
      if (st.power > 0.3 && !st.halting) {                         // écran de l'onduleur
        qY(YE - 0.02, 6.05, 9.15, f0, f1, '#0f3b5e');
        var bars = 3 + Math.round(1.5 + 1.5 * Math.sin(t / 900));
        for (var b = 0; b < 7; b++) qY(YE - 0.03, 6.3 + b * 0.38, 6.55 + b * 0.38, f0 + 0.15, f1 - 0.15, b < bars ? '#86d4ff' : '#1d5478');
      }
      if (st.power > 0.5 && !st.halting) {                         // écran du pare-feu
        var z9 = U(9) + 0.25;
        for (var k = 0; k < 5; k++) if (hash(k, Math.floor(t / 300)) > 0.3) px(P(8.0 + k * 0.42, YE - 0.02, z9 + 0.2), '#3ddc84', 1);
      }
      if (st.power > 0.2) glow(10, -7, 0.5, 46, 'rgba(70,190,255,' + (0.05 * Math.min(1, st.power)).toFixed(3) + ')');
    }

    function drawMonitor(st) {
      var X = -16.86, t = st.t;
      if (st.screen === 'off') return;
      qX(X, -0.4, 11.4, 17.4, 23.2, st.screen === 'boot' ? '#05070a' : '#0b0f17');
      if (st.screen === 'boot') {
        if (Math.floor(t / 350) % 2 === 0) discX(X + 0.01, 5.5, 20.4, 0.8, '#d8dde6');
        return;
      }
      if (st.screen === 'halt') {
        for (var h = 0; h < 6; h++) qX(X + 0.01, 11.0 - (2 + (h * 7) % 6), 11.0, 22.4 - h * 0.75, 22.7 - h * 0.75, '#ef4444');
        qX(X + 0.01, 2.0, 9.0, 17.9, 18.8, '#7f1d1d');
        glow(-16, 5.5, 20, 70, 'rgba(255,70,70,0.10)');
        return;
      }
      /* Tableau de bord façon Grafana */
      qX(X + 0.005, -0.2, 11.2, 22.6, 23.0, '#161d2a');
      for (var d = 0; d < 3; d++) px(P(X + 0.01, 10.8 - d * 0.4, 22.8), ['#ef4444', '#f2b33d', '#3ddc84'][d], 1);
      qX(X + 0.005, 5.9, 11.0, 19.8, 22.3, '#111827');
      var prev = null;
      for (var i = 0; i <= 16; i++) {
        var y = 10.8 - i * (4.7 / 16), v = 0.5 + 0.3 * Math.sin(i * 0.8 + t / 500) + 0.15 * Math.sin(i * 2.1 - t / 300);
        var q = P(X + 0.01, y, 20.0 + v * 2.0);
        if (prev) line(prev, q, '#3ddc84');
        prev = q;
      }
      qX(X + 0.005, 0.0, 5.5, 19.8, 22.3, '#111827');
      for (var b = 0; b < 6; b++) {
        var y0 = 5.2 - b * 0.85, hg = 0.4 + 1.6 * (0.5 + 0.5 * Math.sin(t / 700 + b * 1.3));
        qX(X + 0.01, y0 - 0.55, y0, 20.0, 20.0 + hg, '#5aa9ff');
      }
      for (var l = 0; l < 3; l++) {
        var len = 2 + ((Math.floor(t / 400) + l * 5) % 6);
        var zl = 19.15 - l * 0.55;
        if (st.screen === 'typing' && l === 2) { len = Math.min(10.5, st.typed * 10.5); qX(X + 0.01, 11.0 - len, 11.0, zl, zl + 0.3, '#f2b33d'); }
        else qX(X + 0.01, 11.0 - len, 11.0, zl, zl + 0.3, '#5b6b82');
      }
      glow(-16, 5.5, 20, 72, 'rgba(110,160,255,' + (0.09 * (st.glow === undefined ? 1 : st.glow)).toFixed(3) + ')');
    }

    var KEYP = pal('#3b4048');
    function drawKeyboard(paws) {
      extrude(rrect(-12.6, 0.3, -9.6, 11.3, 0.4), DESK_TOP, DESK_TOP + 0.35, METAL);
      var keys = [];
      for (var r = 0; r < 3; r++) for (var c = 0; c < 14; c++) keys.push([-12.1 + r * 0.9, 10.75 - c * 0.75]);
      keys.sort(function (a, b) { return a[0] + a[1] - b[0] - b[1]; });
      keys.forEach(function (k) {
        var hit = paws.some(function (p) { var r = p[3] || 0; return Math.abs(p[0] - k[0]) < 0.6 + r && Math.abs(p[1] - k[1]) < 0.55 + r; });
        var s = 0.31, sq = [[k[0] + s, k[1] + s], [k[0] - s, k[1] + s], [k[0] - s, k[1] - s], [k[0] + s, k[1] - s]];
        extrude(sq, DESK_TOP + 0.35, hit ? KB_TOP - 0.17 : KB_TOP, KEYP, hit ? '#f2b33d' : null);
      });
      extrude(rrect(-11.6, 12.7, -10.4, 13.8, 0.45), DESK_TOP, DESK_TOP + 0.4, METAL);
      px(P(-10.4, 13.25, DESK_TOP + 0.2), '#c93a3a', 1);
    }

    function drawMugSteam(t) {
      g.fillStyle = '#d9dde3';
      for (var w = 0; w < 2; w++) for (var k = 0; k < 9; k++) {
        var h = k / 9, flow = 0.5 + 0.5 * Math.sin(k * 0.9 - t / 240 + w * 2.4);
        g.globalAlpha = 0.35 * (1 - h) * Math.min(1, k / 2) * flow;
        if (g.globalAlpha < 0.03) continue;
        var sw = Math.sin(t / 650 + k * 0.5 + w * 1.8) * (0.2 + h);
        var q = P(-14.5 + sw * 0.6 + (w - 0.5) * 0.4, 14.2 - sw * 0.6, DESK_TOP + 2.0 + k * 0.55);
        g.fillRect(Math.round(q[0]), Math.round(q[1]), 1, 2);
      }
      g.globalAlpha = 1;
    }

    /* ================= Chat : modèle 3D (champ de distance + lancer de rayons) ================= */
    var D3 = 1 / Math.sqrt(3);
    var C_DK = STYLE.fur.map(hex2rgb);       // pelage principal
    var C_OR = STYLE.flecks.map(hex2rgb);    // mouchetures
    var C_CR = ['#4a3a2c', '#6e5845', '#937862', '#b59a80', '#cdb59a', '#e2ceb5'].map(hex2rgb);   // crème
    var C_PK = hex2rgb(STYLE.earInner);
    function hash3(x, y, z) { var h = Math.imul((x | 0) ^ 0x27d4eb2d, 0x165667b1) ^ Math.imul((y | 0) + 0x9e3779b9, 0x85ebca6b) ^ Math.imul((z | 0) + 0x632be5ab, 0xc2b2ae35); h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h ^= h >>> 12; return (h >>> 0) / 4294967296; }
    function vnoise(x, y, z) {
      var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
      var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
      function L(a, b, t) { return a + (b - a) * t; }
      return L(L(L(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u), L(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u), v),
               L(L(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u), L(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u), v), w);
    }
    function fbm(x, y, z) { return vnoise(x, y, z); }
    var LIGHT = (function () { var v = [-0.3, 0.55, 0.78], l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; })();
    var CURL_SIGN = -1;
    var ID_BODY = 0, ID_NECK = 1, ID_HEAD = 2, ID_CHEEK = 3, ID_MUZ = 4, ID_EAR = 5, ID_LEG = 6, ID_PAW = 7, ID_TAIL = 8;

    function prim(a, b, ra, rb, k, id, ex) {
      var p = { ax: a[0], ay: a[1], az: a[2], bx: b[0] - a[0], by: b[1] - a[1], bz: b[2] - a[2], ra: ra, rb: rb, k: k, id: id };
      p.bb = p.bx * p.bx + p.by * p.by + p.bz * p.bz;
      p.cx = a[0] + p.bx / 2; p.cy = a[1] + p.by / 2; p.cz = a[2] + p.bz / 2;
      p.R = Math.sqrt(p.bb) / 2 + Math.max(ra, rb) + k * 0.5 + 0.05;
      if (ex) for (var e in ex) p[e] = ex[e];
      return p;
    }
    function vadd(a, b, s) { return [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s]; }
    function vlen(a) { return Math.hypot(a[0], a[1], a[2]); }
    function vdot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
    var STD = { ax: 1, ay: 1, az: 1, bx: 1, by: 1, bz: 1, ra: 1, rb: 1, k: 1, id: 1, bb: 1, cx: 1, cy: 1, cz: 1, R: 1 };
    /* Rotation d'un point autour d'un axe (Rodrigues) */
    function rotAxis(p, C, u, th) {
      var vx = p[0] - C[0], vy = p[1] - C[1], vz = p[2] - C[2], c = Math.cos(th), s = Math.sin(th), d = (u[0] * vx + u[1] * vy + u[2] * vz) * (1 - c);
      return [C[0] + vx * c + (u[1] * vz - u[2] * vy) * s + u[0] * d, C[1] + vy * c + (u[2] * vx - u[0] * vz) * s + u[1] * d, C[2] + vz * c + (u[0] * vy - u[1] * vx) * s + u[2] * d];
    }

    /* Construit les primitives du chat à partir d'une pose */
    function buildCat(q, t) {
      var prims = [], info = { paws: [] };
      var cs = CURL_SIGN * q.curl * 1.25, seg = 1.0 * q.stretch;
      var cp = Math.cos(q.pitch), sp = Math.sin(q.pitch);
      var pts = [[0, 0, 0]], yaws = [], i;
      for (i = 0; i < 3; i++) {
        var yw = q.h + (i - 1) * cs; yaws.push(yw);
        var l = pts[i];
        pts.push([l[0] + Math.cos(yw) * cp * seg, l[1] + Math.sin(yw) * cp * seg, l[2] + sp * seg]);
      }
      var mx = 0, my = 0, mz = 0;
      pts.forEach(function (p) { mx += p[0]; my += p[1]; mz += p[2]; });
      mx /= 4; my /= 4; mz /= 4;
      var br = q.breath * 0.05 * Math.sin(t / 700);
      pts = pts.map(function (p) { return [q.x + p[0] - mx, q.y + p[1] - my, q.z + q.bodyZ + br + p[2] - mz]; });
      info.spine = pts; info.root = [q.x, q.y, q.z, q.h]; info.bodyUp = [0, 0, 1];

      /* Corps : 3 segments arrondis */
      var rs = [0.92 + br, 0.98 + br, 1.0 + br, 0.97 + br];
      for (i = 0; i < 3; i++) prims.push(prim(pts[i], pts[i + 1], rs[i], rs[i + 1], 0.5, ID_BODY, { s0: i * seg, len: seg, chest: i === 2, fx: Math.cos(yaws[i]), fy: Math.sin(yaws[i]) }));

      /* Tête */
      var yE = yaws[2] + cs * 0.9, yH = yE + q.headYaw, hp = q.headPitch;
      var fH = [Math.cos(yH) * Math.cos(hp), Math.sin(yH) * Math.cos(hp), Math.sin(hp)];
      var sH = [-Math.sin(yH), Math.cos(yH), 0];
      var upH = [-Math.cos(yH) * Math.sin(hp), -Math.sin(yH) * Math.sin(hp), Math.cos(hp)];
      var ch = pts[3], nd = [Math.cos(yE), Math.sin(yE), 0];
      var hc = [ch[0] + nd[0] * 1.2 + fH[0] * 0.15, ch[1] + nd[1] * 1.2 + fH[1] * 0.15, ch[2] + 0.95 + q.headLift];
      prims.push(prim(vadd(vadd(ch, nd, 0.3), [0, 0, 1], 0.2), hc, 0.72, 0.6, 0.35, ID_NECK, { fx: fH[0], fy: fH[1] }));
      prims.push(prim(hc, hc, 1.0, 1.0, 0.3, ID_HEAD));
      [-1, 1].forEach(function (s) {
        var c = vadd(vadd(vadd(hc, sH, s * 0.42), upH, -0.28), fH, 0.18);
        prims.push(prim(c, c, 0.66, 0.66, 0.25, ID_CHEEK));
      });
      var mz2 = vadd(vadd(hc, fH, 0.85), upH, -0.33);
      prims.push(prim(mz2, mz2, 0.38, 0.38, 0.2, ID_MUZ));
      var eb = q.earsBack;
      [-1, 1].forEach(function (s) {
        var base = vadd(vadd(vadd(hc, upH, 0.62), sH, s * 0.5), fH, -0.05);
        var tip = vadd(vadd(vadd(hc, upH, 1.5 - 0.45 * eb), sH, s * (0.76 + 0.3 * eb)), fH, -(0.15 + 0.5 * eb));
        prims.push(prim(base, tip, 0.38, 0.05, 0.1, ID_EAR));
      });
      info.head = hc; info.fH = fH; info.sH = sH; info.upH = upH;
      info.eyes = [-1, 1].map(function (s) { return vadd(vadd(vadd(hc, fH, 0.88), sH, s * 0.4), upH, 0.16); });
      info.nose = vadd(vadd(hc, fH, 1.2), upH, -0.14);
      info.mouth = vadd(vadd(hc, fH, 1.08), upH, -0.48);

      /* Pattes : cinématique inverse à 2 os */
      [[1, 1, 0.5 * Math.PI], [1, -1, 1.5 * Math.PI], [0, 1, 0], [0, -1, Math.PI]].forEach(function (lg) {
        var front = lg[0] === 1, s = lg[1];
        var bp = front ? pts[3] : pts[0], yw = front ? yaws[2] : yaws[0];
        var f = [Math.cos(yw), Math.sin(yw), 0], sv = [-Math.sin(yw), Math.cos(yw), 0];
        var J = vadd(vadd(vadd(bp, f, front ? -0.15 : 0.25), sv, s * (front ? 0.45 : 0.5)), [0, 0, 1], front ? -0.45 : -0.35);
        var reach = front ? q.frontReach : q.backReach, lift = front ? q.frontLift : q.backLift;
        var ph = q.walkPh + lg[2];
        var G = vadd([J[0], J[1], q.z + 0.32 + lift], f, reach + Math.sin(ph) * 0.75 * q.walk);
        G[2] += Math.max(0, Math.cos(ph)) * 0.6 * q.walk;
        var tk = front ? q.frontTuck : q.backTuck;
        var T0 = vadd([J[0], J[1], q.z + 0.3], f, front ? 0.75 : 0.95);
        var A = vadd(vadd(J, f, reach), [0, 0, 1], -(front ? q.frontDrop : q.backDrop));
        var T = [0, 1, 2].map(function (k) { var v = G[k] + (T0[k] - G[k]) * tk; return v + (A[k] - v) * q.air; });
        var a = front ? 1.0 : 1.1, b = front ? 1.0 : 1.15;
        var v = [T[0] - J[0], T[1] - J[1], T[2] - J[2]], d = vlen(v);
        if (d > a + b - 0.02) { T = vadd(J, v, (a + b - 0.02) / d); d = a + b - 0.02; v = [T[0] - J[0], T[1] - J[1], T[2] - J[2]]; }
        var knee = T;
        if (d > 0.05) {
          var vh = [v[0] / d, v[1] / d, v[2] / d], along = (a * a - b * b + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, a * a - along * along));
          var bend = front ? [-f[0], -f[1], 0] : [f[0], f[1], 0], bd = vadd(bend, vh, -vdot(bend, vh)), bl = vlen(bd) || 1;
          knee = vadd(vadd(J, vh, along), bd, hh / bl);
        }
        prims.push(prim(J, knee, front ? 0.32 : 0.44, front ? 0.27 : 0.3, 0.16, ID_LEG, { s0: 0, len: a, li: lg[2] }));
        prims.push(prim(knee, T, 0.25, 0.22, 0.1, ID_LEG, { s0: a, len: b, li: lg[2] }));
        prims.push(prim(T, T, 0.32, 0.32, 0.1, ID_PAW, { fx: f[0], fy: f[1] }));
        if (T[2] < q.z + 0.6 && q.air < 0.5) info.paws.push(T);
      });

      /* Roulade : tout le corps tourne autour de son axe ; la queue reste au sol */
      if (q.roll) {
        var C = [(pts[0][0] + pts[3][0]) / 2, (pts[0][1] + pts[3][1]) / 2, q.z + q.bodyZ], U = [Math.cos(q.h), Math.sin(q.h), 0];
        var rp = function (p) { return rotAxis(p, C, U, q.roll); }, rv = function (v) { return rotAxis(v, [0, 0, 0], U, q.roll); };
        prims = prims.map(function (p) {
          var A = rp([p.ax, p.ay, p.az]), B = rp([p.ax + p.bx, p.ay + p.by, p.az + p.bz]);
          if (A[2] < q.z + p.ra * 0.6) A[2] = q.z + p.ra * 0.6;
          if (B[2] < q.z + p.rb * 0.6) B[2] = q.z + p.rb * 0.6;
          var ex = {}; for (var k in p) if (STD[k] === undefined) ex[k] = p[k];
          return prim(A, B, p.ra, p.rb, p.k, p.id, ex);
        });
        info.spine = info.spine.map(rp); info.head = rp(info.head); info.eyes = info.eyes.map(rp);
        info.nose = rp(info.nose); info.mouth = rp(info.mouth); info.paws = info.paws.map(rp);
        info.fH = rv(info.fH); info.sH = rv(info.sH); info.upH = rv(info.upH);
        info.rollC = C; info.rollU = U; info.roll = q.roll; info.bodyUp = rv([0, 0, 1]);
      }

      /* Queue : chaîne de segments (balancement, enroulement) */
      var hip = pts[0], ty = yaws[0] + Math.PI, prev = [hip[0] - Math.cos(yaws[0]) * 0.85, hip[1] - Math.sin(yaws[0]) * 0.85, hip[2] + 0.15];
      var tr = [0.3, 0.3, 0.29, 0.28, 0.27, 0.25, 0.23, 0.2], L = 0;
      for (i = 0; i < 7; i++) {
        ty += -CURL_SIGN * q.tailWrap * 0.38 + Math.sin(t / 430 * q.swayF + i * 0.65) * 0.06 * i * q.sway / 4;
        var tp = (q.tailUp + i * q.tailCurl * 0.22) * (1 - q.tailWrap) + (-0.06) * q.tailWrap;
        var dir = [Math.cos(ty) * Math.cos(tp), Math.sin(ty) * Math.cos(tp), Math.sin(tp)];
        var nx2 = vadd(prev, dir, 0.48);
        if (nx2[2] < q.z + 0.3) nx2[2] = q.z + 0.3;
        prims.push(prim(prev, nx2, tr[i], tr[i + 1], i === 0 ? 0.3 : 0.1, ID_TAIL, { s0: L, len: 0.48, tip: i >= 5 }));
        L += 0.48; prev = nx2;
      }
      return { prims: prims, info: info, q: q };
    }

    /* ---- Évaluation du champ de distance ---- */
    var LIST = new Int32Array(64);
    function sdf(pr, n, x, y, z) {
      var d = 1e9;
      for (var i = 0; i < n; i++) {
        var p = pr[LIST[i]], ax = x - p.ax, ay = y - p.ay, az = z - p.az;
        var h = p.bb > 0 ? (ax * p.bx + ay * p.by + az * p.bz) / p.bb : 0;
        h = h < 0 ? 0 : h > 1 ? 1 : h;
        var dx = ax - p.bx * h, dy = ay - p.by * h, dz = az - p.bz * h;
        var di = Math.sqrt(dx * dx + dy * dy + dz * dz) - (p.ra + (p.rb - p.ra) * h);
        if (i === 0) d = di;
        else { var k = p.k, w = k - Math.abs(d - di); d = (d < di ? d : di) - (w > 0 ? w * w / (4 * k) : 0); }
      }
      return d;
    }
    function frac(v) { return v - Math.floor(v); }

    /* Couleur d'un point de surface : écaille de tortue (noir-brun marbré de caramel), liseré roux sur le nez */
    function surfColor(pr, n, x, y, z, nx, ny, nz, info, sx, sy) {
      var best = 1e9, bp = null, bh = 0, i;
      for (i = 0; i < n; i++) {
        var p = pr[LIST[i]], ax = x - p.ax, ay = y - p.ay, az = z - p.az;
        var h = p.bb > 0 ? (ax * p.bx + ay * p.by + az * p.bz) / p.bb : 0;
        h = h < 0 ? 0 : h > 1 ? 1 : h;
        var dx = ax - p.bx * h, dy = ay - p.by * h, dz = az - p.bz * h;
        var di = Math.sqrt(dx * dx + dy * dy + dz * dz) - (p.ra + (p.rb - p.ra) * h);
        if (di < best) { best = di; bp = p; bh = h; }
      }
      /* Coordonnées locales au chat : le motif suit l'animal */
      /* Coordonnées attachées à chaque partie du corps : les taches suivent tous les mouvements */
      var lx, ly, lz, dxh = x - info.head[0], dyh = y - info.head[1], dzh = z - info.head[2];
      if (bp.id === ID_HEAD || bp.id === ID_CHEEK || bp.id === ID_MUZ || bp.id === ID_EAR) {
        lx = dxh * info.fH[0] + dyh * info.fH[1] + dzh * info.fH[2];
        ly = dxh * info.sH[0] + dyh * info.sH[1] + dzh * info.sH[2];
        lz = dxh * info.upH[0] + dyh * info.upH[1] + dzh * info.upH[2] + 20;
      } else if (bp.id === ID_PAW) {
        lx = x - bp.ax; ly = y - bp.ay; lz = z - bp.az + 40;
      } else {
        /* Coordonnées cylindriques autour de l'axe du segment (le long + autour) */
        var bl = Math.sqrt(bp.bb) || 1, ux = bp.bx / bl, uy = bp.by / bl, uz = bp.bz / bl;
        var cx = bp.ax + bp.bx * bh, cy = bp.ay + bp.by * bh, cz = bp.az + bp.bz * bh, rx = x - cx, ry = y - cy, rz = z - cz;
        var up = info.bodyUp, ud = up[0] * ux + up[1] * uy + up[2] * uz;
        var ax = up[0] - ux * ud, ay = up[1] - uy * ud, az = up[2] - uz * ud, al = Math.hypot(ax, ay, az);
        if (al < 0.2) { ax = info.sH[0]; ay = info.sH[1]; az = info.sH[2]; al = 1; }
        ax /= al; ay /= al; az /= al;
        var sx2 = uy * az - uz * ay, sy2 = uz * ax - ux * az, sz2 = ux * ay - uy * ax;
        lx = (bp.s0 || 0) + bh * (bp.len || bl);
        ly = Math.atan2(rx * sx2 + ry * sy2 + rz * sz2, rx * ax + ry * ay + rz * az) * 1.1;
        lz = bp.id * 13 + (bp.li || 0) * 3;
      }
      var noise = fbm(lx * 1.6 + 3.1, ly * 1.6 + 7.3, lz * 1.6);
      var pix = hash3(Math.floor(lx * 4.5), Math.floor(ly * 4.5), Math.floor(lz * 4.5));
      var palt = C_DK, shift = 0;
      var fa = STYLE.flecksAmount;
      if (fa > 0 && noise > 1 - 0.22 * fa && pix > 0.35) palt = C_OR;           // petites taches
      else if (fa > 0 && noise > 1 - 0.38 * fa && pix > 0.72) palt = C_OR;      // mouchetures fines
      else if (fa > 0 && pix > 1 - 0.035 * fa) palt = C_OR;                     // poils clairs épars
      var up = nx * info.upH[0] + ny * info.upH[1] + nz * info.upH[2];
      var fw = nx * info.fH[0] + ny * info.fH[1] + nz * info.fH[2];
      switch (bp.id) {
        case ID_HEAD: case ID_MUZ: case ID_CHEEK:
          var sd = (x - info.head[0]) * info.sH[0] + (y - info.head[1]) * info.sH[1];
          if (fw > 0.3 && Math.abs(sd) < 0.13 && up > -0.3) palt = C_OR;          // liseré roux sur le nez
          if (bp.id === ID_MUZ && up < -0.4 && pix > 0.55) palt = C_OR;           // menton un peu plus clair
          break;
        case ID_EAR:
          if (bh > 0.6) palt = C_DK, shift = 1;
          if (fw > 0.35 && bh < 0.75) return C_PK.map(function (c) { return c * 0.9; });
          break;
        case ID_PAW:
          palt = C_DK;
          if (nx * bp.fx + ny * bp.fy > 0.1 && nz < 0.4 && pix > 0.45) palt = C_CR;  // doigts clairs mouchetés
          break;
        case ID_TAIL: if (bp.tip && bh > 0.4) palt = C_DK; break;
      }
      var lam = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
      var rim = 1 - Math.max(0, (nx + ny + nz) * D3);
      var v = 0.2 + 0.72 * (lam > 0 ? lam : 0) + 0.32 * rim * rim * rim + (hash3(Math.floor(lx * 9), Math.floor(ly * 9), Math.floor(lz * 9) + 7) - 0.5) * 0.06;   // + reflet de bord + texture de poil
      var idx = Math.min(5, Math.max(0, Math.floor(v * 6) - shift));
      return palt[idx];
    }

    /* ---- Rendu par lancer de rayons (caméra orthographique le long de (1,1,1)) ---- */
    var CW = 200, CHh = 150;
    var catCv = document.createElement('canvas'); catCv.width = CW; catCv.height = CHh;
    var catCtx = catCv.getContext('2d');
    var SB = new Float32Array(CW * CHh), MK = new Uint8Array(CW * CHh);

    function renderCat(cat) {
      var pr = cat.prims, n = pr.length, i;
      var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (i = 0; i < n; i++) {
        var s = P(pr[i].cx, pr[i].cy, pr[i].cz), r = pr[i].R * K * 1.2 + 2;
        if (s[0] - r < x0) x0 = s[0] - r; if (s[0] + r > x1) x1 = s[0] + r;
        if (s[1] - r < y0) y0 = s[1] - r; if (s[1] + r > y1) y1 = s[1] + r;
      }
      x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
      x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1));
      var w = Math.min(CW, x1 - x0), h = Math.min(CHh, y1 - y0);
      if (w <= 0 || h <= 0) return null;
      var img = catCtx.createImageData(w, h), data = img.data;
      MK.fill(0, 0, w * h);

      for (var py = 0; py < h; py++) {
        for (var qx = 0; qx < w; qx++) {
          var u = (x0 + qx + 0.5 - OX) / K, ww = (y0 + py + 0.5 - OY) / K;
          var ox = ww + u / 2, oy = ww - u / 2, m = 0, sMax = -1e9, sMin = 1e9;
          for (i = 0; i < n; i++) {
            var p = pr[i], cx = p.cx - ox, cy = p.cy - oy, cz = p.cz;
            var sc = (cx + cy + cz) * D3, d2 = cx * cx + cy * cy + cz * cz - sc * sc;
            if (d2 < p.R * p.R) { LIST[m++] = i; if (sc + p.R > sMax) sMax = sc + p.R; if (sc - p.R < sMin) sMin = sc - p.R; }
          }
          if (!m) continue;
          var st = sMax, hit = false, X = 0, Y = 0, Z = 0;
          for (var it = 0; it < 48; it++) {
            X = ox + st * D3; Y = oy + st * D3; Z = st * D3;
            var d = sdf(pr, m, X, Y, Z);
            if (d < 0.012) { hit = true; break; }
            st -= d * 0.92 + 0.002;
            if (st < sMin) break;
          }
          if (!hit) continue;
          var e = 0.03;
          var f0 = sdf(pr, m, X + e, Y - e, Z - e), f1 = sdf(pr, m, X - e, Y - e, Z + e);
          var f2 = sdf(pr, m, X - e, Y + e, Z - e), f3 = sdf(pr, m, X + e, Y + e, Z + e);
          var nx = f0 - f1 - f2 + f3, ny = -f0 - f1 + f2 + f3, nz = -f0 + f1 - f2 + f3, nl = Math.hypot(nx, ny, nz) || 1;
          var col = surfColor(pr, m, X, Y, Z, nx / nl, ny / nl, nz / nl, cat.info, x0 + qx, y0 + py);
          var o = (py * w + qx) * 4;
          data[o] = col[0]; data[o + 1] = col[1]; data[o + 2] = col[2]; data[o + 3] = 255;
          MK[py * w + qx] = 1; SB[py * w + qx] = st;
        }
      }
      /* Contour sombre d'un pixel */
      for (py = 0; py < h; py++) for (qx = 0; qx < w; qx++) {
        var k = py * w + qx;
        if (MK[k]) continue;
        if ((qx > 0 && MK[k - 1]) || (qx < w - 1 && MK[k + 1]) || (py > 0 && MK[k - w]) || (py < h - 1 && MK[k + w])) {
          var o2 = k * 4; data[o2] = 8; data[o2 + 1] = 5; data[o2 + 2] = 4; data[o2 + 3] = 110;
        }
      }
      catCtx.putImageData(img, 0, 0);
      ctx.drawImage(catCv, 0, 0, w, h, x0, y0, w, h);
      return { x0: x0, y0: y0, w: w, h: h };
    }

    /* Yeux, nez et bouche, dessinés seulement s'ils sont visibles (test de profondeur) */
    function drawFace(cat, bx) {
      if (!bx) return;
      function vis(p) {
        var s = P(p[0], p[1], p[2]), ix = Math.floor(s[0]), iy = Math.floor(s[1]);
        var lx = ix - bx.x0, ly = iy - bx.y0;
        if (lx < 0 || ly < 0 || lx >= bx.w || ly >= bx.h) return null;
        var k = ly * bx.w + lx;
        if (!MK[k]) return null;
        var u = (ix + 0.5 - OX) / K, ww = (iy + 0.5 - OY) / K, ox = ww + u / 2, oy = ww - u / 2;
        if (((p[0] - ox) + (p[1] - oy) + p[2]) * D3 < SB[k] - 0.3) return null;
        return [ix, iy];
      }
      var q = cat.q, inf = cat.info, E = Math.max(1, Math.round(K / 4));
      if (inf.fH[0] + inf.fH[1] + inf.fH[2] < -0.5) return;
      inf.eyes.forEach(function (e) {
        var v = vis(e); if (!v) return;
        if (q.eyes > 0.6) { ctx.fillStyle = STYLE.eyes; ctx.fillRect(v[0] - E + 1, v[1] - E, E, 2 * E); ctx.fillStyle = STYLE.pupil; ctx.fillRect(v[0] - E + 1 + (E > 1 ? 1 : 0), v[1] - E + (E > 1 ? 1 : E), Math.max(1, E - 1), E); }
        else if (q.eyes > 0.25) { ctx.fillStyle = STYLE.eyesHalf; ctx.fillRect(v[0] - E + 1, v[1], E, E); }
        else { ctx.fillStyle = STYLE.eyesShut; ctx.fillRect(v[0] - E, v[1], 2 * E, Math.max(1, E - 1)); }
      });
      var ns = vis(inf.nose); if (ns) { ctx.fillStyle = STYLE.nose; ctx.fillRect(ns[0], ns[1], E, E); }
      if (q.mouth > 0.3) {
        var mo = vis(inf.mouth);
        if (mo) { ctx.fillStyle = '#4a1418'; ctx.fillRect(mo[0] - E, mo[1] - E, 2 * E, E * (1 + Math.round(q.mouth))); ctx.fillStyle = '#e08e99'; ctx.fillRect(mo[0] - E, mo[1] + E * Math.round(q.mouth) - (E > 1 ? 1 : 0), E, E); }
      }
    }

    /* Ombre portée sur la surface sous le chat */
    var shCv = layer(), shCtx = shCv.getContext('2d');
    function surfAt(x, y) {
      if (x >= 4 && x <= 16 && y >= -20 && y <= -10) return RACK_TOP;
      if (x >= -12.6 && x <= -9.6 && y >= 0.3 && y <= 11.3) return KB_TOP;
      if (x >= -20 && x <= -8 && y >= -6 && y <= 18) return DESK_TOP;
      return 0;
    }
    function drawCatShadow(cat) {
      var pts = cat.info.spine.concat([cat.info.head]);
      shCtx.clearRect(0, 0, W, H);
      var save = g; g = shCtx;
      var hsum = 0;
      var n = 0;
      pts.forEach(function (p) {
        var sz = surfAt(p[0], p[1]), hgt = Math.max(0, p[2] - sz - 1.0);
        if (hgt > 4.5) return;                         // trop haut : pas d'ombre projetée loin en dessous
        hsum += hgt; n++;
        flat(circle(p[0], p[1], Math.max(0.6, 1.45 - hgt * 0.1), 12), sz + 0.02, '#000');
      });
      if (!n) { g = save; return; }
      g = save;
      ctx.globalAlpha = Math.max(0.1, 0.32 - hsum / n * 0.05);
      ctx.drawImage(shCv, 0, 0);
      ctx.globalAlpha = 1;
    }

    /* "Z" qui s'envolent */
    function drawZzz(o, t, amt) {
      if (amt <= 0) return;
      for (var k = 0; k < 3; k++) {
        var life = (t / 1600 + k / 3) % 1, q = P(o[0] + life * 1.5, o[1] - life * 1.5, o[2] + 2.4 + life * 5.5);
        var c = (life > 0.5 ? 2 : 1) * Math.max(1, Math.round(K / 4)), x = Math.round(q[0]), y = Math.round(q[1]);
        ctx.globalAlpha = Math.min(1, Math.sin(life * Math.PI) * 1.3) * amt;
        ctx.fillStyle = '#cfd8ea';
        ctx.fillRect(x, y, 3 * c, c); ctx.fillRect(x + 2 * c, y + c, c, c); ctx.fillRect(x + c, y + 2 * c, c, c);
        ctx.fillRect(x, y + 3 * c, c, c); ctx.fillRect(x, y + 4 * c, 3 * c, c);
      }
      ctx.globalAlpha = 1;
    }

    /* ================= Poses du chat ================= */
    var BASE = { bodyZ: 2.35, pitch: 0, curl: 0, stretch: 1, headLift: 0.45, headPitch: 0, headYaw: 0,
      frontReach: 0, backReach: 0, frontLift: 0, backLift: 0, frontTuck: 0, backTuck: 0, air: 0, frontDrop: 1.6, backDrop: 1.6,
      tailUp: 1.1, tailCurl: 0.35, tailWrap: 0, sway: 1, swayF: 1, eyes: 1, mouth: 0, earsBack: 0, walk: 0, breath: 0, roll: 0 };
    function pose(o, from) { var r = {}, k; for (k in BASE) r[k] = (from || BASE)[k]; for (k in o) r[k] = o[k]; return r; }
    function mixP(a, b, t) { var r = {}; for (var k in BASE) r[k] = a[k] + (b[k] - a[k]) * t; return r; }

    var STAND = pose({});
    var WALK = pose({ walk: 1, headLift: 0.35 });
    var SLEEP = pose({ bodyZ: 0.95, curl: 1, headLift: -0.5, headPitch: -0.25, headYaw: 0.6, frontTuck: 1, backTuck: 1, tailUp: -0.1, tailCurl: 0, tailWrap: 1, sway: 0.25, swayF: 0.6, eyes: 0, breath: 1 });
    var AWAKE = pose({ curl: 0.8, headLift: 0.25, headPitch: 0.1, headYaw: 1.1, tailWrap: 0.9, sway: 0.5, eyes: 1 }, SLEEP);
    var YAWN = pose({ mouth: 1, eyes: 0, headPitch: 0.55, earsBack: 0.45 }, AWAKE);
    var LIE = pose({ bodyZ: 1.0, headLift: 0.45, frontTuck: 1, backTuck: 1, tailUp: -0.05, tailCurl: 0.05, tailWrap: 0.5, sway: 0.5, breath: 1 });
    var STRETCH = pose({ bodyZ: 1.8, pitch: -0.3, frontReach: 1.4, backReach: -0.3, headLift: 0.0, headPitch: 0.2, tailUp: 1.3, eyes: 0.3, mouth: 0.25 });
    /* Ramassé avant le saut : arrière-train bas, pattes repliées, queue basse */
    var CROUCH = pose({ bodyZ: 1.3, pitch: 0.05, headLift: 0.2, frontTuck: 0.45, backTuck: 0.75, tailUp: 0.05, tailCurl: 0.1, sway: 1.8, swayF: 2, earsBack: -0.1 });
    /* Saut : extension, regroupé, réception */
    var TAKEOFF = pose({ stretch: 1.28, air: 1, frontReach: 1.2, backReach: -1.6, frontDrop: 0.9, backDrop: 1.8, tailUp: 0.05, tailCurl: 0, headLift: 0.4, earsBack: 0.35, sway: 0.2 });
    var TUCK = pose({ stretch: 0.96, air: 1, frontReach: 0.7, backReach: 0.15, frontDrop: 0.85, backDrop: 0.8, tailUp: 0.35, tailCurl: 0.15, headLift: 0.35, earsBack: 0.25, sway: 0.2 });
    var REACH = pose({ stretch: 1.08, air: 1, frontReach: 0.8, backReach: -0.35, frontDrop: 1.75, backDrop: 1.0, tailUp: 0.6, headLift: 0.3, sway: 0.3 });
    var LANDING = pose({ bodyZ: 1.35, stretch: 0.92, frontReach: 0.25, backTuck: 0.4, frontTuck: 0.2, headLift: 0.15, tailUp: 0.4 });
    /* Sur le dos : tête au niveau du corps, oreilles couchées, pattes repliées en l'air */
    var BELLY = pose({ bodyZ: 1.0, air: 1, frontReach: 0.35, backReach: 0.25, frontDrop: 1.0, backDrop: 1.1, headLift: -0.85, headPitch: 0.3, earsBack: 1, tailUp: -0.05, tailCurl: 0, tailWrap: 0.3, sway: 1.6, swayF: 1.5 });
    var SIT = pose({ bodyZ: 1.6, pitch: 0.85, headLift: 0.15, frontReach: 0.3, backTuck: 1, tailUp: -0.1, tailCurl: 0, tailWrap: 0.7, sway: 0.4 });

    /* ================= Scénarios : bannière ≈ 23,5 s, avatar 8 s ================= */
    function ss(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
    function eio(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function eo(t) { return 1 - Math.pow(1 - t, 3); }
    function tri(t) { return Math.sin(Math.max(0, Math.min(1, t)) * Math.PI); }
    function angLerp(a, b, t) { var d = ((b - a) % 6.2832 + 9.4248) % 6.2832 - 3.1416; return a + d * t; }
    function dist(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]); }

    var RC = [10, -15], RE = [10, -12.4], FL = [9.6, -3.2], FC = [6, 4], FD = [-3.8, 5.2];
    var DL = [-11.0, 3.4], KM = [-11.0, 6.0], RL = [8.8, -13.4];
    var H_DESK = Math.atan2(DL[1] - FD[1], DL[0] - FD[0]);
    var H_RACK = Math.atan2(RL[1] - KM[1], RL[0] - KM[0]);
    var PI2 = Math.PI / 2;

    function at(q, x, y, z, h, wp) { q.x = x; q.y = y; q.z = z; q.h = h; q.walkPh = wp || 0; return q; }

    /* Saut balistique de S à E : poussée, regroupé en l'air, pattes avant tendues à la réception */
    function leap(S, Sz, E, Ez, p) {
      var dz = Ez - Sz, d = dist(S, E), a = Math.max((Math.abs(dz) + 2) / 4, d * 0.12);
      var z = Sz + dz * p + 4 * a * p * (1 - p), vz = dz + 4 * a * (1 - 2 * p);
      var q;
      if (p < 0.12) q = mixP(CROUCH, TAKEOFF, eo(p / 0.12));
      else if (p < 0.3) q = mixP(TAKEOFF, TUCK, eio((p - 0.12) / 0.18));
      else if (p < 0.6) q = pose({}, TUCK);
      else q = mixP(TUCK, REACH, eio((p - 0.6) / 0.4));
      q.pitch = Math.max(-0.75, Math.min(0.75, Math.atan2(vz, d))) * 0.9;
      return at(q, S[0] + (E[0] - S[0]) * p, S[1] + (E[1] - S[1]) * p, z, Math.atan2(E[1] - S[1], E[0] - S[0]));
    }
    /* Réception : écrasement rapide puis redressement */
    function land(p) { return p < 0.2 ? mixP(REACH, LANDING, eo(p / 0.2)) : mixP(LANDING, STAND, eio((p - 0.2) / 0.8)); }
    function wiggle(q, ms, amt) { q.x += -Math.sin(q.h) * Math.sin(ms * 0.03) * 0.08 * amt; q.y += Math.cos(q.h) * Math.sin(ms * 0.03) * 0.08 * amt; return q; }
    function bez(a, c, b, t) { var u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]; }

    var OFF = { power: 0, screen: 'off' };
    function off(r) { r.power = 0; r.screen = 'off'; return r; }

    var PH_BANNER = [
      [3500, function (p, ms) {                                       // dort, le serveur redémarre
        var q = at(pose({ earsBack: 0.5 * tri((ms - 2300) / 300) }, SLEEP), RC[0], RC[1], RACK_TOP, PI2);
        return { q: q, power: ss(0, 2000, ms), screen: ms < 600 ? 'off' : ms < 1700 ? 'boot' : 'dash', glow: ss(1700, 2400, ms), zzz: Math.min(1, ms / 500) };
      }],
      [1000, function (p) {                                           // se réveille, lève la tête
        var q = mixP(SLEEP, AWAKE, eio(p));
        q.eyes = p < 0.35 ? 0 : (p > 0.72 && p < 0.8) ? 0 : ss(0.35, 0.5, p);
        return { q: at(q, RC[0], RC[1], RACK_TOP, PI2), zzz: Math.max(0, 1 - p * 3) };
      }],
      [1000, function (p) { return { q: at(mixP(AWAKE, YAWN, tri(p)), RC[0], RC[1], RACK_TOP, PI2) }; }],     // bâille
      [800, function (p) { return { q: at(mixP(AWAKE, STAND, eio(p)), RC[0], RC[1], RACK_TOP, PI2) }; }],      // se lève
      [1200, function (p) {                                           // s'étire
        var k = p < 0.35 ? eio(p / 0.35) : p < 0.6 ? 1 : 1 - eio((p - 0.6) / 0.4);
        return { q: at(mixP(STAND, STRETCH, k), RC[0], RC[1] + 0.4 * k, RACK_TOP, PI2) };
      }],
      [700, function (p) {                                            // marche jusqu'au bord
        var y = RC[1] + (RE[1] - RC[1]) * eio(p);
        return { q: at(pose({}, WALK), RC[0], y, RACK_TOP, PI2, (y - RC[1]) * 2.6) };
      }],
      [600, function (p, ms) {                                        // regarde en bas, se ramasse
        var q = mixP(STAND, CROUCH, eio(Math.min(1, p * 1.6)));
        q.headPitch = -0.5 * ss(0, 0.4, p); q.headLift = 0.2 + 0.2 * ss(0, 0.4, p);
        return { q: wiggle(at(q, RE[0], RE[1], RACK_TOP, PI2), ms, ss(0.45, 0.8, p)) };
      }],
      [420, function (p) { return { q: leap(RE, RACK_TOP, FL, 0, p) }; }],          // saute au sol
      [420, function (p) { return { q: at(land(p), FL[0], FL[1], 0, Math.atan2(FL[1] - RE[1], FL[0] - RE[0])) }; }],
      [1800, function (p) {                                           // traverse la pièce
        var t = eio(p), pos = bez(FL, FC, FD, t), nx = bez(FL, FC, FD, Math.min(1, t + 0.02)), pv = bez(FL, FC, FD, Math.max(0, t - 0.02));
        var h = Math.atan2(nx[1] - pv[1], nx[0] - pv[0]);
        h = angLerp(Math.atan2(FL[1] - RE[1], FL[0] - RE[0]), h, ss(0, 0.15, p));
        return { q: at(pose({}, WALK), pos[0], pos[1], 0, h, t * 18 * 2.6) };
      }],
      [600, function (p) {                                            // lève la tête vers le bureau
        var q = pose({ headPitch: 0.6 * ss(0, 0.5, p), headLift: 0.45 + 0.25 * ss(0, 0.5, p), sway: 1.6, swayF: 1.8 });
        return { q: at(q, FD[0], FD[1], 0, angLerp(Math.atan2(FD[1] - FC[1], FD[0] - FC[0]), H_DESK, eio(p))) };
      }],
      [550, function (p, ms) {                                        // se ramasse
        var q = mixP(STAND, CROUCH, eio(Math.min(1, p * 1.5)));
        q.headPitch = 0.6 - 0.15 * p; q.headLift = 0.45;
        return { q: wiggle(at(q, FD[0], FD[1], 0, H_DESK), ms, ss(0.4, 0.75, p)) };
      }],
      [470, function (p) { return { q: leap(FD, 0, DL, KB_TOP, p) }; }],            // saute sur le bureau
      [420, function (p) { return { q: at(land(p), DL[0], DL[1], KB_TOP, H_DESK) }; }],
      [500, function (p, ms) {                                        // se tourne sur le clavier
        return { q: at(pose({ walk: 0.6 * tri(p) }), DL[0], DL[1], KB_TOP, angLerp(H_DESK, PI2, eio(p)), ms * 0.014) };
      }],
      [500, function (p) {                                            // se couche sur le clavier
        var t = eio(p);
        return { q: at(mixP(STAND, LIE, t), DL[0], DL[1] + (KM[1] - DL[1]) * t, KB_TOP, PI2, p * 4), screen: 'typing', typed: p * 0.15 };
      }],
      [2400, function (p, ms) {                                       // se roule sur le dos, gigote, finit la roulade
        var q, roll;
        if (p < 0.25) { var k = eio(p / 0.25); q = mixP(LIE, BELLY, k); roll = Math.PI * k; }
        else if (p < 0.75) {
          q = pose({}, BELLY);
          roll = Math.PI + 0.35 * Math.sin(ms * 0.011);
          q.frontDrop = 1.05 + 0.4 * Math.sin(ms * 0.017); q.backDrop = 1.15 + 0.4 * Math.sin(ms * 0.017 + Math.PI);
          q.frontReach = 0.35 + 0.25 * Math.sin(ms * 0.013); q.headYaw = 0.3 * Math.sin(ms * 0.008);
        } else { var k2 = eio((p - 0.75) / 0.25); q = mixP(BELLY, LIE, k2); roll = Math.PI * (1 + k2); }
        q.roll = roll;
        return { q: at(q, KM[0], KM[1], KB_TOP, PI2), power: 1 - ss(0.5, 0.95, p), halting: p > 0.5,
                 screen: p < 0.55 ? 'typing' : p < 0.85 ? 'halt' : 'off', typed: 0.15 + 0.85 * Math.min(1, p / 0.55) };
      }],
      [600, function (p) { return off({ q: at(mixP(LIE, STAND, eio(p)), KM[0], KM[1], KB_TOP, PI2) }); }],   // se relève
      [1200, function (p) {                                           // s'assoit, fier de lui
        var q = mixP(STAND, SIT, eio(Math.min(1, p / 0.4)));
        if (p > 0.7 && p < 0.77) q.eyes = 0;
        return off({ q: at(q, KM[0], KM[1], KB_TOP, angLerp(PI2, Math.PI / 4, eio(Math.min(1, p / 0.4)))) });
      }],
      [700, function (p, ms) {                                        // se prépare à sauter
        var q = p < 0.4 ? mixP(SIT, STAND, eio(p / 0.4)) : mixP(STAND, CROUCH, eo((p - 0.4) / 0.6));
        q.headPitch = -0.1;
        return off({ q: wiggle(at(q, KM[0], KM[1], KB_TOP, angLerp(Math.PI / 4, H_RACK, eio(Math.min(1, p / 0.5)))), ms, ss(0.55, 0.9, p)) });
      }],
      [560, function (p) { return off({ q: leap(KM, KB_TOP, RL, RACK_TOP, p) }); }],                        // retour sur la baie
      [420, function (p) { return off({ q: at(land(p), RL[0], RL[1], RACK_TOP, H_RACK) }); }],
      [1200, function (p) {                                           // tourne en rond avant de se coucher
        var t = eio(p), th0 = Math.atan2(RL[1] - RC[1], RL[0] - RC[0]), th = th0 - t * (th0 + Math.PI), r = 2.0 - 1.3 * t;
        var h = angLerp(H_RACK, th - PI2, ss(0, 0.2, p));
        return off({ q: at(pose({}, WALK), RC[0] + r * Math.cos(th), RC[1] + r * Math.sin(th), RACK_TOP, h, t * 7 * 2.6) });
      }],
      [800, function (p) {                                            // se couche
        var t = eio(p);
        return off({ q: at(mixP(STAND, LIE, t), RC[0] - 0.7 * (1 - t), RC[1], RACK_TOP, PI2) });
      }],
      [1100, function (p) {                                           // s'enroule et s'endort
        var q = mixP(LIE, SLEEP, eio(p));
        q.eyes = 1 - ss(0.3, 0.8, p);
        var r = off({ q: at(q, RC[0], RC[1], RACK_TOP, PI2) }); r.zzz = ss(0.85, 1, p); return r;
      }]
    ];
    /* Avatar : dort, se réveille, lent clignement vers la caméra, bâille, se rendort (≈ 8 s) */
    var LOOK = pose({ curl: 0.75, headLift: 0.35, headPitch: 0.18, headYaw: 1.45, tailWrap: 0.9, sway: 0.6, eyes: 1 }, SLEEP);
    var YAWN2 = pose({ mouth: 1, eyes: 0, headPitch: 0.55, earsBack: 0.45 }, LOOK);
    function sp(q) { return at(q, RC[0], RC[1], RACK_TOP, PI2); }
    var PH_AVATAR = [
      [3000, function (p, ms) { return { q: sp(pose({ earsBack: 0.5 * tri((ms - 1800) / 280) }, SLEEP)), zzz: 1 }; }],
      [900, function (p) { var q = mixP(SLEEP, LOOK, eio(p)); q.eyes = ss(0.45, 0.75, p); return { q: sp(q), zzz: Math.max(0, 1 - p * 3) }; }],
      [1500, function (p, ms) {
        var q = pose({ headYaw: 1.45 + 0.12 * Math.sin(ms / 400) }, LOOK);
        if (p > 0.4 && p < 0.72) q.eyes = 0.3 + 0.7 * Math.abs((p - 0.56) / 0.16);   // lent clignement
        return { q: sp(q) };
      }],
      [900, function (p) { return { q: sp(mixP(LOOK, YAWN2, tri(p))) }; }],
      [600, function (p) { var q = pose({}, LOOK); if (p > 0.4 && p < 0.55) q.eyes = 0; return { q: sp(q) }; }],
      [1100, function (p) { var q = mixP(LOOK, SLEEP, eio(p)); q.eyes = 1 - ss(0.1, 0.55, p); return { q: sp(q), zzz: ss(0.8, 1, p) }; }]
    ];
    var PH = opt.scenario === 'avatar' ? PH_AVATAR : PH_BANNER;
    var TOTAL = PH.reduce(function (s, p) { return s + p[0]; }, 0);

    function stateAt(ms) {
      var t = ((ms % TOTAL) + TOTAL) % TOTAL, i = 0;
      while (t >= PH[i][0]) { t -= PH[i][0]; i++; }
      var r = PH[i][1](t / PH[i][0], t);
      if (r.power === undefined) r.power = 1;
      if (r.screen === undefined) r.screen = 'dash';
      if (r.zzz === undefined) r.zzz = 0;
      r.t = ms;
      return r;
    }

    /* ================= Assemblage ================= */
    var bg = layer(), glass = layer(), vig = layer(), fg = layer();
    g = bg.getContext('2d'); drawRoom(); drawDesk(); drawRack(); drawPlant();
    g = fg.getContext('2d'); drawChair();
    g = glass.getContext('2d'); drawGlass();
    g = vig.getContext('2d'); drawVignette();
    g = ctx;

    function frame(ms) {
      var st = stateAt(ms), cat = buildCat(st.q, ms);
      g = ctx;
      ctx.drawImage(bg, 0, 0);
      drawSky(ms);
      drawLeds(st);
      ctx.drawImage(glass, 0, 0);
      drawMonitor(st);
      var contacts = [];
      if (Math.abs(st.q.z - KB_TOP) < 0.1) {
        contacts = cat.info.paws.slice();
        if (st.q.bodyZ < 1.4) cat.info.spine.forEach(function (p) { contacts.push([p[0], p[1], 0, 0.55]); });
      }
      drawKeyboard(contacts);
      drawMugSteam(ms);
      drawCatShadow(cat);
      drawFace(cat, renderCat(cat));
      drawZzz(cat.info.head, ms, st.zzz);
      ctx.drawImage(fg, 0, 0);
      ctx.drawImage(vig, 0, 0);
    }

    /* ================= Lecture ================= */
    var running = false;
    function start() {
      if (running) return; running = true;
      var visible = true, clock = 0, last = null;
      if (typeof IntersectionObserver !== 'undefined') new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(cv);
      function loop(now) {
        if (last === null) last = now;
        var dt = Math.min(100, now - last); last = now;
        if (visible && !document.hidden) { clock += dt; frame(clock); }
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    }

    var api = { frame: frame, duration: TOTAL, start: start, canvas: cv };
    if (opt.autoplay !== false) {
      var reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) frame(opt.stillAt); else start();
    }
    return api;
  }

  root.CatScene = { create: createScene, presets: PRESETS, style: CAT_STYLE };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.CatScene;
})(typeof window !== 'undefined' ? window : globalThis);
