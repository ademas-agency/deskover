import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

let all = [];
let from = 0;
while (true) {
  const { data } = await s.from('places').select('city_key, city').eq('status', 'approved').range(from, from + 999);
  if (!data || data.length === 0) break;
  all.push(...data);
  from += 1000;
}

const counts = {};
for (const p of all) {
  if (!counts[p.city_key]) counts[p.city_key] = { city: p.city, count: 0 };
  counts[p.city_key].count++;
}

const sorted = Object.entries(counts).sort((a, b) => b[1].count - a[1].count);

console.log('Villes avec 3+ lieux (suffisant pour un article) :\n');
const eligible = sorted.filter(([, v]) => v.count >= 3);
eligible.forEach(([key, v]) => console.log(`  ${v.city} (${key}): ${v.count} lieux`));
console.log(`\nTotal: ${eligible.length} villes éligibles`);
console.log(`\nVilles avec < 3 lieux (pas d'article) :`);
sorted.filter(([, v]) => v.count < 3).forEach(([key, v]) => console.log(`  ${v.city} (${key}): ${v.count}`));

// Export JSON for scripts
import { writeFile } from 'fs/promises';
await writeFile(
  new URL('./data/cities-for-articles.json', import.meta.url),
  JSON.stringify(eligible.map(([key, v]) => ({ city_key: key, city: v.city, place_count: v.count })), null, 2)
);
console.log('\n→ Sauvegardé dans scripts/data/cities-for-articles.json');
