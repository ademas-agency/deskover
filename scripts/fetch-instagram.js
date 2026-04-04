import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DELAY_MS = 300;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractInstagramHandle(results) {
  for (const r of results) {
    const url = r.link || '';
    // Match instagram.com/username/ (not /p/, /reel/, /explore/, etc.)
    const match = url.match(/instagram\.com\/([a-zA-Z0-9_.]+)\/?$/);
    if (match && !['p', 'reel', 'explore', 'stories', 'accounts', 'directory'].includes(match[1])) {
      return match[1];
    }
  }
  return null;
}

async function searchInstagram(name, city) {
  const query = `"${name}" "${city}" site:instagram.com`;
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, gl: 'fr', hl: 'fr', num: 5 }),
  });

  if (!res.ok) throw new Error(`Serper ${res.status}`);
  const data = await res.json();
  return extractInstagramHandle(data.organic || []);
}

async function main() {
  // Charger tous les lieux sans Instagram
  let places = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from('places')
      .select('id, name, city')
      .eq('status', 'approved')
      .is('instagram_handle', null)
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    places.push(...data);
    from += 1000;
  }

  console.log(`🔍 Recherche Instagram pour ${places.length} lieux\n`);

  let found = 0;
  let notFound = 0;

  for (let i = 0; i < places.length; i++) {
    const p = places[i];

    try {
      const handle = await searchInstagram(p.name, p.city);

      if (handle) {
        await supabase.from('places').update({ instagram_handle: handle }).eq('id', p.id);
        found++;
      } else {
        notFound++;
      }
    } catch (err) {
      console.error(`  ⚠️ ${p.name}: ${err.message}`);
      notFound++;
    }

    if ((i + 1) % 100 === 0) {
      console.log(`  📊 ${i + 1}/${places.length} — ${found} trouvés, ${notFound} non trouvés`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n📋 Résumé:`);
  console.log(`  - Recherchés: ${places.length}`);
  console.log(`  - Instagram trouvé: ${found}`);
  console.log(`  - Non trouvé: ${notFound}`);
  console.log(`  - Taux: ${Math.round(found / places.length * 100)}%`);
}

main().catch(console.error);
