# OuBosser — Spécifications UX/Design v2

> Logique TripAdvisor : classement par défaut, carte en vue alternative.
> Design system : orange #FF5200, Plus Jakarta Sans + Inter, No-Line philosophy.

---

## Navigation

### Vue par défaut : le Classement (pas la carte)

L'écran d'accueil est un **classement des meilleurs lieux pour travailler** autour de l'utilisateur, comme TripAdvisor classe les restaurants.

### Bottom bar mobile

```
  Classement (trophy)  |  Carte (map)  |  Saved (bookmark)  |  Profil (user)
```

### Switch classement ↔ carte

- Mobile : onglets bottom bar. Les filtres sont conservés quand on switch.
- Desktop : toggle segmenté sous les filtres.
- État filtres partagé dans un store Pinia `useFiltersStore` + URL query params.

---

## Design system "Kinetic Workspace"

### Philosophie No-Line

Pas de bordures, pas de séparateurs 1px. Hiérarchie par contrastes de fond, ombres et espacement.

### Palette

| Rôle | Hex |
|------|-----|
| Primary | `#FF5200` |
| Primary Dark | `#A83300` |
| Surface | `#F8F9FF` |
| Navy (texte) | `#0B1C30` |
| Success | `#16A34A` |
| Warning | `#F59E0B` |
| Danger | `#DC2626` |
| Card | `#FFFFFF` |
| Text Secondary | `#64748B` |
| Chip inactif | `#F1F5F9` |
| Chip actif | `#FFF1EB` |

### Typographie

| Élément | Font | Taille | Poids |
|---------|------|--------|-------|
| H1 | Plus Jakarta Sans | 28px mob / 36px desk | ExtraBold 800 |
| H2 | Plus Jakarta Sans | 22px / 28px | Bold 700 |
| Corps | Inter | 14px / 16px | Regular 400 |
| Labels | Inter | 12px | Medium 500 |
| Scores | Plus Jakarta Sans | 24px | ExtraBold 800 |
| Rang | Plus Jakarta Sans | 20px | ExtraBold 800 |

### Rayons, ombres, tailles

- Cards : `rounded-3xl` (24px)
- Boutons : `rounded-3xl`
- Chips : `rounded-full`
- Bottom sheet : `rounded-t-3xl`
- CTA : 52px hauteur
- Card classement : ~120px mob, ~100px desk
- Score badge hero : 56×56px
- Score badge compact : 40×40px
- Touch target min : 44×44px

---

## Écran Classement (vue par défaut)

### Layout mobile

```
┌──────────────────────────┐
│ OuBosser      Paris 11e  │ ← header sticky
├──────────────────────────┤
│ Les meilleurs lieux pour │ ← H1
│ travailler près de vous  │
│                          │
│ [Cafés][Biblio][WiFi]    │ ← filtres scrollables
│ [Calme][Prises][+Filtres]│
│                          │
│ 127 lieux · Trié par score│
│                          │
│ ┌──────────────────────┐ │
│ │ 1  [photo]  Café Ob. │ │ ← card classement
│ │    ★ 4.6 Excellent   │ │
│ │    WiFi  Prises  Resto│ │
│ │    350m · Ouvert      │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ 2  [photo]  BiblioSA │ │
│ │    ★ 4.5 Très bien   │ │
│ │    WiFi  Calme  Gratuit│
│ │    800m · Ouvert      │ │
│ └──────────────────────┘ │
│          ...             │
│                          │
│ [ 🗺 Voir sur la carte ] │ ← FAB orange
├──────────────────────────┤
│ Class. │ Carte │ Saved │…│
└──────────────────────────┘
```

### Layout desktop

Sidebar filtres (280px) à gauche + classement au centre + toggle [Classement | Carte] en haut.

### Card classement

