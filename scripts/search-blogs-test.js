// Test rapide sur 2 villes pour valider le pipeline
import 'dotenv/config';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const SERPER_API_KEY = process.env.SERPER_API_KEY;

const TEST_CITIES = [
  { name: 'Lyon', slug: 'lyon', department: '69', type: 'city' },
  { name: 'Paris 11e', slug: 'paris-11e', department: '75', type: 'arrondissement' },
];

const QUERIES = [
  'meilleurs cafés pour travailler {city}',
  'où télétravailler {city}',
];

async function searchSerper(query) {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, gl: 'fr', hl: 'fr', num: 10 }),
  });
  if (!res.ok) throw new Error(`Serper ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  if (!SERPER_API_KEY) {
    console.error('❌ SERPER_API_KEY manquante');
    process.exit(1);
  }

  console.log('🧪 Test avec 2 villes × 2 requêtes = 4 appels Serper\n');

  for (const city of TEST_CITIES) {
    for (const tpl of QUERIES) {
      const query = tpl.replace('{city}', city.name);
      console.log(`🔍 "${query}"`);

      const data = await searchSerper(query);
      const results = (data.organic || []).slice(0, 5);

      for (const r of results) {
        console.log(`   ${r.position}. ${r.title}`);
        console.log(`      ${r.link}`);
      }
      console.log();
    }
  }

  console.log('✅ Test terminé (4 crédits Serper utilisés)');
}

main().catch(console.error);
