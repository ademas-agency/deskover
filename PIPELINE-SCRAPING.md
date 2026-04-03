# OuBosser — Pipeline de curation des lieux

> **Philosophie** : on ne veut pas un annuaire exhaustif. On veut les **5-10 meilleurs spots** par ville — ceux que les blogs recommandent, que les gens taguent sur Instagram/TikTok, et qui ont de bons avis Google. Qualité > quantité.

---

## Vue d'ensemble

```
Phase 1 — Découverte (automatisée)
├── Source A : Articles de blogs (Google Search → scrape → LLM extraction)
├── Source B : Google Maps (avis + ratings pour signaux "travail")
└── Résultat : liste brute de candidats par ville

Phase 2 — Enrichissement social (semi-manuelle)
├── Source C : Instagram (hashtags + pages lieux)
├── Source D : TikTok (recherche par ville)
└── Résultat : validation sociale + contenus à embedder

Phase 3 — Cross-référencement & scoring
├── Fusion des sources A + B + C + D
├── Scoring de pertinence
└── Résultat : top 5-10 lieux par ville/arrondissement

Phase 4 — Enrichissement final
├── Google Places API (horaires, photos, coordonnées)
└── Résultat : fiches complètes prêtes à publier
```

**Volume cible : ~600-1 200 lieux** pour ~120 entités (100 villes + 20 arrondissements Paris).

---

## Périmètre géographique

### Critères

- Top 100 villes françaises par population (seuil ≥ 50 000 habitants)
- 20 arrondissements de Paris traités comme des entités séparées
- **~120 entités au total**

### Catégories de lieux (4)

| Catégorie | `place_type` | Exemples |
|-----------|-------------|----------|
| Café | `cafe` | Cafés indépendants, chaînes (Starbucks, Columbus…) |
| Coffee shop | `coffee_shop` | Specialty coffee, brûleries avec espace |
| Coworking | `coworking` | Espaces partagés, bureaux flexibles |
| Tiers-lieu | `tiers_lieu` | Fablabs, espaces hybrides associatifs |

> **Pas de bibliothèques** dans cette V1.

---

## Phase 1 — Découverte via articles de blogs

### 1.1 Recherche d'articles

