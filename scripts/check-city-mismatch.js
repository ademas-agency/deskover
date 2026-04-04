import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Paginer pour tout récupérer
let all = [];
let from = 0;
while (true) {
  const { data } = await s.from('places').select('id, name, city, city_key, address').eq('status', 'approved').range(from, from + 999);
  if (!data || data.length === 0) break;
  all.push(...data);
  from += 1000;
}

console.log(`Total lieux: ${all.length}`);

let mismatches = 0;
const toDelete = [];

for (const p of all) {
  if (!p.address || !p.city_key) continue;

  const addressLower = p.address.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cityFromAddress = p.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cityKeyClean = p.city_key.replace(/-/g, ' ').replace(/paris (\d+)e/, 'paris');

  // Pour Paris : vérifier que l'adresse contient "Paris"
  if (p.city_key.startsWith('paris-')) {
    if (!addressLower.includes('paris')) {
      mismatches++;
      toDelete.push({ id: p.id, name: p.name, city_key: p.city_key, address: p.address, city: p.city });
    }
    continue;
  }

  // Pour les autres villes : vérifier que l'adresse ou la ville Google contient le city_key
  const cityKeyParts = cityKeyClean.split(' ').filter(x => x.length > 3);
  const match = cityKeyParts.some(part => addressLower.includes(part) || cityFromAddress.includes(part));

  if (!match) {
    mismatches++;
    toDelete.push({ id: p.id, name: p.name, city_key: p.city_key, address: p.address, city: p.city });
  }
}

console.log(`Mismatches: ${mismatches}\n`);
toDelete.forEach(e => {
  console.log(`  ❌ ${e.name} — assigné à: ${e.city_key} — adresse réelle: ${e.address}`);
});

if (toDelete.length > 0) {
  console.log(`\nSupprimer ces ${toDelete.length} lieux mal classés ? (IDs ci-dessous)`);
  toDelete.forEach(e => console.log(e.id));
}
