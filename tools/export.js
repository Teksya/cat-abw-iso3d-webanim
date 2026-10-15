#!/usr/bin/env node
/*
 * Export des animations en GIF / PNG (pour Discord, GitHub, etc.)
 *
 *   npm run export                 -> bannière + avatar (GIF) + avatar fixe (PNG)
 *   node tools/export.js banner    -> exports/banniere.gif
 *   node tools/export.js avatar    -> exports/avatar.gif
 *   node tools/export.js png       -> exports/avatar.png (+ exports/banniere.png)
 *
 *   node tools/export.js still portfolio --hour=14 --name=portfolio-jour
 *                                  -> exports/portfolio-jour.png (image fixe d'un préréglage, à l'instant stillAt)
 *   node tools/export.js posters portfolio --status=unknown
 *                                  -> affiches jour (14 h) et nuit (21 h), sans thème puis pour chaque thème :
 *                                     portfolio-jour.png, portfolio-halloween-nuit.png, portfolio-anniversaire-jour.png...
 *                                     et leur version légère en qualité standard (suffixe -sd)
 *   node tools/export.js posters network
 *                                  -> carte du trajet entière (network.png et network-sd.png), réponse en chemin du retour
 *
 * Options : --fps=20  --scale=1 (bannière) / 2 (avatar)  --theme=halloween|noel
 *   (avec un thème, les fichiers sont suffixés : banniere-halloween.gif, avatar-halloween.gif...)
 *   --hour=H : heure simulée pour les préréglages en direct (jour, nuit)
 *   --status=unknown : voyants de la baie éteints (aucun état inventé)
 *   --age=N : âge de la chatonne en mois (2 = modèle d'origine, 12 = adulte)
 *   --progress=P : avancement de la carte du trajet (0 à 1), --full : toute la carte au lieu de la fenêtre de caméra
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const { GIFEncoder, quantize } = require('gifenc');

/* Le moteur tourne dans le navigateur : on fournit juste de quoi créer des calques */
global.document = { createElement: () => createCanvas(1, 1), hidden: false };
const CatScene = require('../src/cat-scene.js');

const args = process.argv.slice(2);
const flag = (name, def) => { const a = args.find(x => x.startsWith('--' + name + '=')); return a ? Number(a.split('=')[1]) : def; };
const what = args.find(x => !x.startsWith('--')) || 'all';
const themeArg = args.find(x => x.startsWith('--theme='));
const THEME = themeArg ? themeArg.split('=')[1] : undefined;
const name = (base, ext) => base + (THEME ? '-' + THEME : '') + '.' + ext;
const OUT = path.join(__dirname, '..', 'exports');
fs.mkdirSync(OUT, { recursive: true });

const HOUR = flag('hour', undefined);
const AGE = flag('age', undefined);              // --age=N : âge de la chatonne en mois (proportions)
const nameArg = args.find(x => x.startsWith('--name='));
/* --status=unknown : tous les appareils sans donnée (voyants éteints), pour une affiche qui n'invente aucun état */
const STATUS = args.includes('--status=unknown') ? {} : undefined;
const PROGRESS = flag('progress', undefined);
const VIEW = args.includes('--full') ? 'full' : undefined;

function render(preset, scale, extra) {
  const src = createCanvas(1, 1);
  const scene = CatScene.create(src, Object.assign({ preset, autoplay: false, theme: THEME, hour: HOUR, status: STATUS, ageMonths: AGE, progress: PROGRESS, view: VIEW }, extra));
  const W = src.width * scale, H = src.height * scale;
  const out = createCanvas(W, H), o = out.getContext('2d');
  o.imageSmoothingEnabled = false;
  return {
    scene, W, H, out,
    grab(t) { scene.frame(t); o.drawImage(src, 0, 0, W, H); return o.getImageData(0, 0, W, H).data; }
  };
}

/* Conversion vers la palette, stable d'une image à l'autre : une couleur donne toujours le même index.
   (applyPalette de gifenc dépend du contenu de l'image, ce qui faisait clignoter les aplats.) */
