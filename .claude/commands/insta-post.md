L'utilisateur veut générer un ou plusieurs posts Instagram pour Deskover.

## Contexte

Deskover est un site/app pour trouver les meilleurs spots de télétravail (cafés, coworkings, bibliothèques). Le compte Instagram met en avant des lieux avec un ton éditorial authentique.

## Base de données

Les lieux sont dans `/Users/thomassalandre/deskover/scripts/data/enriched-places.json`. Chaque lieu a :
- `name`, `address`, `city`, `arrondissement`
- `description`, `signals` (wifi, prises, calme, food, etc.)
- `google_rating`, `google_reviews_count`
- `photo_url` (Google Places)
- `website`, `opening_hours`

## Charte graphique

- **Fond** : photo du lieu en full bleed, `brightness(0.75) saturate(0.9)`, gradient sombre en bas
- **Texture** : grain papier kraft 3% opacity
- **Couleurs** : terracotta `#AA4C4D`, crème `#FAF7F2`, espresso `#2C2825`, edison `#D4A84B`, monstera `#5B7A5E`
- **Fonts** : Anton (titres uppercase), Plus Jakarta Sans (body), JetBrains Mono (données)
- **Icônes vitals** : SVG Lucide (wifi, zap/prises, coffee/food, moon/calme) colorés en vert `#8FA67A` (good) ou doré `#D4A84B` (mid)
- **Layout** : 1080x1080, logo "DESKOVER" en haut à gauche, tag en haut à droite, nom du lieu en gros en bas, chips vitals, adresse + deskover.fr en footer

## Template et outils

- Le template HTML est dans `/Users/thomassalandre/deskover/instagram/generate-batch.py` (variable TEMPLATE + constantes ICONS)
- Export PNG via `/Users/thomassalandre/deskover/instagram/export-png.js` (Puppeteer)
- Les PNG sortent dans `/Users/thomassalandre/deskover/instagram/png/`

## Ton éditorial des captions

- Écris comme un Parisien qui partage ses spots à un pote, PAS comme une marque ou une IA
- Phrases courtes. Pas de tirets cadratins. Pas d'émojis. Accents corrects.
- Commence par une accroche concrète (un détail sensoriel, un chiffre, une observation)
- Inclus l'adresse complète et les horaires si disponibles
- Termine par des hashtags pertinents (15 max) : mix local (#cafeparis5) + thématique (#teletravailparis) + marque (#deskover)

## Instructions

$ARGUMENTS

1. Cherche le(s) lieu(x) demandé(s) dans `enriched-places.json`
2. Pour chaque lieu, crée le fichier HTML dans `/deskover/instagram/batch/` en utilisant le template du script Python
3. Lance `node /Users/thomassalandre/deskover/instagram/export-png.js` pour exporter en PNG
4. Écris la caption + hashtags
5. Montre le résultat (ouvre le PNG + affiche la caption)
