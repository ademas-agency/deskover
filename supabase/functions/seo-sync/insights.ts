// Moteur d'insights GSC porté du script Node vers TypeScript Deno
// (loadExistingArticles devient un argument injecté car le filesystem n'est pas dispo)

interface GscRow { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }
interface Totals { clicks: number; impressions: number; ctr: number; position: number }
interface Insight {
  type: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  action: string
  page?: string
  query?: string
  position?: number
  impressions?: number
  ctr?: number
  clicks?: number
  city?: string
}

const CITIES = [
  'paris', 'lyon', 'marseille', 'toulouse', 'nice', 'nantes', 'strasbourg', 'montpellier',
  'bordeaux', 'lille', 'rennes', 'reims', 'le havre', 'saint-etienne', 'toulon', 'grenoble',
  'dijon', 'angers', 'nimes', 'villeurbanne', 'clermont-ferrand', 'aix-en-provence', 'brest',
  'tours', 'limoges', 'amiens', 'perpignan', 'metz', 'besancon', 'orleans', 'rouen', 'caen',
  'nancy', 'argenteuil', 'roubaix', 'tourcoing', 'avignon', 'poitiers', 'pau', 'la rochelle',
  'annecy', 'antibes', 'cannes', 'biarritz', 'mulhouse', 'le mans', 'colmar', 'versailles',
]

function extractCity(q: string): string | null {
  const lower = q.toLowerCase()
  for (const c of CITIES) {
    if (lower.includes(c)) return c.replace(/ /g, '-')
  }
  return null
}

