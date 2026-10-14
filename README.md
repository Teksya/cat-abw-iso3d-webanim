# cat-banner

Ma chatonne écaille de tortue en pixel art isométrique 3D : une **bannière** animée (elle dort sur la baie serveur, se réveille, se roule sur le clavier et éteint tout) et un **avatar** assorti (gros plan, lent clignement d'yeux).

Tout tourne dans le navigateur avec un seul fichier JavaScript, sans dépendance. Un script Node permet d'exporter les animations en GIF (Discord, GitHub, etc.).

| Bannière | Avatar |
|---|---|
| ![Bannière](exports/banniere.gif) | ![Avatar](exports/avatar.gif) |
| ![Bannière Halloween](exports/banniere-halloween.gif) | ![Avatar Halloween](exports/avatar-halloween.gif) |
| ![Bannière Noël](exports/banniere-noel.gif) | ![Avatar Noël](exports/avatar-noel.gif) |

Démo des thèmes : `index.html?theme=halloween` ou `index.html?theme=noel`.

## Structure

```
cat-banner/
├── index.html          # démo : bannière + avatar en rond (style profil Discord)
├── src/
│   └── cat-scene.js    # le moteur complet (décor, chatonne 3D, animations)
├── tools/
│   └── export.js       # export GIF / PNG
├── exports/            # GIF et PNG générés
└── package.json
```

## Voir la démo

Ouvrir `index.html` dans un navigateur, ou servir le dossier :

```bash
npx serve .
```

## Utiliser dans une page

```html
<div class="cat-banner"><canvas id="banner"></canvas></div>

<script src="src/cat-scene.js"></script>
<script>
  CatScene.create(document.getElementById('banner'), { preset: 'banner' });
</script>
```

Le CSS de la bannière (pleine largeur, ratio 3:1, pixels nets) est dans `index.html`.

### Options de `CatScene.create(canvas, options)`

| Option | Rôle |
|---|---|
| `preset` | `'banner'` (960×320, scénario de 23,5 s) ou `'avatar'` (256×256, 8 s) |
| `quality` | `'hd'` par défaut, ou `'standard'` (deux fois moins de pixels, beaucoup plus léger à animer en direct) |
| `autoplay` | `false` pour ne pas lancer l'animation (utile pour l'export) |
| `theme` | `'halloween'` : citrouilles, bougie, toiles d'araignée, guirlandes, chauves-souris, fantôme, lune orange, chapeau de sorcière. `'noel'` : sapin illuminé avec étoile, cadeaux, chaussettes, guirlandes, neige derrière la fenêtre, bougie, bonnet de père Noël |
| `cat` | surcharge l'apparence, par exemple `{ eyes: '#e0b040', flecksAmount: 0, hat: true }` |
| `width`, `height`, `K`, `OX`, `OY` | taille du canvas, zoom et cadrage (avancé) |

`create` renvoie `{ frame(ms), start(), duration, canvas }`. `frame(ms)` dessine l'image à un instant donné de la boucle.

L'animation se met en pause quand elle n'est pas visible à l'écran et affiche une image fixe si le visiteur a activé la réduction des animations.

## Fond d'écran animé (Wallpaper Engine)

Le dossier `wallpaper/` est un fond d'écran web prêt à importer : un grand appartement en 16:9 où la chatonne vit sa vie (siestes sur la baie, le canapé, en haut de l'arbre à chat ou au soleil, gamelle, eau, toilette, fenêtre, griffes, carton, sprints, et de temps en temps le clavier qui coupe tout). Le jour et la nuit suivent l'heure réelle (ciel, soleil qui entre par la fenêtre, lumière de la pièce).

Import : Wallpaper Engine > *Créer un fond d'écran* > choisir `wallpaper/index.html` (ou copier le dossier dans `myprojects`). Après une modification de `src/cat-scene.js`, lancer `npm run build:wallpaper` pour mettre à jour la copie.