- **Rang** : #1, #2, #3 en ExtraBold 20px navy. Top 3 = cercle fond orange clair.
- **Photo** : 80×80px, `rounded-2xl`.
- **Nom** : Bold 16px, 1 ligne max.
- **OuBosser Score** : ★ 4.6 en orange + label ("Excellent"/"Très bien"/"Bien"/"Correct"/"Insuffisant").
- **Badges critères** : max 3 chips pertinents ("Bon WiFi", "Prises", "Resto").
- **Distance + statut** : 350m · Ouvert (vert) ou Fermé (rouge).
- **Bookmark** : icône en haut à droite.

### Labels de score

| Score | Label | Couleur |
|-------|-------|---------|
| 4.5-5.0 | Excellent | `#16A34A` |
| 4.0-4.4 | Très bien | `#22C55E` |
| 3.0-3.9 | Bien | `#F59E0B` |
| 2.0-2.9 | Correct | `#F97316` |
| 0-1.9 | Insuffisant | `#DC2626` |

---

## Écran Carte (vue alternative)

Même layout que la v1 (carte plein écran + bottom sheet 3 positions), mais :
- Filtres identiques au classement (overlay en haut de la carte)
- Cards bottom sheet compactes (72px, pas de photo, rang + nom + score + distance)
- FAB inverse : "Voir le classement"
- Markers : cercle 36px blanc avec icône catégorie (inactif), 44px orange (sélectionné)

---

## Filtres (composant partagé)

### Liste complète

| Filtre | Type | Seuil/Valeurs |
|--------|------|---------------|
| Type de lieu | Multi-select chips | Café, Bibliothèque, Coworking, Tiers-lieu |
| Bon WiFi | Toggle | score_wifi >= 4.0 |
| Calme | Toggle | score_noise >= 4.0 |
| Prises | Toggle | score_power >= 4.0 |
| Restauration | Toggle | score_food >= 4.0 |
| Accès | Radio | Tous / Gratuit / Payant |
| Ouvert maintenant | Toggle | horaires |
| Distance max | Slider | 500m – 10km |
| Score minimum | Slider | 1 – 5 |

### Mobile

Barre horizontale scrollable (6 chips visibles) + chip "+ Filtres" → drawer bottom sheet avec tous les filtres + compteur temps réel "Voir X lieux".

### Desktop

Sidebar permanente 280px à gauche.

### Persistance

URL query params : `?type=cafe,biblio&wifi=1&calme=1&acces=gratuit&dist=2000`

---

## Fiche lieu

### Layout mobile

```
┌──────────────────────────┐
│ ← Retour   Sauver   ⋯   │ ← header sticky transparent
├──────────────────────────┤
│    [    PHOTO HERO      ]│ ← 240px
├──────────────────────────┤
│ Café Oberkampf           │ ← H1
│ Café · 350m à pied       │
│                          │
│ ┌──────────────────────┐ │
│ │  ★ 4.6/5  Excellent  │ │ ← score hero
│ │  #3 dans votre quartier│
│ │  Basé sur 47 avis    │ │
│ └──────────────────────┘ │
│                          │
│ ── Vitals du lieu ────── │
│ ┌──────┐┌──────┐┌──────┐│
│ │ WiFi ││Prises││Calme ││ ← grille 3×2
│ │ 4.2  ││ 3.8  ││ 4.7  ││
│ └──────┘└──────┘└──────┘│
│ ┌──────┐┌──────┐┌──────┐│
│ │Confo.││Resto ││ Prix ││
│ │ 4.0  ││ Oui  ││  €€  ││
│ └──────┘└──────┘└──────┘│
│                          │
│ ── Infos pratiques ───── │
│ 📍 42 rue Oberkampf      │
│ 🕐 Ouvert · Ferme à 19h  │
│ 📶 Speed test : 45 Mbps  │
│ 💰 Consommation obligatoire│
│                          │
│ ── Mentionné dans ────── │
│ "Top 10 cafés WiFi Paris"│
│  Le Bonbon · 2024        │
│                          │
│ ── Derniers avis (47) ── │
│ Marie L. · il y a 2j     │
│ WiFi ★4  Prises ★3  ...  │
│                          │
│ [   Donner mon avis    ] │ ← CTA sticky
└──────────────────────────┘
```

