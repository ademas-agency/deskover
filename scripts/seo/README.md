# Rapports SEO Deskover

Scripts de récupération des données SEO depuis Google Search Console via OAuth.

## Pré-requis

- Un client OAuth Desktop créé dans le projet GCP `deskover-492212`
- Le JSON du client placé dans `.secrets/oauth-client.json` (à la racine du repo)
- L'API **Google Search Console API** activée dans le projet GCP
- Un compte Google qui a accès à la propriété GSC `https://www.deskover.fr/`

## Première utilisation

```bash
cd scripts
node seo/gsc-report.js
```

Au premier lancement, le navigateur s'ouvre pour t'authentifier avec ton compte Google. Le token est sauvegardé dans `.secrets/oauth-token.json` — les exécutions suivantes seront silencieuses.

## Options

```bash
node seo/gsc-report.js                    # 28 derniers jours, top 50
node seo/gsc-report.js --days=90          # 3 derniers mois
node seo/gsc-report.js --days=365         # 12 derniers mois
node seo/gsc-report.js --top=100          # top 100 requêtes
node seo/gsc-report.js --min-impressions=200  # seuil opportunités plus strict
```

## Sortie

Génère un fichier markdown dans `scripts/seo/reports/seo-report-YYYY-MM-DD-Nd.md` (gitignored) contenant :

- **Vue d'ensemble** : clics, impressions, CTR, position moyenne sur la période
- **Top requêtes par clics** : ce qui ramène le plus de monde
- **Top requêtes par impressions** : ta visibilité (même sans clic)
- **Opportunités position 8-20** : requêtes qui tapent à la porte du top 10 — gain potentiel chiffré
- **Top 10 à CTR faible** : bien classé mais peu cliqué → souvent un problème de title/meta
- **Top pages par clics** : tes pages SEO performantes

## Variables d'environnement

- `GSC_SITE_URL` : URL de la propriété (par défaut `https://www.deskover.fr/`). Pour une propriété de domaine, utiliser `sc-domain:deskover.fr`.

## Réinitialiser l'auth

Supprimer `.secrets/oauth-token.json` pour forcer une nouvelle connexion.