**Outil** : Serper.dev (2 500 requêtes gratuites à l'inscription) ou Google Custom Search (100/jour gratuit).

**5 requêtes par entité** (× 120 entités = 600 requêtes) :

```
1. "meilleurs cafés pour travailler {ville}"
2. "où télétravailler {ville}"
3. "café wifi coworking {ville}"
4. "coffee shop laptop friendly {ville}"
5. "coworking café {ville} blog"
```

Pour les arrondissements parisiens, remplacer `{ville}` par le quartier/arrondissement :
```
"meilleurs cafés pour travailler Paris 11"
"coffee shop Oberkampf Bastille"
```

**Params** : `gl=fr`, `hl=fr`, `num=10` → 10 résultats par requête → ~6 000 URLs d'articles bruts.

**Coût : $0** (free tier Serper.dev).

### 1.2 Extraction du contenu des articles

**Outil** : `trafilatura` (Python) ou `@extractus/article-extractor` (Node.js).

- Fetch HTML + extraction texte propre
- User-Agent Chrome récent pour éviter les 403
- Délai 1-2s entre requêtes
- Taux de succès attendu : ~70-80%
- Articles exploitables estimés : **~500-800**

### 1.3 Extraction des lieux par LLM

**Outil** : Claude Haiku (ou GPT-4o-mini) — ~$0.40 pour 500 articles.

**Prompt** :
```
Tu extrais les cafés, coffee shops et coworkings mentionnés dans cet article 
de blog français. Pour chaque lieu, retourne :
- name : nom exact tel qu'écrit
- address : adresse complète si mentionnée, sinon null
- city : ville
- arrondissement : arrondissement si Paris, sinon null
- description : 1 phrase résumant pourquoi c'est bien pour travailler
- category : "cafe" | "coffee_shop" | "coworking" | "tiers_lieu"
- signals : liste des signaux positifs mentionnés parmi 
  ["wifi", "prises", "calme", "grandes_tables", "laptop_friendly", "terrasse", "food"]

Règles :
- Uniquement les lieux recommandés POUR TRAVAILLER
- Ignorer les lieux mentionnés négativement
- Conserver l'orthographe exacte avec accents
- Ne PAS inventer d'adresse

Retourne un JSON array. Aucun commentaire.

Texte de l'article :
---
{article_text}
---
```

**Résultat attendu** : ~1 500-3 000 mentions brutes (beaucoup de doublons entre articles).

### 1.4 Déduplication des mentions

```
Même lieu si :
  - similarité_levenshtein(nom_normalisé_A, nom_normalisé_B) > 0.8
  - ET même ville (ou même arrondissement pour Paris)
```

Normalisation : lowercase, suppression accents, suppression de "le/la/l'/café/coffee shop".

**Résultat attendu** : ~800-1 500 lieux uniques candidats, avec un compteur `blog_mentions` par lieu.

---

## Phase 1bis — Signaux Google Maps

### 1bis.1 Recherche Google Places

Pour chaque lieu candidat extrait des blogs :

```
Google Places "Find Place" API :
  query: "{nom_lieu}" {ville}
  → place_id, coordinates, formatted_address, business_status
```

**Coût** : ~800-1 500 requêtes × $0.017 = **~$15-25** (couvert par le crédit gratuit Google Cloud $200/mois).

### 1bis.2 Récupération des avis Google

```
Google Places "Place Details" API :
  place_id → rating, user_ratings_total, reviews (5 max)
```

### 1bis.3 Analyse des avis par LLM

Pour chaque lot de 5 avis, extraction des signaux "travail" :

```
Prompt : "Dans ces avis Google, y a-t-il des mentions de : 
wifi, prises électriques, calme/bruit, travail sur ordinateur, tables spacieuses ?
Pour chaque critère mentionné, score de 1 à 5. Null si pas mentionné."
```

**Coût LLM** : ~$2-3 (Haiku, ~1 500 appels).

**Résultat** : chaque lieu a un `google_rating`, `google_reviews_count`, et des `google_work_signals` (wifi, prises, bruit, confort).

---

## Phase 2 — Enrichissement social (semi-manuel)

### Pourquoi semi-manuel ?

Instagram et TikTok n'offrent pas d'API gratuite pour rechercher du contenu tiers. Le scraping automatisé viole leurs ToS et présente des risques légaux. L'approche semi-manuelle est plus fiable et 100% légale.

### 2.1 Workflow par ville (~20-30 min par entité)

**Étape 1 — TikTok (signal le plus rapide)** :
- Rechercher : `"meilleur coffee shop {ville}"`, `"café télétravail {ville}"`, `"où travailler {ville}"`
- Regarder les 5-10 vidéos les plus vues
- Les créateurs listent souvent 3-5 cafés par vidéo
- **Noter** : noms des cafés mentionnés + URLs des meilleures vidéos

**Étape 2 — Instagram hashtags** :
- Rechercher les hashtags : `#coffeeshop{ville}`, `#coworking{ville}`, `#{ville}coffee`
- Parcourir les posts "Top" (pas "Récents")
- **Noter** : cafés qui apparaissent plusieurs fois, avec des gens qui travaillent

**Étape 3 — Vérification Instagram par lieu** :
- Pour chaque café candidat, chercher son compte Instagram
- Visiter sa page lieu Instagram (posts géotagués)
- Confirmer le côté "laptop-friendly" (photos de gens qui travaillent, prises visibles, mentions WiFi)
- **Noter** : handle Instagram + 2-3 URLs de posts à embedder

### 2.2 Hashtags de référence

**Hashtags génériques** :
- `#teletravailler` `#télétravail` `#teletravailcafe`
- `#cafepourteletravailler` `#travailleraucafe`
- `#nomadenumérique` `#digitalnomadsfrance` `#freelancefrance`
- `#bureaunomade` `#laptopfriendly` `#cafewifi`

**Hashtags par ville** (pattern à décliner) :
- `#coffeeshop{ville}` → ex: `#coffeeshoplyon`
- `#coworking{ville}` → ex: `#coworkingbordeaux`
- `#bonnesadresses{ville}` → ex: `#bonnesadressesnantes`
- `#{ville}coffee` → ex: `#lyoncoffee`

**Hashtags Paris par arrondissement** :
- `#paris11` `#paris3` `#lemarais` `#oberkampf` `#belleville`
- `#montmartre` `#saintgermain` `#bastille` `#republique`

### 2.3 Données collectées par lieu

| Champ | Source |
|-------|--------|
| `instagram_handle` | Recherche manuelle |
| `instagram_post_urls` | 2-3 posts sélectionnés (pour embed) |
| `tiktok_video_urls` | 1-2 vidéos (pour embed) |
| `social_mentions_count` | Nb de fois où le lieu apparaît dans les recherches |
| `social_vibe_tags` | Tags subjectifs : "cozy", "lumineux", "industriel", "calme"… |

### 2.4 Embed sur le site (légal et gratuit)

**Instagram** — oEmbed officiel (pas besoin d'API key) :
```html
<blockquote class="instagram-media" 
  data-instgrm-permalink="https://www.instagram.com/p/XXXXX/">
</blockquote>
<script async src="//www.instagram.com/embed.js"></script>
```

**TikTok** — oEmbed officiel (pas besoin d'API key) :
```html
<blockquote class="tiktok-embed" 
  cite="https://www.tiktok.com/@user/video/XXXXX">
</blockquote>
<script async src="https://www.tiktok.com/embed.js"></script>
```

> **Important** : ne PAS faire de screenshots d'Instagram/TikTok (violation copyright). Utiliser uniquement les embeds officiels.

---

## Phase 3 — Cross-référencement & scoring

### 3.1 Modèle de scoring

Chaque lieu candidat reçoit un **score de curation** basé sur ses apparitions dans les différentes sources :

```
curation_score = 
    blog_score      × 0.35
  + google_score    × 0.30
  + social_score    × 0.25
  + work_score      × 0.10
```

#### Blog score (0-5)

| Nb de mentions dans des articles différents | Score |
|---------------------------------------------|-------|
| 1 article | 1.0 |
| 2 articles | 2.5 |
| 3 articles | 3.5 |
| 4 articles | 4.0 |
| 5+ articles | 5.0 |

#### Google score (0-5)

```
google_score = (google_rating / 5) × 2.5 + min(google_reviews_count / 200, 1) × 2.5
```

Ex: un lieu noté 4.5/5 avec 300+ avis → (0.9 × 2.5) + (1 × 2.5) = 4.75

#### Social score (0-5)

| Critère | Points |
|---------|--------|
| Compte Instagram actif | +1.0 |
| Mentionné dans des vidéos TikTok | +1.5 |
| Posts Instagram géotagués montrant du travail | +1.5 |
| Hashtags pertinents (#laptopfriendly, etc.) | +1.0 |

#### Work score — signaux "travail" (0-5)

Moyenne des signaux extraits des avis Google + blogs :
- WiFi mentionné positivement : +1.25
- Prises mentionnées : +1.25
- Calme/bon pour travailler : +1.25
- Tables spacieuses / laptop friendly : +1.25

### 3.2 Sélection des top 10 par entité

```
Pour chaque ville/arrondissement :
  1. Trier les candidats par curation_score DESC
  2. Garder les 10 premiers (ou moins si < 10 candidats)
  3. Seuil minimum : curation_score ≥ 1.5 (au moins 1 source solide)
  4. Si < 3 lieux au-dessus du seuil → marquer la ville comme "couverture partielle"
```

### 3.3 Niveaux de confiance

| Nb de sources concordantes | Label | Affichage |
|---------------------------|-------|-----------|
| 1 source | `low` | "Recommandé (peu de données)" |
| 2 sources | `medium` | "Recommandé" |
| 3+ sources | `high` | "Très recommandé ⭐" |

---

## Phase 4 — Enrichissement final

Pour chaque lieu retenu dans le top 10 :

### 4.1 Google Places Details

```
place_id → opening_hours, formatted_phone_number, website, 
           photos (1 cover), geometry (lat/lng)
```

### 4.2 Normalisation adresse via BAN

```
api-adresse.data.gouv.fr/search/?q={adresse}
→ adresse normalisée, code INSEE, coordonnées vérifiées, city_slug
```

### 4.3 Données finales par lieu

| Champ | Source |
|-------|--------|
| `name`, `slug` | Google Places (vérifié) |
| `address`, `city`, `city_slug`, `postal_code` | BAN |
| `location` (lat/lng) | Google Places / BAN |
| `place_type` | LLM (blog extraction) |
| `opening_hours` | Google Places |
| `website`, `phone` | Google Places |
| `cover_photo_url` | Google Places (affichage dynamique) |
| `google_place_id` | Google Places |
| `google_rating`, `google_reviews_count` | Google Places |
| `score_wifi`, `score_power`, `score_noise`, `score_comfort` | LLM (avis Google) |
| `curation_score` | Cross-référencement |
| `confidence` | Nb de sources |
| `blog_mentions` | JSON array [{url, title, source_name}] |
| `instagram_handle` | Manuel |
| `instagram_post_urls` | Manuel (2-3 URLs) |
| `tiktok_video_urls` | Manuel (1-2 URLs) |
| `social_vibe_tags` | Manuel |

---

## Planning d'exécution

### Jour 1 — Phase 1 automatisée (~2h de travail actif)

| Tâche | Durée | Outil |
|-------|-------|-------|
| 600 recherches Serper.dev | ~10 min | `search-blogs.ts` |
| Scrape ~800 articles | ~30 min | `scrape-articles.ts` |
| Extraction LLM des lieux | ~20 min | `extract-places.ts` |
| Déduplication | ~5 min | `deduplicate.ts` |
| Google Find Place (matching) | ~15 min | `match-google.ts` |
| Google Place Details + avis | ~15 min | `enrich-google.ts` |
| Scoring LLM des avis | ~20 min | `score-reviews.ts` |
| Cross-référencement + ranking | ~5 min | `rank-places.ts` |
| Seed Supabase | ~5 min | `seed-db.ts` |

### Jours 2-7 — Phase 2 semi-manuelle (~25 min/ville)

| Tâche | Durée totale | Qui |
|-------|-------------|-----|
| 20 grandes villes + Paris (arrondissements) | ~15h | Fondateur |
| 40 villes moyennes | ~16h | Fondateur (ou VA) |
| 40 petites villes (50K+) | ~16h | Fondateur (ou VA) |
| Saisie dans l'admin / spreadsheet | inclus | — |

> Possibilité de paralléliser avec un VA (freelance Malt, ~15€/h).

### Jour 8 — Phase 3 + 4

| Tâche | Durée |
|-------|-------|
| Cross-référencement final (blog + social + Google) | ~1h |
| Enrichissement Google Places (top lieux) | ~30 min |
| Normalisation BAN | ~15 min |
| Seed final + vérification | ~1h |

---

## Budget total

| Poste | Coût |
|-------|------|
| Recherche articles (Serper.dev free tier) | $0 |
| Extraction LLM blogs (~500 articles, Haiku) | ~$0.40 |
| Google Find Place (~1 500 lieux) | ~$25 |
| Google Place Details (~800 lieux retenus) | ~$14 |
| Scoring LLM avis (~800 lieux, Haiku) | ~$3 |
| BAN géocodage | $0 |
| **Total** | **~$42** |

> Couvert intégralement par le crédit gratuit Google Cloud ($200/mois).

---

## Scripts à développer

| Script | Priorité | Input → Output |
|--------|----------|----------------|
| `search-blogs.ts` | P0 | 120 entités × 5 requêtes → URLs d'articles |
| `scrape-articles.ts` | P0 | URLs → texte propre |
| `extract-places.ts` | P0 | texte articles → lieux candidats JSON |
| `deduplicate.ts` | P0 | lieux bruts → lieux uniques avec `blog_mentions` |
| `match-google.ts` | P0 | lieux uniques → lieux avec `place_id` |
| `enrich-google.ts` | P0 | place_ids → horaires, avis, photos, coords |
| `score-reviews.ts` | P0 | avis Google → scores wifi/prises/bruit/confort |
| `rank-places.ts` | P0 | toutes les données → top 10 par ville |
| `seed-db.ts` | P0 | JSON final → INSERT Supabase |

---

## Enrichissement continu (post-lancement)

| Job | Fréquence | Méthode |
|-----|-----------|---------|
| Nouveaux articles de blogs | Mensuel | Re-run `search-blogs.ts` |
| Refresh avis Google | Mensuel | Re-run `enrich-google.ts` sur les lieux existants |
| Veille Instagram/TikTok | Hebdo | Check manuel des hashtags |
| Ajout de villes (< 50K) | Trimestriel | Étendre la liste des entités |
| Contributions utilisateurs | Continu | Remonte dans le scoring |

---

## Aspects légaux

| Source | Usage | Légalité |
|--------|-------|----------|
| Articles de blogs | Extraction de noms de lieux (pas de copie de contenu) | ✅ OK |
| Google Places API | Données structurées | ✅ OK (ToS respectées) |
| Google avis (texte) | Extraction de scores, texte non stocké | ⚠️ Zone grise (pas de stockage = OK) |
| Google photos | Affichage dynamique uniquement (URL) | ✅ OK ("Powered by Google") |
| Instagram | Embed officiel (oEmbed) uniquement | ✅ OK |
| TikTok | Embed officiel (oEmbed) uniquement | ✅ OK |
| Scraping Instagram/TikTok | — | ❌ INTERDIT (violation ToS + RGPD) |
| Screenshots Instagram/TikTok | — | ❌ INTERDIT (violation copyright) |
