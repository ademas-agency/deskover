# OuBosser — Direction Artistique "Specialty Coffee"

> La sophistication vient de la retenue, pas de l'accumulation.
> Un café bien fait n'a besoin que de bons grains, d'eau à la bonne température, et de précision.

---

## Concept

On entre dans un specialty coffee shop un mardi matin à 9h30. La lumière du soleil filtre à travers une verrière. Un comptoir en chêne clair. Des ampoules Edison. Une monstera qui déborde d'un pot en terre cuite. Au mur, un menu board en lattes de bois avec des lettres tamponnées. C'est exactement **ce moment-là** que l'app doit capturer.

### Traduction physique → digital

| Élément physique | Traduction UI |
|---|---|
| Mur blanc cassé | Background `#FAF7F2` — jamais du blanc pur |
| Lattes de bois horizontales | Lignes subtiles CSS (linear-gradient) sur les sections signature |
| Lettres tamponnées | Zilla Slab uppercase, letter-spacing 0.12em |
| Comptoir chêne clair | Cards en teinte `#E8DFD0` |
| Métal noir mat | Texte `#2C2825`, icônes |
| Plantes vertes | Accents couleur, indicateurs positifs |
| Terre cuite | Couleur primaire terracotta `#C4622A` |
| Ampoules Edison | Accents dorés `#D4A84B` |
| Grain papier kraft | Texture noise 3% en overlay CSS |

---

## Palette de couleurs

```js
// tailwind.config — extend colors
coffee: {
  cream:           '#FAF7F2',   // fond principal
  linen:           '#F3EDE4',   // fond secondaire
  parchment:       '#E8DFD0',   // surfaces élevées

  espresso:        '#2C2825',   // texte principal
  roast:           '#6B5B4E',   // texte secondaire
  steam:           '#A89888',   // texte tertiaire / placeholders

  terracotta:      '#C4622A',   // CTA principal (remplace #FF5200)
  terracottaLight: '#D4835A',   // hover
  terracottaDark:  '#A34E1F',   // pressed

  monstera:        '#5B7A5E',   // vert plante — scores hauts
  matcha:          '#8FA67A',   // vert clair — badges positifs
  edison:          '#D4A84B',   // doré — étoiles, highlights

  scoreHigh:       '#5B7A5E',   // scores 4-5 (monstera)
  scoreMid:        '#D4A84B',   // scores 2.5-3.9 (edison)
  scoreLow:        '#B85C3A',   // scores 0-2.4 (terracotta foncé)
}
```

**Pourquoi #C4622A remplace #FF5200** : l'orange digital pur crie "startup". Le terracotta est plus chaud, plus terreux, plus coffee shop. Contraste AA conforme sur fond crème (5.2:1).

---

## Typographie

### Fonts

| Rôle | Font | Usage |
|------|------|-------|
| Titres signature | **Zilla Slab** | Slab-serif, uppercase, letter-spacing large → feeling "tamponné" |
| Corps/UI | **Plus Jakarta Sans** | Géométrique douce, ultra-lisible |
| Scores/données | **JetBrains Mono** | Monospace, côté "data" coffee-menu |

### Échelle

```css
.text-display { /* hero, splash */
  font-family: 'Zilla Slab', serif;
  font-size: 2rem; font-weight: 600;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: #2C2825;
}
.text-h1 { /* titres page */
  font-family: 'Zilla Slab', serif;
  font-size: 1.5rem; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
}
.text-h2 { /* sous-titres */
  font-family: 'Zilla Slab', serif;
  font-size: 1.125rem; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.text-body { /* corps */
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9375rem; font-weight: 400;
  line-height: 1.6; color: #6B5B4E;
}
.text-score { /* données chiffrées */
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.25rem; font-weight: 500;
  letter-spacing: 0.05em;
}
```

---

## Animations & micro-interactions

### Lib : @vueuse/motion

### Easings signature

```css
:root {
  --ease-coffee: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-coffee-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-coffee-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 400ms;
  --duration-score: 800ms;
}
```

### Transitions entre pages

Fade + léger slide vertical (pas horizontal = trop générique).

```css
.page-coffee-enter-active { transition: opacity 300ms, transform 300ms; }
.page-coffee-leave-active { transition: opacity 200ms, transform 200ms; }
.page-coffee-enter-from { opacity: 0; transform: translateY(8px); }
.page-coffee-leave-to { opacity: 0; transform: translateY(-4px); }
```

### Cards — apparition au scroll

Fade-up staggeré : delay `index * 60ms`, max 300ms. Via `v-motion` + `visible-once`.

### Cards — hover

```css
.place-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(44,40,37,0.08);
}
.place-card:active {
  transform: translateY(0); transition-duration: 100ms;
}
```

### Scores — remplissage animé

Barres : `scaleX(0)` → `scaleX(1)` en 800ms. Chiffres : count-up 0 → valeur en 800ms (easeOutCubic).

