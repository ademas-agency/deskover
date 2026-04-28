L'utilisateur veut générer un rapport SEO de Deskover à partir des données Google Search Console.

## Contexte

Le rapport est généré par un script Node qui interroge l'API GSC et produit deux fichiers :
- Un markdown brut dans `scripts/seo/reports/seo-report-YYYY-MM-DD-Nd.md`
- Un HTML interactif avec plan d'action priorisé dans `scripts/seo/reports/seo-report-YYYY-MM-DD-Nd.html`

Le HTML est ouvert automatiquement dans le navigateur, sauf si `--no-open` est passé.

## Authentification

Le script utilise OAuth (compte Google `ademasagency@gmail.com` qui possède la propriété GSC `https://www.deskover.fr/`). Le token est stocké dans `.secrets/oauth-token.json` — pas d'action requise sauf si le token est invalide (auquel cas le navigateur s'ouvrira pour ré-autoriser).

## Plan d'action généré automatiquement

Le rapport contient 4 catégories d'actions :
- **⚡ Quick wins** : pages position 11-20 avec ≥30 impressions à pousser
- **🔧 Technique** : titles/metas peu attractifs, problèmes de marque
- **📝 Contenu** : articles `travailler-[ville]` à créer pour les villes avec impressions mais sans page
- **📍 Fiches lieu** : fiches sous-performantes à enrichir

## Arguments

L'utilisateur peut passer :
- `28`, `90`, `365` ou autre nombre → période en jours (défaut 28)
- `top50` ou `top100` → limite des tops affichés
- `no-open` → ne pas ouvrir le navigateur

## Instructions

$ARGUMENTS

1. Parse les arguments de l'utilisateur :
   - Si un nombre est mentionné, utilise-le pour `--days`
   - Si "no-open" est mentionné, ajoute `--no-open`
   - Sinon utilise les défauts (28 jours, ouverture auto)

2. Lance le script avec les bons arguments :
   ```bash
   cd /Users/thomassalandre/deskover/scripts && node seo/gsc-report.js [args]
   ```

3. Affiche un résumé concis à l'utilisateur :
   - Stats globales (clics, impressions, CTR, position moyenne)
   - Nombre d'actions par catégorie
   - Chemin du HTML généré

4. Si l'utilisateur veut une analyse plus poussée (par exemple "explique-moi les actions techniques"), lis le markdown généré et synthétise. Ne lis le HTML que si l'utilisateur veut voir un rendu particulier.

5. Si l'auth échoue (token expiré, accès refusé), explique à l'utilisateur qu'il doit relancer la commande dans un terminal directement (pour que le navigateur puisse s'ouvrir et compléter le flow OAuth).