Météo réelle via [Open-Meteo](https://open-meteo.com) (gratuit, sans clé), mise à jour toutes les 20 minutes : pluie et gouttes sur la vitre, neige, orage avec éclairs, brouillard, ciel couvert. La ville et la météo (réelle ou forcée) se règlent dans Wallpaper Engine.

À la souris : un double-clic allume ou éteint le point laser (réglable : clic maintenu, ou mouvement rapide). Elle le poursuit, se ramasse à portée, remue l'arrière-train et bondit pour retomber les pattes sur le point. Le point marche aussi sur les meubles (canapé, bureau, baie, arbre à chat, banquette de fenêtre) : elle saute dessus pour le suivre et redescend quand il retombe au sol. Laser éteint, le survol de la chatonne la caresse : elle ferme à moitié les yeux et des cœurs apparaissent. L'entrée souris doit être activée dans Wallpaper Engine.

Dans une page : `CatScene.create(canvas, { preset: 'wallpaper' })`, puis `scene.setWeather('rain')` ou `scene.setWeather(codeWMO)`. Options utiles : `hour` (heure simulée), `timeScale` (accélère le temps), `script` (liste d'activités dans l'ordre, par exemple `['eat', 'window', 'box']`).

## Faire évoluer la chatonne

Tout se passe dans `src/cat-scene.js` :

- **Couleurs, yeux, mouchetures** : l'objet `CAT_STYLE` tout en haut (pelage, mouchetures, intérieur des oreilles, yeux, nez, quantité de mouchetures).
- **Proportions** (pour la faire grandir) : fonction `buildCat`, sections *Corps : 3 segments arrondis* (rayons `rs`, longueur `seg`), *Tête* (rayon de la tête, joues, museau, oreilles), *Pattes* (longueurs `a` et `b`, épaisseurs) et *Queue* (rayons `tr`, nombre de segments).
- **Poses** : section *Poses du chat* (`STAND`, `SLEEP`, `CROUCH`, `TAKEOFF`, `BELLY`, `SIT`...). Chaque pose est une liste de paramètres (hauteur du corps, courbure, position des pattes, queue, yeux, bouche, roulade...) et les animations passent de l'une à l'autre en douceur.
- **Scénarios** : `PH_BANNER` et `PH_AVATAR`, deux listes de `[durée en ms, fonction]`. Chaque fonction reçoit l'avancement de l'étape (0 à 1) et renvoie la pose, la position et l'état de la baie et de l'écran.
- **Décor** : `drawRoom`, `drawDesk`, `drawRack` (baie 12U), `drawChair`, `drawPlant`, `drawWindow`...
- **Thèmes** : Halloween (section *Halloween*, drapeau `HW`) et Noël (section *Noël*, drapeau `XM`). Chaque thème a une partie fixe (dessinée une fois) et une partie animée (redessinée à chaque image). Pour un nouveau thème, suivre le même modèle.

## Exporter en GIF

Nécessite Node.js 18 ou plus.

```bash
npm install
npm run export           # bannière + avatar en GIF, plus les PNG fixes
npm run export:banner    # exports/banniere.gif (960×320)
npm run export:avatar    # exports/avatar.gif (512×512)
npm run export:png       # exports/avatar.png et exports/banniere.png
npm run export:halloween # les mêmes fichiers en version Halloween (suffixe -halloween)
npm run export:noel      # version Noël (suffixe -noel)
```

Options : `node tools/export.js banner --fps=15 --scale=3`

`canvas` fournit des binaires précompilés pour la plupart des systèmes. Sinon, voir la [documentation de node-canvas](https://github.com/Automattic/node-canvas#compiling) pour les dépendances à installer.

## Comment ça marche

- **Décor** : formes extrudées en projection isométrique 2:1, remplies ligne par ligne pour garder des bords nets, ombrées selon leur orientation. Le décor fixe est dessiné une seule fois dans un calque, seuls les éléments animés (voyants, écran, clavier, vapeur, étoiles) sont redessinés.
- **Chatonne** : modèle 3D décrit par un champ de distance (capsules et sphères fusionnées en douceur), rendu par lancer de rayons à chaque image puis quantifié sur une palette. Les pattes utilisent une cinématique inverse à deux os, la queue est une chaîne de segments, et le motif du pelage est attaché à chaque partie du corps.
- **GIF** : palette commune sur toute la boucle, et seuls les pixels qui changent sont encodés d'une image à l'autre (d'où la petite taille).

## Idées pour la suite

- La faire grandir au fil des mois (proportions, taille, longueur du poil)
- Jouer avec un jouet, manger dans la gamelle, se percher sur la chaise
- Cycle jour / nuit, saisons dans la fenêtre
- Nouvelles scènes pour d'autres formats (bannière Twitch, fond d'écran)

## Licence

À choisir avant de publier (par exemple MIT).
