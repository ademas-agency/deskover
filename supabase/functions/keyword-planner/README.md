# Edge function `keyword-planner`

Interroge Google Ads Keyword Planner API depuis le BO et cache les résultats 30 jours dans la table `keyword_ideas`.

## Setup à faire **après validation du Basic Access par Google**

### 1. Récupérer le vrai Developer Token

L'email de validation arrive sur `contact@ademas-agency.com` (ou l'adresse renseignée dans le Centre API). Le nouveau token remplace l'ancien token de test dans Google Ads → Outils → Admin → Centre API.

### 2. Étendre le scope OAuth

Le refresh token GSC/GA4 actuel ne contient pas le scope `adwords`. Il faut le refaire **sur `ademasagency@gmail.com`** (le compte qui a déjà l'OAuth GSC + qui a été ajouté comme admin du compte Ads `814-993-3027`).

Édite `scripts/seo/auth.js` :

```js
const SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/adwords',  // ← ajouter
];
```

Supprime le token existant pour forcer un nouveau consent :

```bash
rm .secrets/oauth-token.json
node --env-file=.env scripts/seo/gsc-sync.js --period 7
# → ouvre le navigateur, accepter les 3 scopes (GSC + GA4 + Ads)
```

Le nouveau `.secrets/oauth-token.json` contient un refresh_token valide pour les 3 APIs.

### 3. Exécuter la migration SQL

Dans Supabase SQL Editor, copier-coller le contenu de `migration-keyword-ideas.sql`.

### 4. Mettre à jour les secrets Supabase

```bash
# Le nouveau refresh token (avec scope adwords)
supabase secrets set GOOGLE_OAUTH_REFRESH_TOKEN="$(jq -r '.refresh_token' .secrets/oauth-token.json)"

# Le vrai developer token (Basic Access)
supabase secrets set GOOGLE_ADS_DEVELOPER_TOKEN="<vrai-token-recu-par-email>"

# Le customer ID sans tirets
supabase secrets set GOOGLE_ADS_CUSTOMER_ID="8149933027"

# Optionnel : login-customer-id si tu passes par un MCC (pas le cas ici, on est en first-party)
# supabase secrets set GOOGLE_ADS_LOGIN_CUSTOMER_ID="..."
```

### 5. Déployer la fonction

⚠️ **Sans `--no-verify-jwt`** (contrairement à `seo-sync`) : la fonction est appelée par le BO avec le JWT user, donc Supabase doit vérifier le JWT lui-même.

```bash
supabase functions deploy keyword-planner
```

### 6. Tester

Depuis le BO (`/seo` → onglet Mots-clés), tape un mot-clé non positionné et clique "Volume Google Ads". Tu devrais voir le volume mensuel + concurrence apparaître.

Ou directement en curl avec un JWT user valide :

```bash
TOKEN="<JWT user récupéré depuis le BO>"
curl -X POST "https://kxfmpalgzbtiiboeceww.supabase.co/functions/v1/keyword-planner" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keyword": "café coworking paris"}'
```

## Coût et limites

- **Gratuit** dans les limites Basic Access (15 000 ops/jour).
- On consomme ~1 op par recherche utilisateur, et chaque résultat est caché 30 jours.
- Estimation : <100 calls/jour, largement sous la limite.

## Logs et debug

```bash
supabase functions logs keyword-planner
```

## Notes techniques

- API Google Ads version `v17` (mettre à jour annuellement, ~3 mois de marge avant deprecation)
- Géo-target : `geoTargetConstants/2250` = France
- Langue : `languageConstants/1002` = Français
- Réseau : `GOOGLE_SEARCH` (sans display network)