function mapper(colors) {
  const cache = new Map();
  return function (data) {
    const n = data.length / 4, out = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], key = (r << 16) | (g << 8) | b;
      let v = cache.get(key);
      if (v === undefined) {
        let bd = Infinity;
        for (let j = 0; j < colors.length; j++) {
          const c = colors[j], dr = r - c[0], dg = g - c[1], db = b - c[2], d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
          if (d < bd) { bd = d; v = j; }
        }
        cache.set(key, v);
      }
      out[i] = v;
    }
    return out;
  };
}

function gif(preset, file, scale) {
  const fps = flag('fps', 20), r = render(preset, flag('scale', scale));
  const n = Math.round(r.scene.duration / 1000 * fps);
  /* Palette commune calculée sur quelques images réparties dans la boucle */
  const samples = [0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95].map(f => f * r.scene.duration);
  const big = new Uint8ClampedArray(r.W * r.H * 4 * samples.length);
  samples.forEach((t, i) => big.set(r.grab(t), i * r.W * r.H * 4));
  const colors = quantize(big, 255, { format: 'rgb565' });            // couleurs réelles
  const TR = colors.length;                                            // index réservé à la transparence
  const palette = colors.concat([[0, 0, 0]]);
  const toIndex = mapper(colors);
  const enc = GIFEncoder();
  let prev = null;
  for (let i = 0; i < n; i++) {
    const idx = toIndex(r.grab(i * 1000 / fps));                        // jamais l'index transparent
    let fr = idx;
    if (prev) { fr = new Uint8Array(idx); for (let k = 0; k < idx.length; k++) if (idx[k] === prev[k]) fr[k] = TR; } // seuls les pixels qui changent
    enc.writeFrame(fr, r.W, r.H, { palette: i === 0 ? palette : undefined, delay: Math.round(1000 / fps), transparent: i > 0, transparentIndex: TR, dispose: 1, repeat: 0 });
    prev = idx;
    if (i % Math.ceil(n / 10) === 0) process.stdout.write('\r' + file + ' ' + Math.round((i + 1) / n * 100) + ' %');
  }
  enc.finish();
  fs.writeFileSync(path.join(OUT, file), enc.bytes());
  console.log('\r' + file + ' : ' + r.W + 'x' + r.H + ', ' + n + ' images, ' + (enc.bytes().length / 1048576).toFixed(2) + ' Mo');
}

function png(preset, file, scale, extra) {
  const r = render(preset, flag('scale', scale), extra);
  r.grab(CatScene.presets[preset].stillAt);
  fs.writeFileSync(path.join(OUT, file), r.out.toBuffer('image/png'));
  console.log(file + ' : ' + r.W + 'x' + r.H);
}

if (what === 'banner' || what === 'all') gif('banner', name('banniere', 'gif'), 1);
if (what === 'avatar' || what === 'all') gif('avatar', name('avatar', 'gif'), 2);
if (what === 'png' || what === 'all') { png('avatar', name('avatar', 'png'), 2); png('banner', name('banniere', 'png'), 1); }
if (what === 'still') {
  const preset = args.filter(x => !x.startsWith('--'))[1] || 'banner';
  if (!CatScene.presets[preset]) throw new Error('Préréglage inconnu : ' + preset);
  png(preset, nameArg ? nameArg.split('=')[1] + '.png' : name(preset, 'png'), 1);
}
if (what === 'posters') {
  const preset = args.filter(x => !x.startsWith('--'))[1] || 'portfolio';
  if (!CatScene.presets[preset]) throw new Error('Préréglage inconnu : ' + preset);
  if (CatScene.presets[preset].scenario === 'network') {               // carte entière, l'enveloppe sur le chemin du retour
    const p = PROGRESS === undefined ? 0.62 : PROGRESS;
    png(preset, preset + '.png', 1, { view: 'full', progress: p });
    png(preset, preset + '-sd.png', 1, { view: 'full', progress: p, quality: 'standard' });
  } else [null, 'halloween', 'noel', 'anniversaire'].forEach(theme => {
    [['jour', 14], ['nuit', 21]].forEach(([moment, hour]) => {
      const base = preset + (theme ? '-' + theme : '') + '-' + moment;
      png(preset, base + '.png', 1, { theme: theme || undefined, hour });
      png(preset, base + '-sd.png', 1, { theme: theme || undefined, hour, quality: 'standard' });   // version légère (petits écrans)
    });
  });
}