export function generateInsights(
  queries: GscRow[],
  pages: GscRow[],
  pairs: GscRow[],
  totals: Totals,
  existingSlugs: Set<string>,
) {
  const quickWins: Insight[] = []
  const technicalIssues: Insight[] = []
  const contentSuggestions: Insight[] = []
  const placeImprovements: Insight[] = []

  // 1. Quick wins : position 11-20 avec >30 impressions
  const pushPagePairs = pairs
    .filter(r => r.position >= 11 && r.position <= 20 && r.impressions >= 30)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)

  for (const r of pushPagePairs) {
    quickWins.push({
      type: 'push-position',
      priority: 'high',
      title: `Pousser "${r.keys[0]}"`,
      description: `Position ${r.position.toFixed(1)} avec ${r.impressions} impressions. Top 5 ferait gagner ~${Math.round(r.impressions * 0.08)} clics/mois.`,
      page: r.keys[1],
      query: r.keys[0],
      position: r.position,
      impressions: r.impressions,
      action: 'Étoffer le contenu de la page cible (texte, FAQ, maillage interne) et ajouter des backlinks internes depuis les pages les mieux placées.',
    })
  }

  // 2. CTR faible top 10
  const lowCtrTop10 = queries
    .filter(r => r.position <= 10 && r.impressions >= 20 && r.ctr < totals.ctr * 0.5)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)

  for (const r of lowCtrTop10) {
    const pair = pairs.find(p => p.keys[0] === r.keys[0])
    technicalIssues.push({
      type: 'low-ctr',
      priority: 'high',
      title: `Title/Meta peu attractifs : "${r.keys[0]}"`,
      description: `Position ${r.position.toFixed(1)} mais ${(r.ctr * 100).toFixed(2)}% de CTR (vs ${(totals.ctr * 100).toFixed(2)}% en moyenne).`,
      page: pair?.keys[1],
      query: r.keys[0],
      position: r.position,
      impressions: r.impressions,
      ctr: r.ctr,
      action: 'Réécrire le <title> (50-60 car., promesse claire) et la <meta description> (140-160 car., bénéfice + appel à l\'action).',
    })
  }

  // 3. Contenu : villes avec impressions mais sans article
  const cityImpressions = new Map<string, { impressions: number; clicks: number; queries: string[] }>()
  for (const r of queries) {
    const city = extractCity(r.keys[0])
    if (!city) continue
    const e = cityImpressions.get(city) || { impressions: 0, clicks: 0, queries: [] }
    e.impressions += r.impressions
    e.clicks += r.clicks
    e.queries.push(r.keys[0])
    cityImpressions.set(city, e)
  }

  const sorted = [...cityImpressions.entries()]
    .filter(([_, d]) => d.impressions >= 30)
    .sort((a, b) => b[1].impressions - a[1].impressions)

  for (const [city, d] of sorted.slice(0, 15)) {
    const has =
      existingSlugs.has(`travailler-${city}`) ||
      existingSlugs.has(`travailler-dimanche-${city}`) ||
      existingSlugs.has(`terrasse-${city}`) ||
      existingSlugs.has(`cafes-travailler-${city}`) ||
      existingSlugs.has(`cafes-${city}`)
    if (!has) {
      contentSuggestions.push({
        type: 'create-article',
        priority: d.impressions >= 100 ? 'high' : 'medium',
        title: `Créer un article "Travailler à ${city.replace(/-/g, ' ')}"`,
        description: `${d.impressions} impressions sur des requêtes contenant "${city}" sans article dédié. Top requêtes : ${d.queries.slice(0, 3).join(', ')}.`,
        city,
        impressions: d.impressions,
        clicks: d.clicks,
        action: `Créer la page /articles/travailler-${city} (top 5-10 lieux, conseils, accès, budget). Lier depuis /ville/${city}.`,
      })
    }
  }

  // 4. Lieux faiblement performants
  const placeQueries = queries
    .filter(r => r.position >= 5 && r.position <= 15 && r.impressions >= 15 && r.ctr < 0.05)
    .filter(r => !r.keys[0].match(/coworking|cafe|café|travailler|wifi|teletravail|bureau/i))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)

  for (const r of placeQueries) {
    const pair = pairs.find(p => p.keys[0] === r.keys[0])
    if (pair?.keys[1].includes('/lieu/')) {
      placeImprovements.push({
        type: 'improve-place',
        priority: 'medium',
        title: `Enrichir la fiche lieu : "${r.keys[0]}"`,
        description: `Position ${r.position.toFixed(1)} avec ${r.impressions} impressions mais ${(r.ctr * 100).toFixed(2)}% de CTR.`,
        page: pair.keys[1],
        query: r.keys[0],
        position: r.position,
        impressions: r.impressions,
        action: 'Ajouter photos, signaux (wifi, prises, calme), description longue, avis, FAQ, schema.org LocalBusiness.',
      })
    }
  }

  // 5. Niches
  const matchers: Array<[string, RegExp]> = [
    ['coworking + roubaix', /coworking.*roubaix|roubaix.*coworking/],
    ['coworking + perpignan', /coworking.*perpignan|perpignan.*coworking/],
    ['coworking + orléans', /coworking.*orl(é|e)ans/],
    ['café wifi', /caf(é|e).*wifi|wifi.*caf(é|e)/],
    ['travailler dimanche', /travailler.*dimanche|dimanche.*travailler|ouvert.*dimanche/],
    ['coworking gare', /coworking.*gare|gare.*coworking/],
  ]
  const niches = new Map<string, { impressions: number; clicks: number; queries: string[] }>()
  for (const r of queries) {
    const lower = r.keys[0].toLowerCase()
    for (const [n, regex] of matchers) {
      if (regex.test(lower)) {
        const e = niches.get(n) || { impressions: 0, clicks: 0, queries: [] }
        e.impressions += r.impressions
        e.clicks += r.clicks
        if (e.queries.length < 5) e.queries.push(r.keys[0])
        niches.set(n, e)
      }
    }
  }
  const strategy = [...niches.entries()]
    .filter(([_, d]) => d.impressions >= 50)
    .sort((a, b) => b[1].impressions - a[1].impressions)
    .map(([niche, d]) => ({
      niche,
      impressions: d.impressions,
      clicks: d.clicks,
      queries: d.queries,
      action: `Créer un cluster de pages autour de "${niche}" (article pilier + fiches lieu liées + maillage interne).`,
    }))

  // 6. Brand
  const brand = queries.find(q => q.keys[0].toLowerCase() === 'deskover')
  if (brand && brand.position > 1.5) {
    technicalIssues.unshift({
      type: 'brand-position',
      priority: 'critical',
      title: `Marque "deskover" en position ${brand.position.toFixed(1)}`,
      description: `Le mot-clé de marque devrait être en position 1.`,
      query: 'deskover',
      position: brand.position,
      impressions: brand.impressions,
      action: 'Vérifier le <title> de la homepage, créer un schema.org Organization, demander une re-indexation.',
    })
  }

  return { quickWins, technicalIssues, contentSuggestions, placeImprovements, strategy }
}
