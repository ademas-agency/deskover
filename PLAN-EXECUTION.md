# OuBosser — Plan d'exécution produit complet

> "Trouve où bosser. Maintenant."
> Domaine : oubosser.fr

---

## Table des matières

1. [Vision & positionnement](#1-vision--positionnement)
2. [Personas](#2-personas)
3. [Roadmap produit](#3-roadmap-produit)
4. [Parcours utilisateurs](#4-parcours-utilisateurs)
5. [Architecture technique](#5-architecture-technique)
6. [Modèle de données](#6-modèle-de-données)
7. [Système de scoring](#7-système-de-scoring)
8. [Plan de développement](#8-plan-de-développement)
9. [Scraping & seed data](#9-scraping--seed-data)
10. [SEO — Architecture & contenu](#10-seo--architecture--contenu)
11. [Génération d'articles à grande échelle](#11-génération-darticles-à-grande-échelle)
12. [Marketing & Growth](#12-marketing--growth)
13. [Monétisation](#13-monétisation)
14. [Projections financières](#14-projections-financières)
15. [Data, qualité & analytics](#15-data-qualité--analytics)
16. [RGPD & conformité](#16-rgpd--conformité)
17. [Gamification & rétention](#17-gamification--rétention)
18. [Risques & mitigations](#18-risques--mitigations)
19. [KPIs par phase](#19-kpis-par-phase)
20. [Budget global](#20-budget-global)

---

## 1. Vision & positionnement

### Le problème

Quand un freelance cherche un endroit pour travailler, il ouvre Google Maps, lit 15 avis pour deviner si le WiFi marche, si c'est bruyant, s'il y a des prises. Il perd 10 minutes. Puis il arrive et c'est bondé.

Aujourd'hui, la seule alternative est de chercher sur Google un article de blog type "les 10 meilleurs cafés pour travailler à [ville]" — un article souvent daté, incomplet, et unique pour toute la ville. Cette frustration est universelle et non résolue.

### La solution

OuBosser est le **Waze des lieux de travail nomade**. Là où Google Maps dit "ce café est ouvert", OuBosser dit "ce café a du bon WiFi, des prises libres, et c'est calme" — en 3 secondes, sans lire un seul avis.

### Différenciation

| Principe | Google Maps / Yelp | OuBosser |
|---|---|---|
| **Données** | Avis texte libre | 4 critères structurés : WiFi, prises, bruit, confort |
| **Fraîcheur** | Avis de 2019 en tête | Score pondéré par récence, alerte "données anciennes" |
| **Vitesse** | 10+ taps pour trouver l'info | 1 regard = lieu + score + temps de marche |
| **Couverture** | Généraliste | Top 10 des spots curatés dans 120 villes/arrondissements |

### Périmètre V1 : 5 catégories de lieux

| Catégorie | Exemples |
|-----------|----------|
| **Café** | Cafés indépendants avec WiFi, chaînes (Starbucks, Columbus…) |
| **Coffee shop** | Specialty coffee, salons de thé propices au travail |
| **Coworking** | Espaces de coworking, bureaux partagés |
| **Tiers-lieu** | Tiers-lieux associatifs, FabLabs, espaces hybrides |
| **Bibliothèque** | Bibliothèques municipales, BU, médiathèques |

> Les autres types de lieux (hôtels, restaurants, parcs…) pourront être ajoutés dans une version ultérieure si la demande le justifie.

### Le moat

1. **Curation éditoriale** — pas un annuaire de plus, une sélection des meilleurs spots validée par blogs + réseaux sociaux + avis
2. **Données propriétaires introuvables ailleurs** — aucune API ne donne la qualité du WiFi d'un café
3. **Effet réseau local** — plus de contributeurs = données plus fraîches = plus d'utilisateurs
4. **Coût de contribution quasi nul** — 4 taps, zéro texte
5. **SEO massif** — 300-500 articles + pages ville/lieu = mur de contenu indexé
6. **Couverture nationale immédiate** — 120 villes/arrondissements dès le jour 1

### Cible

- Freelances
- Étudiants
- Télétravailleurs
- Personnes en déplacement

### Concurrents identifiés

| Concurrent | Forces | Faiblesses | Opportunité OuBosser |
|-----------|--------|------------|---------------------|
| **Ubiq** | SEO fort sur "coworking + ville" | Que du coworking, pas cafés/bibliothèques | 5 types : cafés, coffee shops, coworkings, tiers-lieux, bibliothèques |
| **Neo-nomade** | 800+ lieux, leader réservation | Pas de cafés, UX datée | UX moderne, 5 catégories de lieux |
| **Workin.space** | International | Peu de contenu FR | Blog FR + SEO local |
| **WorkFrom** (US) | Communauté active | US only | Équivalent français |
| **Articles de blog** | Contenu spécifique par ville | Éparpillés, datés, pas interactifs | Agréger + surclasser en SEO |

---

## 2. Personas

### Marina, 29 ans — Freelance UX designer (Paris 11e)

Travaille depuis des cafés 3-4 jours/semaine. Perd 15 min à lire les avis Google pour savoir si le WiFi marche. **Usage** : quotidien, cherche un lieu le matin, contribue systématiquement. Contributrice prolifique (15-20 notes/mois).

### Thomas, 22 ans — Étudiant en droit (Paris 5e)

La BU est souvent pleine. Budget serré. Filtre systématiquement sur "calme" + "prises". **Usage** : 3-4x/semaine. Fort potentiel de viralité en fac.

### Antoine, 41 ans — Consultant en management (Bordeaux)

En déplacement 2-3 jours/semaine. Finit toujours au Starbucks par défaut. **Usage** : mode "Planifier" la veille. Prêt à payer pour un service premium.

### Léa, 26 ans — Digital nomad / développeuse

Change de ville tous les 1-2 mois. Ajoute des lieux dans chaque nouvelle ville (10+/mois). **Usage** : power user, ambassadrice naturelle dans les communautés nomades.

### Sophie, 35 ans — Salariée en télétravail partiel (Lille)

2 jours de TT/semaine. L'après-midi, les enfants sont bruyants. Cherche un lieu calme < 15 min. **Usage** : 1-2x/semaine, fidèle à 2-3 lieux.

---

## 3. Roadmap produit

### Phase MVP — Lancement (3-5 jours avec agents IA)

**Objectif** : app fonctionnelle + 10 000 lieux scrappés + 300 articles SEO. Toutes les villes de France.

| Feature | Priorité |
|---|---|
| Carte + géolocalisation web | **Must** |
| Bottom sheet liste (triée par distance, scores, icônes critères) | **Must** |
| Fiche lieu (4 critères, score agrégé, nb votes, temps de marche) | **Must** |
| Contribution rapide (4 critères, icônes tap, 0 texte) | **Must** |
| Ajout de lieu (nom + position auto + catégorie + 4 critères) | **Must** |
| Recherche par adresse/quartier (autocomplétion BAN) | **Must** |
| Pages SEO /ville et /ville/lieu (ISR) | **Must** |
| 300-500 articles SEO générés par IA | **Must** |
| Scoring hybride scraping + contributions | **Must** |
| Bloc "Mentionné dans" (articles externes) sur les fiches | **Must** |
| Speed test WiFi automatique en background (si connecté en WiFi) | **Must** |
| QR code par lieu | **Should** |
| PWA installable | **Should** |

**Ce qu'on coupe au MVP** : comptes utilisateur (contributions avec fingerprint), filtres avancés, favoris, photos upload, gamification, notifications.

### Phase V1 — 2 semaines post-launch

| Feature | Priorité |
|---|---|
| Comptes utilisateur (magic link / Google) | **Must** |
| Filtres avancés (WiFi bon, calme, prises, < X min) | **Must** |
| Favoris | **Must** |
| Badges contributeur (3 paliers) | **Should** |
| Historique de contributions | **Should** |
| Signalement lieu fermé/inexact | **Should** |

### Phase V2 — 1-2 mois post-launch

| Feature | Priorité |
|---|---|
| Score temps réel ("affluence" basé sur check-ins < 2h) | **Must** |
| Monétisation : profils lieux payants + sponsoring | **Must** |
| Profil public contributeur + classement local | **Should** |
| Programme ambassadeur | **Should** |
| API publique (widget intégrable) | **Should** |
| Extension Chrome/navigateur | **Could** |

---

## 4. Parcours utilisateurs

### Parcours 1 : "Je cherche un lieu maintenant" (cas principal)

| Étape | Écran | Taps |
|---|---|---|
| App se charge, géoloc auto, carte centrée | Carte + markers | 0 |
| Voit les markers colorés vert/jaune/rouge | Carte | 0 |
| Tape sur un marker vert proche | Preview mini-fiche | 1 |
| Lit : "Café X — WiFi bon, calme, prises — 4 min" | Preview | 0 |
| Tape "Itinéraire" (ouvre Maps natif) | Fiche lieu | 1 |

**Total : 2-3 taps. Temps estimé : 6-8 secondes.**

### Parcours 2 : "Je note un lieu où je suis"

| Étape | Écran | Taps |
|---|---|---|
| Détection position, bannière "Tu es à [Lieu] ?" | Carte | 0 |
| Tape "Oui, je note" | Bannière | 1 |
| 4 critères en icônes : WiFi / Prises / Bruit / Confort | Notation | 4 |
| Tape "Envoyer" | Notation | 1 |
| Animation "Merci !" | Confirmation | 0 |

**Total : 6 taps, 0 caractère saisi. Temps : 5 secondes.**

### Parcours 3 : "J'ajoute un nouveau lieu"

| Étape | Écran | Taps |
|---|---|---|
| Tape "+" | Carte | 1 |
| "Ajouter un nouveau lieu" | Choix | 1 |
| Saisit le nom (auto-suggest) | Ajout | clavier |
| Position auto-remplie (ajustable) | Ajout | 0-1 |
| Sélectionne catégorie | Ajout | 1 |
| 4 critères + "Ajouter" | Notation | 5 |

**Total : 8 taps + saisie nom. Temps : 15-20 secondes.**

### Parcours 4 : "Je travaille dans une autre ville demain"

> Cas type : Antoine sait qu'il sera à Lyon demain pour un RDV client à 14h. Il veut repérer la veille un bon endroit pour bosser le matin.

| Étape | Écran | Taps |
|---|---|---|
| Tape la barre de recherche | Carte | 1 |
| Saisit "Lyon" (autocomplétion BAN) | Recherche | clavier |
| Sélectionne "Lyon" → carte recentrée sur Lyon | Carte + markers | 1 |
| Parcourt les lieux autour de son point d'intérêt (zoom/pan) | Carte | 0-2 |
| Tape sur un marker vert bien noté | Preview mini-fiche | 1 |
| Lit : "Café Y — WiFi excellent, calme, prises — quartier Confluence" | Preview | 0 |
| Sauvegarde en favori (cœur) ou partage le lien | Fiche lieu | 1 |
| Le lendemain matin, retrouve le lieu dans ses favoris ou son historique | Favoris | 1-2 |

**Total : 5-7 taps + saisie ville. Temps : 15-20 secondes.**

**Différence avec le Parcours 1** : pas de géolocalisation auto — l'utilisateur explore une ville où il n'est pas encore. L'enjeu est de pouvoir naviguer facilement sur la carte d'une autre ville et de sauvegarder le lieu pour le retrouver le jour J.

---

## 5. Architecture technique

### Stack

| Couche | Choix | Justification |
|--------|-------|---------------|
| **Frontend** | **Nuxt 3** (SSR/ISR) | Stack maîtrisée, SSR/ISR natif pour SEO, Vue 3 |
| **UI** | Tailwind CSS v4 + composants custom | Cohérent avec tous les projets existants |
| **Carte** | MapLibre GL JS (via vue-maplibre-gl) | Open-source, pas de coût par page view |
| **Bottom sheet** | Composant custom Vue 3 | Pas de lib React nécessaire |
| **Backend/BDD** | Supabase (PostgreSQL + PostGIS) | Auth intégrée, requêtes géo natives, RLS, déjà maîtrisé |
| **Hosting** | Vercel ou Netlify | SSR Nuxt 3 supporté, edge network |
| **Geocoding** | adresse.data.gouv.fr (BAN) | Gratuit, illimité, données FR |
| **Routing piéton** | OSRM ou estimation linéaire (V1) | Open-source |
| **Tuiles carte** | MapTiler Cloud | Free tier 100K req/mois |
| **Email** | Resend | 3000/mois gratuit |
| **Cache** | Nuxt cache + Supabase edge | Multi-niveaux |
| **Analytics** | PostHog (self-hosted ou cloud free) | Events, funnels, cohortes |
| **Contenu articles** | Nuxt Content (MDC/Markdown) | Fichiers Markdown, pas de CMS |

### Architecture

```
┌─────────────────────────────────────────────┐
│            VERCEL / NETLIFY EDGE             │
│  ┌────────────────────────────────────────┐  │
│  │         Nuxt 3 (SSR/ISR/SSG)          │  │
│  │  Pages SSR : /explore                 │  │
│  │  Pages ISR : /[city], /[city]/[lieu]  │  │
│  │  Pages SSG : /blog/*, /guide/*        │  │
│  │  API routes : /api/*                  │  │
│  └──────────────────┬─────────────────────┘  │
└─────────────────────┼────────────────────────┘
                      │
        ┌─────────────▼─────────────────┐
        │       SUPABASE CLOUD          │
        │  PostgreSQL 16 + PostGIS 3.4  │
        │  Auth (magic link + Google)   │
        │  Storage (photos)             │
        │  Edge Functions (scoring,     │
        │   modération, enrichissement) │
        └──────────────┬────────────────┘
                       │
     ┌─────────────────┼──────────────────┐
     │                 │                  │
┌────▼────┐   ┌───────▼──────┐   ┌──────▼────────┐
│ BAN API │   │   MapTiler   │   │  OSRM / calc  │
│(geocode)│   │(tuiles vecto)│   │   linéaire    │
└─────────┘   └──────────────┘   └───────────────┘
```

### Stratégie de rendu

| Page | URL | Stratégie | Revalidation |
|------|-----|-----------|-------------|
| Accueil | `/` | SSR | — |
| Carte interactive | `/explore` | SSR + hydratation client | — |
| Page ville | `/paris` | **ISR** | 1h |
| Page lieu | `/paris/cafe-x` | **ISR** | 30 min |
| Article blog | `/blog/*` | **SSG** (Nuxt Content) | Build |
| Guide pilier | `/guide/*` | **SSG** (Nuxt Content) | Build |

---

## 6. Modèle de données

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

-- LIEUX
CREATE TABLE places (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    location        GEOGRAPHY(POINT, 4326) NOT NULL,
    address         TEXT NOT NULL,
    city            TEXT NOT NULL,
    city_slug       TEXT NOT NULL,
    postal_code     TEXT,
    place_type      TEXT NOT NULL CHECK (place_type IN (
        'cafe', 'coffee_shop', 'coworking', 'tiers_lieu', 'library'
    )),
    description     TEXT,
    phone           TEXT,
    website         TEXT,
    opening_hours   JSONB,
    photo_urls      TEXT[] DEFAULT '{}',
    cover_photo_url TEXT,

    -- Scores agrégés (dénormalisés)
    score_wifi      NUMERIC(3,2) DEFAULT 0,
    score_power     NUMERIC(3,2) DEFAULT 0,
    score_noise     NUMERIC(3,2) DEFAULT 0,
    score_comfort   NUMERIC(3,2) DEFAULT 0,
    score_overall   NUMERIC(3,2) DEFAULT 0,
    rating_count    INTEGER DEFAULT 0,

    -- Scores scrappés (initiaux, poids décroissant)
    scraped_score_wifi    NUMERIC(3,2),
    scraped_score_power   NUMERIC(3,2),
    scraped_score_noise   NUMERIC(3,2),
    scraped_score_comfort NUMERIC(3,2),
    scraped_confidence    NUMERIC(3,2) DEFAULT 0,  -- 0-1 fiabilité du score scrappé

    -- Sources
    source          TEXT DEFAULT 'scraped' CHECK (source IN ('scraped', 'user', 'mixed')),
    google_place_id TEXT,
    osm_id          TEXT,
    google_rating   NUMERIC(2,1),
    google_reviews_count INTEGER,

    -- Modération
    status          TEXT NOT NULL DEFAULT 'approved'
        CHECK (status IN ('pending', 'approved', 'rejected', 'reported')),
    added_by        UUID REFERENCES auth.users(id),

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_places_location ON places USING GIST (location);
CREATE INDEX idx_places_city_slug ON places (city_slug);
CREATE INDEX idx_places_status ON places (status) WHERE status = 'approved';

-- ÉVALUATIONS (contributions utilisateur)
CREATE TABLE ratings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id    UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES auth.users(id),
    fingerprint TEXT,  -- pour contributions sans compte (MVP)
    wifi        SMALLINT NOT NULL CHECK (wifi BETWEEN 1 AND 5),
    power       SMALLINT NOT NULL CHECK (power BETWEEN 1 AND 5),
    noise       SMALLINT NOT NULL CHECK (noise BETWEEN 1 AND 5),
    comfort     SMALLINT NOT NULL CHECK (comfort BETWEEN 1 AND 5),
    comment     TEXT,
    is_verified BOOLEAN DEFAULT FALSE,  -- géoloc confirmée < 200m
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- VILLES (SEO)
CREATE TABLE cities (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT NOT NULL,
    slug             TEXT NOT NULL UNIQUE,
    location         GEOGRAPHY(POINT, 4326) NOT NULL,
    department       TEXT,
    region           TEXT,
    population       INTEGER,
    meta_title       TEXT,
    meta_description TEXT,
    description_html TEXT,
    place_count      INTEGER DEFAULT 0,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- MENTIONS D'ARTICLES EXTERNES
CREATE TABLE place_mentions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id      UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    article_url   TEXT NOT NULL,
    article_title TEXT NOT NULL,
    source_name   TEXT NOT NULL,       -- ex: "Maison Paon", "Time Out Paris"
    excerpt       TEXT,                -- extrait pertinent
    published_at  DATE,
    scraped_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (place_id, article_url)
);

-- FAVORIS / SIGNALEMENTS / PROFILS
CREATE TABLE favorites (
    user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, place_id)
);

CREATE TABLE reports (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id  UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    user_id   UUID REFERENCES auth.users(id),
    reason    TEXT NOT NULL CHECK (reason IN ('closed', 'wrong_info', 'spam', 'inappropriate', 'duplicate')),
    details   TEXT,
    status    TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profiles (
    id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username     TEXT UNIQUE,
    avatar_url   TEXT,
    rating_count INTEGER DEFAULT 0,
    place_count  INTEGER DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- FONCTION : lieux à proximité
CREATE OR REPLACE FUNCTION nearby_places(
    lat DOUBLE PRECISION, lng DOUBLE PRECISION,
    radius_m INTEGER DEFAULT 2000, max_results INTEGER DEFAULT 50
) RETURNS SETOF places AS $$
    SELECT * FROM places
    WHERE status = 'approved'
      AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radius_m)
    ORDER BY location <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    LIMIT max_results;
$$ LANGUAGE SQL STABLE;
```

---

## 7. Système de scoring

### Scoring hybride scraping / contributions

Le score d'un lieu combine deux sources, avec un poids qui évolue dans le temps :

```
score_final = W_scraping * score_scraped + W_user * score_user

Phase lancement :    W_scraping = 0.90, W_user = 0.10
Phase 6 mois :       W_scraping = 0.50, W_user = 0.50
Phase 12 mois :      W_scraping = 0.20, W_user = 0.80
Phase maturité :     W_scraping = 0.05, W_user = 0.95
```

La bascule est **par lieu** : dès qu'un lieu a 5+ contributions utilisateur, le poids scraping tombe à 0.3 quel que soit la phase globale. À 10+ contributions, il tombe à 0.1.

### Score scrappé (initial)

Construit à partir de :
- **Avis Google** : extraction NLP des mentions WiFi, bruit, prises, confort
- **Tags OSM** : `internet_access=wlan`, `power_supply=yes`
- **Type de lieu** : une bibliothèque = "calme" par défaut, un café/coffee shop = "WiFi probable", un coworking = "prises" par défaut
- **Note Google** : proxy partiel pour le confort global

### Score contributions utilisateur

#### Normalisation

| Critère | Valeurs brutes | Score normalisé |
|---------|---------------|-----------------|
| WiFi | bon / moyen / nul | 1.0 / 0.5 / 0.0 |
| Prises | oui / rare / non | 1.0 / 0.5 / 0.0 |
| Bruit | calme / ok / bruyant | 1.0 / 0.5 / 0.0 |
| Confort | bon / mauvais | 1.0 / 0.0 |

#### Pondération des critères

```
W_wifi    = 0.35
W_bruit   = 0.30
W_prises  = 0.20
W_confort = 0.15
```

#### Decay temporel (demi-vie 180 jours)

```
decay(i) = exp(-ln(2)/180 * age_jours(i))
```

- Aujourd'hui : 1.0 | 6 mois : 0.5 | 1 an : 0.25 | 2 ans : 0.06

#### Score global (affiché sur 5)

```
score_critere = Σ(score_i × decay_i) / Σ(decay_i)
score_global = (W_wifi × score_wifi + W_bruit × score_bruit + W_prises × score_prises + W_confort × score_confort) × 5
```

### Seuil de fiabilité

| Nb contributions (decay > 0.1) | Affichage |
|---|---|
| 0 (score scrappé uniquement) | Score avec mention "Estimé" + icône ⓘ |
| 1-2 | Score + "Peu de données" |
| 3-4 | Score + "Score préliminaire" |
| >= 5 | Score affiché normalement |

### Algorithme de tri (ranking)

```
ranking = 0.45 × score_distance + 0.40 × score_qualite + 0.10 × score_confiance + 0.05 × bonus_fraicheur + penalite_ferme
```

---

## 8. Plan de développement

### Approche : développement parallèle avec agents IA

Tout est développé simultanément par des agents spécialisés. Pas de sprints séquentiels.

| Chantier | Durée | Parallélisable |
|----------|-------|---------------|
| **Setup** : Nuxt 3 + Supabase + MapLibre + Tailwind | 0.5 jour | — |
| **Carte** : MapView, markers, clustering, bottom sheet, géoloc | 1 jour | ✓ |
| **Fiches** : page lieu ISR, scores visuels, itinéraire | 1 jour | ✓ |
| **SEO** : pages ville ISR, sitemap, JSON-LD, meta tags | 1 jour | ✓ |
| **Contributions** : rating rapide, ajout lieu, BAN autocomplete | 1 jour | ✓ |
| **Scraping** : pipeline Google Places + OSM + data.gouv.fr | 1-2 jours | ✓ |
| **Articles** : génération 300-500 articles Markdown | 1 jour | ✓ |
| **Scraping articles** : extraction mentions externes → `place_mentions` | 0.5 jour | ✓ |
| **QR codes** : génération + landing | 0.5 jour | ✓ |
| **PWA** : manifest, service worker, icônes | 0.5 jour | ✓ |
| **Polish** : responsive, perfs, tests | 1 jour | — |

**Total estimé : 3-5 jours** en développement parallèle avec agents IA.

### Commande d'initialisation

```bash
npx nuxi@latest init oubosser
cd oubosser
npx nuxi module add @nuxt/content
npx nuxi module add @nuxtjs/supabase
npm install maplibre-gl @supabase/supabase-js
npm install -D @tailwindcss/vite
```

---

## 9. Curation des lieux

### Stratégie : qualité > quantité

**Objectif** : les **5-10 meilleurs spots** par ville/arrondissement — ceux que les blogs recommandent, que les gens taguent sur Instagram/TikTok, et qui ont de bons avis Google. **~600-1 200 lieux** au total pour ~120 entités.

**Périmètre** : top 100 villes (≥ 50K hab) + 20 arrondissements de Paris.

### Sources de données (cross-référencement)

| Source | Rôle | Coût |
|--------|------|------|
| **Articles de blogs** (via Serper.dev) | Découverte : quels lieux sont recommandés par les blogueurs | $0 (free tier) |
| **Google Places API** | Validation : avis, note, horaires, coordonnées | ~$42 (crédit gratuit $200/mois) |
| **Instagram** (semi-manuel) | Enrichissement social : ambiance, photos, handles | $0 (travail manuel) |
| **TikTok** (semi-manuel) | Découverte sociale : vidéos "meilleurs cafés de {ville}" | $0 (travail manuel) |
| **BAN** (adresse.data.gouv.fr) | Normalisation adresses | $0 |

### Pipeline de curation

```
Blogs (Google) ──→ LLM extraction ──→ Lieux candidats ──┐
                                                         ├──→ Cross-référencement ──→ Top 10/ville
Google Maps ─────→ Avis + ratings ──→ Signaux travail ──┤
                                                         │
Instagram/TikTok ──→ Recherche manuelle ─────────────────┘
```

### Scoring de curation (sélection du top 10)

```
curation_score = blog_score × 0.35 + google_score × 0.30 + social_score × 0.25 + work_score × 0.10
```

- **blog_score** : nombre de mentions dans des articles différents (1 mention = 1.0, 5+ = 5.0)
- **google_score** : combinaison note Google + nombre d'avis
- **social_score** : présence Instagram/TikTok, posts géotagués, mentions
- **work_score** : signaux WiFi/prises/calme extraits des avis

Seuil minimum : `curation_score ≥ 1.5`. Voir `PIPELINE-SCRAPING.md` pour le détail complet.

### Planning

| Phase | Durée | Méthode |
|-------|-------|---------|
| Découverte blogs + Google (automatisée) | Jour 1 (~2h) | Scripts automatisés |
| Enrichissement Instagram/TikTok (semi-manuel) | Jours 2-7 (~25 min/ville) | Manuel ou VA |
| Cross-référencement + seed BDD | Jour 8 | Script automatisé |

**Budget total : ~$42** (couvert par crédit Google Cloud gratuit).

---

## 10. SEO — Architecture & contenu

### Structure des URLs

```
oubosser.fr/                                     (homepage)
oubosser.fr/paris                                (page ville)
oubosser.fr/paris/cafe-laptop-bastille           (page lieu)
oubosser.fr/guide/cafes-pour-travailler          (guide pilier)
oubosser.fr/blog/meilleurs-cafes-travailler-paris (article blog)
```

### Pages piliers

| Page | Mot-clé cible |
|------|--------------|
| /guide/cafes-pour-travailler | café pour travailler |
| /guide/coworking | espace coworking |
| /guide/bibliotheques-pour-travailler | bibliothèque pour travailler |
| /guide/tiers-lieux | tiers-lieu pour travailler |

### Maillage croisé articles ↔ fiches lieu

Quand un article (interne ou externe) mentionne un lieu de la base :
- **Sur la fiche lieu** : bloc "Mentionné dans" avec titre d'article + source + lien
- **Dans nos articles** : chaque lieu mentionné linke vers sa fiche `/ville/lieu`
- **Sur la page ville** : lien vers les articles blog correspondants

Ce maillage crée un réseau dense que Google valorise fortement.

### Structured data

- **Page lieu** : `CafeOrCoffeeShop` / `Library` / `CoworkingSpace` / `LocalBusiness` (tiers-lieux) + `AggregateRating` + `BreadcrumbList`
- **Page ville** : `CollectionPage` + `ItemList` + `FAQPage`
- **Article blog** : `Article` + `publisher` + `datePublished`

### Opportunité SEO principale

Les requêtes "café pour travailler [ville]" et "bibliothèque [ville]" sont **peu concurrentielles** (contrairement à "coworking [ville]" trusté par Ubiq/Neo-nomade). Avec 300+ articles couvrant toutes les villes, OuBosser peut dominer ces requêtes rapidement.

---

## 11. Génération d'articles à grande échelle

### Principe : pipeline industriel, pas rédaction artisanale

Chaque article est **généré par IA** à partir des données scrappées réelles de la ville, puis stocké en Markdown dans Nuxt Content.

### Types d'articles et volume

| Type | Template | Volume |
|------|----------|--------|
| "Les meilleurs cafés pour travailler à [ville]" | Best-of ville cafés | ~100 villes |
| "Coworking à [ville] : guide complet" | Guide coworking ville | ~80 villes |
| "Bibliothèques où travailler à [ville]" | Best-of bibliothèques | ~50 villes |
| "Où travailler à [ville] : le guide complet" | Guide global ville | ~100 villes |
| "Café vs coworking vs bibliothèque" | Comparatif | ~10 |
| Guides pratiques (WiFi, étiquette café, équipement) | Guide thématique | ~20 |
| **Total** | | **~360 articles** |

### Critères pour générer un article ville

- Population > 30 000 habitants OU > 10 lieux dans la base
- Au moins 3 lieux du type concerné (cafés, coworkings, ou bibliothèques)

### Pipeline de génération

```
Données lieux de la ville (Supabase)
         │
         ▼
Prompt IA avec template + données réelles
(noms, adresses, scores, nombre d'avis, citations d'avis)
         │
         ▼
Article Markdown + frontmatter SEO
(title, description, slug, city, type, places)
         │
         ▼
Validation automatique
(longueur, liens internes, unicité, mots-clés)
         │
         ▼
content/blog/[slug].md dans Nuxt Content
```

### Différenciation vs "contenu IA générique"

- **Données réelles** injectées : scores, nombre d'avis, citations d'avis Google
- **Contexte local** : quartiers, transports, ambiance spécifique à la ville
- **Liens vers les fiches** : chaque lieu mentionné linke vers sa fiche interactive
- **Mise à jour automatique** : quand les scores changent, l'article peut être régénéré

---

## 12. Marketing & Growth

### Stratégie de lancement : toutes les villes, tout de suite

Pas de ville pilote. L'avantage compétitif est la **couverture nationale immédiate** :
- 600-1 200 lieux curatés (top 10 par ville) → 100 villes + 20 arrondissements Paris
- 300+ articles SEO → un article par ville
- Pages ville/lieu générées → des milliers de pages indexables

### Canaux d'acquisition (classés par ROI)

| Rang | Canal | Coût | Volume attendu |
|------|-------|------|----------------|
| 1 | **SEO massif** (300+ articles + pages ville/lieu) | 0€ | 50-60% du trafic à M6 |
| 2 | **LinkedIn organique** (fondateur, build in public) | 0€ | 15% des inscrits au lancement |
| 3 | **Communautés** (Slack, Discord, Reddit, FB groups) | 0€ | 10% early adopters |
| 4 | **QR codes en cafés** | 50-100€/lot | 5-10 contributions/café/mois |
| 5 | **PR/presse** | 0€ | Pics de trafic |
| 6 | **Product Hunt + Hacker News** | 0€ | Pic jour du lancement |
| 7 | **Paid (Meta/Google)** — si rétention OK | 300-500€/mois | CPA < 1€ |

### Growth loops

1. **Contribution → contenu → SEO → nouveaux users → contribution**
2. **QR code → scan → contribution → enrichissement → plus de valeur pour le café**
3. **Partage social** : "carte de spot" générée (nom + notes + branding OuBosser)
4. **Articles externes "Mentionné dans"** → autorité + backlinks naturels

### Réseaux sociaux

| Plateforme | Fréquence | Format principal |
|---|---|---|
| **LinkedIn** | 3/sem | Build in public, classements |
| **Instagram** | 4/sem + stories | Photos lieux, mini-reviews |
| **TikTok** | 2-3/sem | "Je teste ce café pour bosser" |

### Partenariats

- **Cafés** : QR code + sticker vitrine + dashboard stats gratuit
- **Coworkings** : complémentarité (lien croisé)
- **Mairies** : visibilité tiers-lieux
- **Micro-influenceurs freelance** : badge ambassadeur

---

## 13. Monétisation

### Principe

> Le B2B (lieux) finance la plateforme. La recherche reste 100% gratuite. Toujours.

### Phase 1 (M0-3) : aucune monétisation

Focus : couverture data + SEO + premiers utilisateurs.

### Phase 2 (M3-12) : premiers revenus

| Source | Pricing | Cible M12 |
|---|---|---|
| Profil lieu "Vérifié" (3 tiers) | 29-79€/mois | 30-80 lieux → 1 500-4 000€/mois |
| Mise en avant sponsorisée | 50-100€/mois | 10-30 lieux → 500-3 000€/mois |
| Affiliation coworking | CPA 5-15€ | 20-50 leads → 100-750€/mois |

### Phase 3 (M12+) : diversification

- OuBosser Pro B2C (3,99€/mois)
- Partenariats marques
- API / données agrégées
- Widget intégrable

### Grille tarifaire B2B (lieux)

| | Gratuit | Essentiel 29€ | Pro 49€ | Premium 79€ |
|---|---|---|---|---|
| Listing + notes | ✓ | ✓ | ✓ | ✓ |
| Badge "Vérifié" | — | ✓ | ✓ | ✓ |
| Photos illimitées | 3 max | ✓ | ✓ | ✓ |
| Dashboard analytics | — | Basique | Complet | Complet |
| Réponse aux avis | — | — | ✓ | ✓ |
| Boost résultats | — | — | — | 1 quartier |

### Règles anti "Yelp Problem"

- Classement organique basé **uniquement** sur pertinence
- Résultats sponsorisés **toujours** marqués
- Max 1 sponsorisé / 5 organiques
- Aucun avis masqué en fonction du statut payant

---

## 14. Projections financières

### Scénario réaliste

| Mois | MRR estimé |
|---|---|
| M1-M3 | 0€ |
| M6 | 500-1 000€ |
| M9 | 1 500-3 000€ |
| M12 | 3 000-5 000€ |
| M18 | 6 000-10 000€ |
| M24 | 12 000-15 000€ |

### Coûts mensuels

| Palier | Infra | Marketing | Total |
|--------|-------|-----------|-------|
| 0-1K users | 0-21€ | 0€ | **~20€** |
| 1K-10K | ~120€ | ~200€ | **~320€** |
| 10K-100K | ~375€ | ~500-1 000€ | **~1 000€** |

### Break-even réaliste : mois 18-22

---

## 15. Data, qualité & analytics

### Anti-spam contributions

| Mesure | Détail |
|--------|--------|
| Fingerprint (MVP) / Auth (V1) | Identifier les contributeurs |
| 1 rating/lieu/jour | Contrainte en BDD |
| Rate limiting | 10 ratings/min |
| Honeypot field | Champ invisible anti-bot |
| Vérification géoloc | < 200m = "vérifié" (poids ×1.2) |
| Détection anomalie | 20+ ratings/h sur un lieu → flag |

### Modération lieux ajoutés par les utilisateurs

- Lieux scrappés : `approved` par défaut
- Lieux ajoutés par users : `pending` si < 10 lieux approuvés, sinon auto-approve
- Auto-approve si match `google_place_id`
- Auto-reject si mots interdits

### Analytics

**Outil** : PostHog (self-hosted ou cloud free tier)

**Events clés** : `map_view`, `search_query`, `filter_applied`, `lieu_detail_view`, `contribution_submitted`, `lieu_created`, `lieu_shared`

**North Star Metric** : contributions vérifiées / semaine

---

## 16. RGPD & conformité

| Donnée | Base légale | Conservation |
|--------|------------|-------------|
| Email, pseudo | Contrat | Jusqu'à suppression + 30j |
| Contributions | Contrat | Indéfiniment (pseudonymisées si suppression compte) |
| Géolocalisation | **Consentement** (opt-in) | **24h** (non stockée) |
| Analytics | Intérêt légitime | 25 mois |
| IP (anti-spam) | Intérêt légitime | 12 mois |

- DPO non obligatoire < 50K users
- Registre des traitements dès le départ

---

## 17. Gamification & rétention

### Points (V1)

| Action | Points |
|---|---|
| Noter un lieu | 10 pts |
| Ajouter un lieu | 25 pts |
| Première contribution du jour | +5 pts |
| Contribution géo-vérifiée | +5 pts |

### Badges

Explorateur (5 contrib) → Habitué (20) → Expert local (50/ville) → Pionnier (premier à noter) → Cartographe (10 lieux ajoutés)

### Rétention

- Résumé hebdo email
- Rappel fraîcheur ("Toujours pareil au Café X ?", 1 tap)
- PWA + raccourci écran d'accueil

---

## 18. Risques & mitigations

| Risque | Impact | Mitigation |
|--------|--------|-----------|
| **Google pénalise le contenu IA** | Élevé | Données réelles injectées, pas de contenu vide, mises à jour régulières |
| **Données scrappées de mauvaise qualité** | Élevé | Score de confiance affiché, bascule vers contributions user dès que possible |
| **Contributions spam** | Moyen | Multi-couche : fingerprint, géoloc, rate limit, détection anomalies |
| **Concurrent copie** | Moyen | Couverture nationale + SEO massif = avance difficile à rattraper |
| **Coûts Google Places API** | Moyen | Utiliser OSM/data.gouv.fr en priorité, Google Places en enrichissement |
| **Faible rétention** | Moyen | Gamification, rappels fraîcheur, accepter l'usage saisonnier |

---

## 19. KPIs par phase

### Lancement (M1)

| KPI | Objectif |
|---|---|
| Lieux dans la base | 600-1 200 (curatés, top 10/ville) |
| Articles SEO publiés | 300+ |
| Pages indexées par Google | 1 000+ |
| Visiteurs uniques | 5 000+ |

### Croissance (M3-6)

| KPI | M3 | M6 |
|---|---|---|
| Visiteurs uniques/mois | 15 000 | 40 000 |
| Contributions/mois | 500 | 1 500 |
| Mots-clés en top 10 | 50 | 200 |
| Trafic SEO (% total) | 30% | 50% |

### Maturité (M12)

| KPI | Objectif |
|---|---|
| Visiteurs uniques/mois | 100 000 |
| Lieux avec contributions user | 3 000+ |
| Villes "actives" (>10 contrib/mois) | 30+ |
| MRR | 3 000-5 000€ |

---

## 20. Budget global

### Budget année 1 (bootstrap)

| Poste | Coût estimé |
|---|---|
| Infra (Supabase Pro + Vercel + MapTiler) | ~1 500€ |
| Google Places API (enrichissement initial) | ~0€ (crédit gratuit $200/mois) |
| Marketing (QR codes, événements, goodies) | ~2 000€ |
| Domaine oubosser.fr | ~15€ |
| Paid ads (conditionné à la rétention) | 0-3 000€ |
| **Total année 1** | **~4 000-7 000€** |

### Le vrai investissement : le temps fondateur + agents IA

Le développement, le scraping et la génération de contenu sont réalisés avec des agents IA, ce qui compresse drastiquement les coûts et les délais. Le principal investissement est le temps de pilotage.

---

*Plan mis à jour le 2 avril 2026. Prochaine étape : développement.*
