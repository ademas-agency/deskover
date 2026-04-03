import 'dotenv/config';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const QUERIES_PER_CITY = [
  'meilleurs cafés pour travailler {city}',
  'où télétravailler {city}',
  'café wifi coworking {city}',
  'coffee shop laptop friendly {city}',
  'coworking café {city} blog',
];

const DELAY_MS = 300; // pause entre requêtes pour être poli

async function searchSerper(query) {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      gl: 'fr',
      hl: 'fr',
      num: 10,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Serper error ${res.status}: ${text}`);
  }

  return res.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSearchName(city) {
  // Pour les arrondissements parisiens, adapter les requêtes
  if (city.type === 'arrondissement') {
    // "Paris 11e" → chercher aussi avec les quartiers connus
    return city.name;
  }
  return city.name;
}

async function main() {
  if (!SERPER_API_KEY) {
    console.error('❌ SERPER_API_KEY manquante dans .env');
    process.exit(1);
  }

  const cities = JSON.parse(
    await readFile(new URL('./data/cities.json', import.meta.url), 'utf-8')
  );

  console.log(`🔍 ${cities.length} entités × ${QUERIES_PER_CITY.length} requêtes = ${cities.length * QUERIES_PER_CITY.length} recherches\n`);

  const outputDir = new URL('./data/search-results/', import.meta.url);
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  // Vérifier s'il y a déjà des résultats (reprise possible)
  const allResults = [];
  let queryCount = 0;
  let skipCount = 0;

  for (const city of cities) {
    const cityFile = new URL(`./data/search-results/${city.slug}.json`, import.meta.url);

    // Skip si déjà traité
    if (existsSync(cityFile)) {
      const existing = JSON.parse(await readFile(cityFile, 'utf-8'));
      allResults.push(...existing);
      skipCount++;
      continue;
    }

    const cityResults = [];
    const searchName = getSearchName(city);

    for (const template of QUERIES_PER_CITY) {
      const query = template.replace('{city}', searchName);

      try {
        const data = await searchSerper(query);
        queryCount++;

        const organic = (data.organic || []).map((r) => ({
          title: r.title,
          url: r.link,
          snippet: r.snippet,
          position: r.position,
          query,
          city_slug: city.slug,
          city_name: city.name,
        }));

        cityResults.push(...organic);

        if (queryCount % 50 === 0) {
          console.log(`  📊 ${queryCount} requêtes effectuées...`);
        }

        await sleep(DELAY_MS);
      } catch (err) {
        console.error(`  ⚠️ Erreur pour "${query}": ${err.message}`);
      }
    }

    // Dédupliquer par URL pour cette ville
    const seen = new Set();
    const uniqueResults = cityResults.filter((r) => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    // Sauvegarder par ville (pour reprise)
    await writeFile(cityFile, JSON.stringify(uniqueResults, null, 2));
    allResults.push(...uniqueResults);

    console.log(`✅ ${city.name}: ${uniqueResults.length} URLs uniques (${cityResults.length} brutes)`);
  }

  // Dédupliquer globalement par URL
  const globalSeen = new Set();
  const globalUnique = allResults.filter((r) => {
    if (globalSeen.has(r.url)) return false;
    globalSeen.add(r.url);
    return true;
  });

  // Sauvegarder le résultat global
  await writeFile(
    new URL('./data/all-search-results.json', import.meta.url),
    JSON.stringify(globalUnique, null, 2)
  );

  console.log(`\n📋 Résumé :`);
  console.log(`  - Entités traitées : ${cities.length - skipCount} nouvelles + ${skipCount} reprises`);
  console.log(`  - Requêtes Serper effectuées : ${queryCount}`);
  console.log(`  - URLs totales : ${allResults.length}`);
  console.log(`  - URLs uniques : ${globalUnique.length}`);
  console.log(`  → Sauvegardé dans scripts/data/all-search-results.json`);
}

main().catch(console.error);