### Vitals : grille 3×2

**Ligne 1** (scores sur 5 avec barres colorées) : WiFi, Prises, Calme
**Ligne 2** (scores + infos catégorielles) : Confort, Restauration (Oui/Limité/Non), Prix (Gratuit/€/€€/€€€)

Barres de score : 5 segments, vert >= 4, jaune 2.5-3.9, rouge < 2.5.

### Badges restauration/prix

- **Restauration Oui** : fond `#DCFCE7`, texte vert
- **Restauration Limité** : fond `#FEF3C7`, texte jaune
- **Restauration Non** : fond `#F1F5F9`, texte gris
- **Gratuit** : fond vert clair, icône `badge-check`
- **€/€€/€€€** : fond `#F1F5F9`, texte navy

---

## Contribution rapide (5 critères)

```
┌──────────────────────────┐
│ ✕ Fermer    Café Oberkampf│
├──────────────────────────┤
│ Comment est le WiFi ?    │
│  1    2    3    4    5   │ ← 5 boutons 48×48
│                          │
│ Les prises ?             │
│  1    2    3    4    5   │
│                          │
│ Le bruit ?               │
│  1    2    3    4    5   │
│                          │
│ Le confort ?             │
│  1    2    3    4    5   │
│                          │
│ Restauration sur place ? │
│ [Oui] [Limité] [Non]    │ ← 3 chips
│                          │
│ [      Envoyer         ] │
└──────────────────────────┘
```

On ne demande PAS le prix/accès (donnée factuelle du lieu). CTA actif dès 1 critère. Objectif < 8 secondes.

---

## Ajout de lieu

Comme v1 + ajout de :
- **Accès** : radio Gratuit / Consommation / Payant
- Si "Payant" : sous-option prix [€] [€€] [€€€]

---

## OuBosser Score : formule

### Pondération

| Critère | Poids |
|---------|-------|
| WiFi | 30% |
| Calme | 25% |
| Prises | 20% |
| Confort | 15% |
| Restauration | 10% |

### Bayesian average (style IMDB/TripAdvisor)

```
raw = 0.30×wifi + 0.25×calme + 0.20×prises + 0.15×confort + 0.10×food
bayesian = (C × m + n × raw) / (C + n)
  C = 5 (avis fictifs prior)
  m = 2.50 (moyenne a priori)
freshness = 0.25 × exp(-ln(2)/90 × jours_depuis_dernier_avis)
OuBosser Score = bayesian + freshness
```

→ 2 avis à 5.0 = score 3.21 | 50 avis à 4.0 = score 3.86. Le volume d'avis protège contre les outliers.

### Tri secondaire (égalité)

1. Nombre de contributions
2. Récence du dernier avis
3. Distance

---

## Pages SEO

### Page ville

H1 + top 10 classement + groupement par type + mini-carte + FAQ + Schema.org (ItemList + LocalBusiness).

### Page lieu (SEO)

= Fiche lieu + header/nav + footer + Schema.org (LocalBusiness, AggregateRating = OuBosser Score).

---

## Mobile-first : pièges à éviter

1. Bottom sheet bloque la carte → `pointer-events: none` sur overlay
2. Clustering markers (supercluster) dès le début
3. Debounce `moveend` 300ms
4. Safe area : `env(safe-area-inset-*)` partout
5. Carte lazy-loaded sur pages SEO
6. Bottom sheet : animer `transform: translateY()` (GPU), pas `height`
7. Classement : infinite scroll avec IntersectionObserver
8. OuBosser Score pré-calculé côté serveur (colonne `oubosser_score`)
