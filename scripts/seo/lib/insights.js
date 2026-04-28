import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');

function loadExistingArticles() {
  const slugs = new Set();
  // Source 1 : Markdown files dans app/content/articles (autoritaire)
  const mdDir = path.join(ROOT, 'app/content/articles');
  if (fs.existsSync(mdDir)) {
    try {
      for (const f of fs.readdirSync(mdDir)) {
        if (f.endsWith('.md')) slugs.add(f.replace(/\.md$/, ''));
      }
    } catch {}
  }
  // Source 2 : cache JSON optionnel (fallback)
  const cached = path.join(ROOT, 'scripts/data/articles.json');
  try {
    if (fs.existsSync(cached)) {
      const data = JSON.parse(fs.readFileSync(cached, 'utf8'));
      if (Array.isArray(data)) data.forEach((a) => a.slug && slugs.add(a.slug));
    }
  } catch {}
  return slugs;
}

function loadExistingCities() {
  const slugs = new Set();
  const enriched = path.join(ROOT, 'scripts/data/enriched-places.json');
  if (fs.existsSync(enriched)) {
    try {
      const data = JSON.parse(fs.readFileSync(enriched, 'utf8'));
      data.forEach((p) => {
        if (p.city) slugs.add(p.city.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-'));
      });
    } catch {}
  }
  return slugs;
}

function extractCityFromQuery(q) {
  const cities = [
    'paris', 'lyon', 'marseille', 'toulouse', 'nice', 'nantes', 'strasbourg', 'montpellier',
    'bordeaux', 'lille', 'rennes', 'reims', 'le havre', 'saint-etienne', 'toulon', 'grenoble',
    'dijon', 'angers', 'nimes', 'villeurbanne', 'clermont-ferrand', 'aix-en-provence', 'brest',
    'tours', 'limoges', 'amiens', 'perpignan', 'metz', 'besancon', 'orleans', 'rouen', 'caen',
    'nancy', 'argenteuil', 'roubaix', 'tourcoing', 'avignon', 'poitiers', 'pau', 'la rochelle',
    'annecy', 'antibes', 'cannes', 'biarritz', 'mulhouse', 'le mans', 'colmar', 'versailles',
    'asnieres', 'levallois', 'boulogne', 'pantin', 'montreuil', 'vincennes', 'saint-denis',
    'issy-les-moulineaux', 'puteaux', 'nanterre', 'courbevoie', 'creteil',
  ];
  const lower = q.toLowerCase();
  for (const city of cities) {
    if (lower.includes(city)) return city.replace(/ /g, '-');
  }
  return null;
}

export function generateInsights(data) {
  const { queries, pages, queryPagePairs, totals } = data;
  const { ctr: avgCtr } = totals;

  const existingArticles = loadExistingArticles();
  const existingCities = loadExistingCities();

  const quickWins = [];
  const technicalIssues = [];
  const contentSuggestions = [];
  const placeImprovements = [];

  // 1. QUICK WINS — Pages position 11-20 avec >30 impressions = à pousser
  const pushPagePairs = queryPagePairs
    .filter((r) => r.position >= 11 && r.position <= 20 && r.impressions >= 30)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  for (const r of pushPagePairs) {
    quickWins.push({
      type: 'push-position',
      priority: 'high',
      title: `Pousser "${r.keys[0]}"`,
      description: `Cette requête est en position ${r.position.toFixed(1)} avec ${r.impressions} impressions. Atteindre le top 5 ferait gagner ~${Math.round(r.impressions * 0.08)} clics/mois.`,
      page: r.keys[1],
      query: r.keys[0],
      position: r.position,
      impressions: r.impressions,
      action: 'Étoffer le contenu de la page cible (texte, FAQ, maillage interne) et ajouter des backlinks internes depuis les pages les mieux placées.',
    });
  }

  // 2. CTR FAIBLE en TOP 10 — problème de title/meta
  const lowCtrTop10 = queries
    .filter((r) => r.position <= 10 && r.impressions >= 20 && r.ctr < avgCtr * 0.5)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  for (const r of lowCtrTop10) {
    const matchingPair = queryPagePairs.find((p) => p.keys[0] === r.keys[0]);
    technicalIssues.push({
      type: 'low-ctr',
      priority: 'high',
      title: `Title/Meta peu attractifs : "${r.keys[0]}"`,
      description: `Position ${r.position.toFixed(1)} mais seulement ${(r.ctr * 100).toFixed(2)}% de CTR (vs ${(avgCtr * 100).toFixed(2)}% en moyenne). Le résultat n'attire pas les clics.`,
      page: matchingPair?.keys[1],
      query: r.keys[0],
      position: r.position,
      impressions: r.impressions,
      ctr: r.ctr,
      action: 'Réécrire le <title> (50-60 car., chiffre/promesse claire) et la <meta description> (140-160 car., bénéfice + appel à l\'action).',
    });
  }

  // 3. CONTENU — villes avec impressions mais sans article ou page dédiée
  const cityImpressions = new Map();
  for (const r of queries) {
    const city = extractCityFromQuery(r.keys[0]);
    if (!city) continue;
    if (!cityImpressions.has(city)) cityImpressions.set(city, { impressions: 0, clicks: 0, queries: [] });
    const entry = cityImpressions.get(city);
    entry.impressions += r.impressions;
    entry.clicks += r.clicks;
    entry.queries.push(r.keys[0]);
  }

  const sortedCities = [...cityImpressions.entries()]
    .filter(([city, d]) => d.impressions >= 30)
    .sort((a, b) => b[1].impressions - a[1].impressions);

  for (const [city, d] of sortedCities.slice(0, 15)) {
    const hasArticle =
      existingArticles.has(`travailler-${city}`) ||
      existingArticles.has(`travailler-dimanche-${city}`) ||
      existingArticles.has(`terrasse-${city}`) ||
      existingArticles.has(`cafes-travailler-${city}`) ||
      existingArticles.has(`cafes-${city}`);
    if (!hasArticle && d.impressions >= 30) {
      contentSuggestions.push({
        type: 'create-article',
        priority: d.impressions >= 100 ? 'high' : 'medium',
        title: `Créer un article "Travailler à ${city.replace(/-/g, ' ')}"`,
        description: `${d.impressions} impressions sur des requêtes contenant "${city}" sans article dédié. Top requêtes : ${d.queries.slice(0, 3).join(', ')}.`,
        city,
        impressions: d.impressions,
        clicks: d.clicks,
        action: `Créer la page /articles/travailler-${city} avec un guide complet (top 5-10 lieux, conseils, accès, budget). Lier depuis /ville/${city}.`,
      });
    }
  }

  // 4. AMÉLIORATIONS FICHES LIEU — lieux mentionnés avec faibles perfs
  const placeQueries = queries
    .filter((r) => r.position >= 5 && r.position <= 15 && r.impressions >= 15 && r.ctr < 0.05)
    .filter((r) => !r.keys[0].match(/coworking|cafe|café|travailler|wifi|teletravail|bureau/i))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  for (const r of placeQueries) {
    const matchingPair = queryPagePairs.find((p) => p.keys[0] === r.keys[0]);
    if (matchingPair?.keys[1].includes('/lieu/')) {
      placeImprovements.push({
        type: 'improve-place',
        priority: 'medium',
        title: `Enrichir la fiche lieu : "${r.keys[0]}"`,
        description: `Position ${r.position.toFixed(1)} avec ${r.impressions} impressions mais ${(r.ctr * 100).toFixed(2)}% de CTR.`,
        page: matchingPair.keys[1],
        query: r.keys[0],
        position: r.position,
        impressions: r.impressions,
        action: 'Ajouter photos, signal vitals (wifi, prises, calme), description longue, avis, FAQ. Vérifier le schema.org LocalBusiness complet.',
      });
    }
  }

  // 5. STRATÉGIE — niches détectées
  const nicheCounts = new Map();
  for (const r of queries) {
    const lower = r.keys[0].toLowerCase();
    const nicheMatchers = [
      ['coworking + roubaix', /coworking.*roubaix|roubaix.*coworking/],
      ['coworking + perpignan', /coworking.*perpignan|perpignan.*coworking/],
      ['coworking + orléans', /coworking.*orl(é|e)ans/],
      ['café wifi', /caf(é|e).*wifi|wifi.*caf(é|e)/],
      ['travailler dimanche', /travailler.*dimanche|dimanche.*travailler|ouvert.*dimanche/],
      ['coworking gare', /coworking.*gare|gare.*coworking/],
    ];
    for (const [niche, regex] of nicheMatchers) {
      if (regex.test(lower)) {
        if (!nicheCounts.has(niche)) nicheCounts.set(niche, { impressions: 0, clicks: 0, queries: [] });
        const entry = nicheCounts.get(niche);
        entry.impressions += r.impressions;
        entry.clicks += r.clicks;
        if (entry.queries.length < 5) entry.queries.push(r.keys[0]);
      }
    }
  }

  const niches = [...nicheCounts.entries()]
    .filter(([, d]) => d.impressions >= 50)
    .sort((a, b) => b[1].impressions - a[1].impressions);

  const strategy = niches.map(([niche, d]) => ({
    niche,
    impressions: d.impressions,
    clicks: d.clicks,
    queries: d.queries,
    action: `Créer un cluster de pages autour de "${niche}" (article pilier + fiches lieu liées + maillage interne).`,
  }));

  // BRAND
  const brandQuery = queries.find((q) => q.keys[0].toLowerCase() === 'deskover');
  if (brandQuery && brandQuery.position > 1.5) {
    technicalIssues.unshift({
      type: 'brand-position',
      priority: 'critical',
      title: `Marque "deskover" en position ${brandQuery.position.toFixed(1)}`,
      description: `Le mot-clé de marque devrait être en position 1. Actuellement ${brandQuery.position.toFixed(1)} → indique un problème d'autorité ou de homonymie.`,
      query: 'deskover',
      position: brandQuery.position,
      impressions: brandQuery.impressions,
      action: 'Vérifier le <title> de la homepage (doit contenir "Deskover" en premier), créer un schema.org Organization, demander à Google une re-indexation, soumettre au Knowledge Graph via about page.',
    });
  }

  return { quickWins, technicalIssues, contentSuggestions, placeImprovements, strategy };
}
