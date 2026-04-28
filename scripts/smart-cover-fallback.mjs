import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const STORAGE = `${process.env.SUPABASE_URL}/storage/v1/object/public/place-photos`;
const ARG_DRY_RUN = process.argv.includes('--dry-run');

// 1. Récupérer les pools
async function loadPool(filter) {
  const { data } = await filter
    .not('photo_storage_path', 'is', null)
    .order('curation_score', { ascending: false })
    .limit(500);
  return data || [];
}

const poolTerrasse = await loadPool(
  s.from('places').select('id, name, city_key, photo_storage_path, curation_score, latitude, longitude')
    .eq('status', 'approved')
    .in('place_type', ['cafe', 'coffee_shop', 'tiers_lieu'])
    .contains('signals', ['terrasse'])
);

const poolCafe = await loadPool(
  s.from('places').select('id, name, city_key, photo_storage_path, curation_score, latitude, longitude')
    .eq('status', 'approved')
    .in('place_type', ['cafe', 'coffee_shop'])
);

const poolCoworking = await loadPool(
  s.from('places').select('id, name, city_key, photo_storage_path, curation_score, latitude, longitude')
    .eq('status', 'approved')
    .eq('place_type', 'coworking')
);

console.log(`Pools : terrasse=${poolTerrasse.length}, café=${poolCafe.length}, coworking=${poolCoworking.length}\n`);

// 2. Coordonnées des villes (depuis les places)
const cityCoords = {};
for (const p of [...poolTerrasse, ...poolCafe, ...poolCoworking]) {
  if (!p.latitude || !p.longitude) continue;
  cityCoords[p.city_key] = cityCoords[p.city_key] || { lat: 0, lng: 0, n: 0 };
  cityCoords[p.city_key].lat += p.latitude;
  cityCoords[p.city_key].lng += p.longitude;
  cityCoords[p.city_key].n++;
}
for (const k in cityCoords) {
  cityCoords[k].lat /= cityCoords[k].n;
  cityCoords[k].lng /= cityCoords[k].n;
}

function distance(a, b) {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat/2)**2 + Math.sin(dLng/2)**2 * Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat));
  return 2 * R * Math.asin(Math.sqrt(x));
}

// 3. Catégorisation des évergreen par mots-clés du slug
function evergreenCategory(slug) {
  if (/terrasse/.test(slug)) return 'terrasse';
  if (/coworking/.test(slug)) return 'coworking';
  if (/cafe|café/.test(slug)) return 'cafe';
  if (/dimanche/.test(slug)) return 'cafe';
  if (/freelance|salarie-remote|nomad|kit-bosseur/.test(slug)) return 'cafe';
  if (/mer|montagne|vacances|petites-villes/.test(slug)) return 'cafe';
  if (/wifi|visio/.test(slug)) return 'cafe';
  return 'cafe';
}

// 4. Pour chaque article à habiller, choisir un lieu
const { data: articles } = await s
  .from('articles')
  .select('id, slug, city_slug, cover_image, title')
  .eq('published', true)
  .is('cover_image', null);

console.log(`${articles.length} articles à habiller\n`);

const usedPaths = new Set();
let updated = 0;
let noPick = 0;

function pickFromPool(pool, refCoords, slug) {
  // Essai 1 : lieu dans la même ville
  // Essai 2 : lieu dans la ville la plus proche
  // Diversification : pas de re-utilisation
  let candidates = [...pool];

  if (refCoords) {
    candidates = candidates
      .filter(p => p.latitude && p.longitude)
      .map(p => ({ ...p, _d: distance(refCoords, { lat: p.latitude, lng: p.longitude }) }))
      .sort((a, b) => a._d - b._d);
  }

  // Score combiné : distance + curation_score (penalty pour usage)
  for (const c of candidates) {
    if (!usedPaths.has(c.photo_storage_path)) {
      return c;
    }
  }
  return candidates[0] || null;
}

for (const article of articles) {
  const slug = article.slug;
  let pool;

  if (slug.startsWith('terrasse-')) {
    pool = poolTerrasse;
  } else if (slug.startsWith('travailler-') || slug.startsWith('cafes-')) {
    pool = poolCafe;
  } else {
    // Évergreen
    const cat = evergreenCategory(slug);
    pool = cat === 'terrasse' ? poolTerrasse
         : cat === 'coworking' ? poolCoworking
         : poolCafe;
  }

  const refCoords = article.city_slug && cityCoords[article.city_slug] ? cityCoords[article.city_slug] : null;
  const chosen = pickFromPool(pool, refCoords, slug);

  if (!chosen) {
    console.log(`  ⊘ ${slug} (aucun candidat dans le pool)`);
    noPick++;
    continue;
  }

  usedPaths.add(chosen.photo_storage_path);
  const newUrl = `${STORAGE}/${chosen.photo_storage_path}`;
  const distLabel = chosen._d ? ` ~${chosen._d.toFixed(0)}km` : '';
  console.log(`  ✓ ${slug.padEnd(48)} → ${chosen.name} (${chosen.city_key}${distLabel})`);

  if (!ARG_DRY_RUN) {
    await s.from('articles').update({ cover_image: newUrl }).eq('id', article.id);
  }
  updated++;
}

console.log(`\nMis à jour : ${updated}`);
console.log(`Non assignés : ${noPick}`);
console.log(`Photos uniques utilisées : ${usedPaths.size}`);
if (ARG_DRY_RUN) console.log('(dry-run)');
