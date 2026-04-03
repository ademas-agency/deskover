# OuBosser — Pipeline de génération d'articles SEO

## Volume et taxonomie

| Type | Template | Volume |
|------|----------|--------|
| "Les meilleurs endroits pour travailler à [ville]" | Best-of ville | ~150-200 |
| "Travailler dans le [quartier]" | Best-of quartier | ~80-120 |
| "Les meilleurs [type] pour travailler à [ville]" | Guide par type | ~50-70 |
| "Travailler [thématique] à [ville]" | Guide thématique | ~30-50 |
| Comparatifs, guides pratiques | Divers | ~40-60 |
| **Total** | | **~350-500** |

## Critères de sélection

- **Article ville** : population ≥ 30K OU ≥ 5 lieux en base
- **Article quartier** : ville ≥ 200K ET quartier a ≥ 4 lieux
- **Article par type** : ville a ≥ 3 lieux du même type

## Pipeline

```
Données lieux (Supabase) + contexte ville
         │
         ▼
Prompt Claude (Sonnet) avec template + données réelles
(noms, adresses, scores, citations d'avis, mentions presse)
         │
         ▼
Article Markdown + frontmatter SEO
         │
         ▼
Validation automatique
(longueur, liens, unicité, anti-phrases IA, scores matchent l'input)
         │
         ▼
content/articles/[slug].md (Nuxt Content)
```

## Coûts et temps

- **Modèle** : Claude Sonnet via API
- **Coût** : ~0.03-0.05 $/article → **~15-20$ total** pour 400 articles
- **Temps** : ~45 sec/article → batch de 50 en parallèle (5 workers) = **~1h total**

## Structure des URLs (racine, pas de /blog/)

```
/travailler-lyon
/travailler-marais-paris
/cafes-travailler-bordeaux
/travailler-dimanche-paris
```

## Stockage : Nuxt Content (fichiers .md)

```
content/articles/
  best-of/travailler-paris.md
  best-of/travailler-lyon.md
  quartiers/travailler-marais-paris.md
  types/cafes-travailler-paris.md
  thematiques/travailler-dimanche-paris.md
```

## Qualité : anti-contenu IA générique

1. **Données réelles injectées** : scores, nombre d'avis, citations d'avis Google
2. **Contexte ville** : population, quartiers, transports, universités, particularités
3. **Mentions presse** intégrées : "Déjà repéré par Maison Paon comme 'coup de coeur WiFi'..."
4. **Liste noire de phrases** : "incontournable", "véritable havre", "ne cherchez plus", etc.
5. **Variabilité d'intros** : angle aléatoire (nombre de lieux, type dominant, stat, profil ville)

## Validation automatique

- Frontmatter YAML valide
- Longueur 800-2500 mots
- Tous les lieux ont leurs scores affichés
- Tous les lieux ont un lien `/lieu/{slug}`
- ≥ 3 liens internes
- Title 30-65 caractères
- Description 120-160 caractères
- Aucune phrase de la liste noire
- Score de similarité < 0.7 avec les autres articles

## Maillage interne automatique (post-processeur)

- Lien vers la page ville dans l'intro
- Lien vers chaque fiche lieu mentionnée
- Section "À lire aussi" (articles de la même ville)
- Section "Villes proches" (articles du même type, villes voisines)

## Données structurées (schema.org)

- `Article` + `publisher` + `datePublished`
- `FAQPage` sur les best-of
- `ItemList` pour le classement des lieux
- `LocalBusiness` pour chaque lieu listé

## Mise à jour

- **Hebdomadaire** : scan des données modifiées, mise à jour inline
- **Trimestrielle** : regénération complète (dates, contenu)
- **Événementiel** : lieu fermé → retrait + regénération si < 3 lieux restants

## Scraping articles externes → bloc "Mentionné dans"

Table `place_mentions` : `place_id`, `article_url`, `article_title`, `source_name`, `citation`, `sentiment`

Affiché sur la fiche lieu :
```
📰 Mentionné dans
  Maison Paon — mars 2025
  "Notre coup de coeur pour le WiFi et l'ambiance studieuse"
  Lire l'article →
```

Intégré dans nos articles :
"Déjà repéré par Maison Paon, le Café Mokxa confirme avec un score de 4/5."
