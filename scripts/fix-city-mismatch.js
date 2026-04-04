import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Charger la liste des villes connues
const { data: cities } = await s.from('cities').select('name, slug, city_key');
const cityMap = new Map();
for (const c of cities) {
  cityMap.set(c.city_key, c);
  // Aussi indexer par nom normalisé
  const norm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  cityMap.set(norm, c);
}

// Charger tous les lieux
let all = [];
let from = 0;
while (true) {
  const { data } = await s.from('places').select('id, name, city, city_key, address').eq('status', 'approved').range(from, from + 999);
  if (!data || data.length === 0) break;
  all.push(...data);
  from += 1000;
}

console.log(`Total lieux: ${all.length}\n`);

// Extraire la ville depuis l'adresse Google
function extractCityFromAddress(address) {
  if (!address) return null;
  // Format typique: "12 Rue X, 69001 Lyon, France" ou "12 Rue X, 64000 Pau, France"
  const match = address.match(/\d{5}\s+([^,]+),?\s*France/i);
  if (match) return match[1].trim();
  // Fallback: avant-dernier segment
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    const beforeFrance = parts[parts.length - 2];
    const cityMatch = beforeFrance.match(/\d{5}\s+(.+)/);
    if (cityMatch) return cityMatch[1].trim();
  }
  return null;
}

function slugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function findCityKey(cityName) {
  if (!cityName) return null;
  const norm = cityName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Match exact
  if (cityMap.has(norm)) return cityMap.get(norm).city_key;
  // Match par slug
  const slug = slugify(cityName);
  if (cityMap.has(slug)) return cityMap.get(slug).city_key;
  // Match partiel
  for (const [key, city] of cityMap) {
    if (key.includes(norm) || norm.includes(key)) return city.city_key;
  }
  return null;
}

let fixed = 0;
let notFound = 0;

for (const p of all) {
  if (!p.address || !p.city_key) continue;

  const addressLower = p.address.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cityKeyClean = p.city_key.replace(/-/g, ' ').replace(/paris (\d+)e/, 'paris');

  // Vérifier le mismatch
  let isMismatch = false;
  if (p.city_key.startsWith('paris-')) {
    if (!addressLower.includes('paris')) isMismatch = true;
  } else {
    const cityKeyParts = cityKeyClean.split(' ').filter(x => x.length > 3);
    const match = cityKeyParts.some(part => addressLower.includes(part));
    if (!match) isMismatch = true;
  }

  if (!isMismatch) continue;

  // Extraire la vraie ville de l'adresse
  const realCity = extractCityFromAddress(p.address);
  const newCityKey = findCityKey(realCity);

  if (newCityKey) {
    const { error } = await s.from('places').update({
      city_key: newCityKey,
      city: realCity
    }).eq('id', p.id);

    if (error) {
      console.log(`  ⚠️ ${p.name}: ${error.message}`);
    } else {
      console.log(`  ✅ ${p.name}: ${p.city_key} → ${newCityKey} (${realCity})`);
      fixed++;
    }
  } else {
    console.log(`  ❓ ${p.name}: ville "${realCity}" non trouvée dans nos villes — suppression`);
    await s.from('places').delete().eq('id', p.id);
    notFound++;
  }
}

console.log(`\n📋 Résumé:`);
console.log(`  - Réassignés: ${fixed}`);
console.log(`  - Supprimés (ville inconnue): ${notFound}`);
