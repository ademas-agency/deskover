import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const STORAGE_BASE = `${process.env.SUPABASE_URL}/storage/v1/object/public`;

// Préférence par type de lieu (les cafés/coffee shops ont en général de bien meilleures photos Google)
const TYPE_PRIORITY = {
  cafe: 1,
  coffee_shop: 1,
  tiers_lieu: 2,
  coworking: 3,
};

const ARG_DRY_RUN = process.argv.includes('--dry-run');

const { data: articles } = await s
  .from('articles')
  .select('id, slug, places, city_slug, cover_image, title')
  .eq('published', true);

const placeIds = [...new Set(articles.flatMap(a => a.places || []).filter(Boolean))];
console.log(`${placeIds.length} place IDs à charger`);

// Paginate to avoid hitting URL/query limits
const places = [];
const chunkSize = 200;
for (let i = 0; i < placeIds.length; i += chunkSize) {
  const chunk = placeIds.slice(i, i + chunkSize);
  const { data, error } = await s
    .from('places')
    .select('id, name, slug, city_key, place_type, photo_url, photo_storage_path, photos, signals')
    .in('id', chunk);
  if (error) { console.error('Error:', error.message); process.exit(1); }
  places.push(...(data || []));
}
console.log(`${places.length} places chargés\n`);
const placeMap = new Map(places.map(p => [p.id, p]));

function getStoragePath(place) {
  if (place.photo_storage_path) return place.photo_storage_path;
  if (Array.isArray(place.photos) && place.photos.length > 0) return place.photos[0];
  return null;
}

function rankPlace(place, isTerrasseArticle) {
  const typeScore = TYPE_PRIORITY[place.place_type] || 5;
  const hasTerrasse = Array.isArray(place.signals) && place.signals.includes('terrasse');
  const terrasseBonus = isTerrasseArticle && hasTerrasse ? -10 : 0;
  return typeScore + terrasseBonus;
}

let updated = 0;
let cleared = 0;
let kept = 0;
const usedPaths = new Set();

console.log(`Audit de ${articles.length} articles...\n`);

for (const article of articles) {
  const isTerrasse = article.slug.startsWith('terrasse-');
  const isCity = article.slug.startsWith('travailler-') || article.slug.startsWith('cafes-') || isTerrasse;

  if (!isCity) continue; // évergreen → on touche pas (ils sont déjà à null)

  const ids = (article.places || []).filter(Boolean);
  const lieux = ids.map(id => placeMap.get(id)).filter(Boolean);

  // Filtre : même ville + type café/coffee_shop ou (tiers_lieu si terrasse)
  const sameCity = article.city_slug
    ? lieux.filter(p => p.city_key === article.city_slug)
    : lieux;

  // Pour terrasse-X : on EXIGE signal terrasse + type café/coffee_shop/tiers_lieu
  let candidates;
  if (isTerrasse) {
    candidates = sameCity.filter(p =>
      Array.isArray(p.signals) && p.signals.includes('terrasse')
      && ['cafe', 'coffee_shop', 'tiers_lieu'].includes(p.place_type)
      && getStoragePath(p)
    );
    // Fallback : café avec terrasse même sans Storage path → on tente avec Google URL
    if (candidates.length === 0) {
      candidates = sameCity.filter(p =>
        Array.isArray(p.signals) && p.signals.includes('terrasse')
        && ['cafe', 'coffee_shop'].includes(p.place_type)
        && p.photo_url
      );
    }
  } else {
    // travailler-X / cafes-X : on préfère café/coffee_shop, fallback tiers_lieu, exit coworking moche
    candidates = sameCity.filter(p =>
      ['cafe', 'coffee_shop'].includes(p.place_type)
      && getStoragePath(p)
    );
    if (candidates.length === 0) {
      candidates = sameCity.filter(p =>
        ['cafe', 'coffee_shop', 'tiers_lieu'].includes(p.place_type)
        && getStoragePath(p)
      );
    }
  }

  if (candidates.length === 0) {
    // Aucun candidat propre → null pour traitement manuel
    if (article.cover_image) {
      console.log(`  ⊘ ${article.slug} → null (aucun lieu café/terrasse exploitable)`);
      if (!ARG_DRY_RUN) await s.from('articles').update({ cover_image: null }).eq('id', article.id);
      cleared++;
    } else {
      kept++;
    }
    continue;
  }

  // Sort par rank + diversification
  candidates.sort((a, b) => rankPlace(a, isTerrasse) - rankPlace(b, isTerrasse));
  let chosen = candidates.find(p => {
    const path = getStoragePath(p);
    return path && !usedPaths.has(path);
  }) || candidates[0];

  const path = getStoragePath(chosen);
  if (!path) { kept++; continue; }
  usedPaths.add(path);

  const newUrl = `${STORAGE_BASE}/place-photos/${path}`;

  if (article.cover_image === newUrl) { kept++; continue; }

  console.log(`  ✓ ${article.slug.padEnd(45)} → ${chosen.name} [${chosen.place_type}]`);
  if (!ARG_DRY_RUN) await s.from('articles').update({ cover_image: newUrl }).eq('id', article.id);
  updated++;
}

console.log(`\nMis à jour : ${updated}`);
console.log(`Remis à null (à habiller à la main) : ${cleared}`);
console.log(`Inchangés : ${kept}`);
console.log(`Photos uniques utilisées : ${usedPaths.size}`);
if (ARG_DRY_RUN) console.log('(dry-run)');