### Contribution — micro-animation tap

1. Press : scale 0.95 (100ms)
2. Release : spring rebond 1.05 → 1.0 (300ms)
3. Burst : 3-4 particules terracotta qui fade out

### Bottom sheet — spring physics

`@vueuse/motion` spring : stiffness 300, damping 30, mass 0.8.

### Loading — shimmer "latte art"

```css
.skeleton-coffee {
  background: linear-gradient(90deg, #F3EDE4 0%, #FAF7F2 40%, #F3EDE4 80%);
  background-size: 200% 100%;
  animation: shimmer-latte 1.5s ease-in-out infinite;
}
```

### Splash — lettres qui tombent

"OÙ BOSSER" : chaque lettre apparaît avec delay 80ms, drop de -8px, spring.

---

## Textures & ambiance

### Grain papier kraft (3% opacité)

```css
body::before {
  content: ''; position: fixed; inset: 0; z-index: 9999;
  pointer-events: none; opacity: 0.03;
  background-image: url("data:image/svg+xml,...noise-svg...");
}
```

### Fond "lattes de bois" (sections signature uniquement)

```css
.wood-slat-bg {
  background-color: #F3EDE4;
  background-image: repeating-linear-gradient(
    0deg, transparent, transparent 47px,
    rgba(44,40,37,0.04) 47px, rgba(44,40,37,0.04) 48px
  );
}
```

### Photos des lieux

- Filtre : `brightness(1.02) saturate(0.92)` — légère désaturation warm
- Placeholder : `#E8DFD0`
- Radius : 12px

### Séparateurs

Pas de lignes. Trois points médians : `· · ·` en steam (#A89888), letter-spacing 1em.

---

## Le "Menu Board" — élément signature

Utilisé dans **3 endroits max** :

### 1. Header classement

```
┌────────────────────────────────┐
│  O Ù   B O S S E R            │ ← Zilla Slab 32px, 0.2em spacing
│  À   G R E N O B L E          │ ← 18px, steam
│  [🔍 Rechercher un lieu...]    │
└────────────────────────────────┘
  fond : .wood-slat-bg
```

### 2. Vitals fiche lieu

Scores en row horizontale sur fond lattes : chaque vital = score-badge (JetBrains Mono) + label (Zilla Slab 9px uppercase).

### 3. Splash screen

Lettres "OÙ BOSSER" qui apparaissent une par une (stagger 80ms).

**Ne PAS utiliser pour** : le classement entier, le fond de page, les modals.

---

## Composants clés

### Score badge (style tampon)

```css
.score-badge {
  padding: 8px 14px 6px; border-radius: 10px;
  background: #FAF7F2; border: 1.5px solid #E8DFD0;
}
.score-badge-value { /* JetBrains Mono, 20px, bold */ }
.score-badge-label { /* Zilla Slab, 9px, uppercase, 0.15em spacing, steam */ }
.score-badge--high { border-color: #5B7A5E; }
.score-badge--mid  { border-color: #D4A84B; }
.score-badge--low  { border-color: #B85C3A; }
```

### Chips filtres (style étiquette kraft)

```css
.chip { background: #F3EDE4; color: #6B5B4E; border-radius: 20px; }
.chip--active { background: #C4622A; color: #FAF7F2; }
```

### CTA (terracotta)

```css
.btn-primary { background: #C4622A; color: #FAF7F2; border-radius: 12px; }
.btn-primary:hover { background: #D4835A; box-shadow: 0 4px 12px rgba(196,98,42,0.25); }
```

### Input recherche

```css
.search-input { background: #F3EDE4; border: 2px solid transparent; border-radius: 14px; }
.search-input:focus { background: #FFFFFF; border-color: #E8DFD0; }
```

### Nav bar

Fond blanc, icônes Lucide outline, actif = terracotta + point 4px dessous.

---

## Design tokens (CSS variables)

```css
:root {
  --color-cream: #FAF7F2;
  --color-linen: #F3EDE4;
  --color-parchment: #E8DFD0;
  --color-espresso: #2C2825;
  --color-roast: #6B5B4E;
  --color-steam: #A89888;
  --color-terracotta: #C4622A;
  --color-terracotta-light: #D4835A;
  --color-terracotta-dark: #A34E1F;
  --color-monstera: #5B7A5E;
  --color-matcha: #8FA67A;
  --color-edison: #D4A84B;
  --font-display: 'Zilla Slab', serif;
  --font-body: 'Plus Jakarta Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px; --radius-xl: 20px;
  --shadow-sm: 0 1px 3px rgba(44,40,37,0.06), 0 4px 12px rgba(44,40,37,0.04);
  --shadow-md: 0 4px 8px rgba(44,40,37,0.08), 0 8px 24px rgba(44,40,37,0.06);
  --ease-coffee: cubic-bezier(0.25,0.46,0.45,0.94);
  --ease-coffee-spring: cubic-bezier(0.34,1.56,0.64,1);
}
```
