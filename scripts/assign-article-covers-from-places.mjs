import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const STORAGE_BASE = `${process.env.SUPABASE_URL}/storage/v1/object/public/place-photos`;

const { data: articles } = await s
  .from('articles')
  .select('id, slug, places, cover_image, title, city_slug')
  .eq('published', true);

const { data: places } = await s
  .from('places')
  .select('id, slug, photo_storage_path, name, city_key');
const placeMap = new Map(places.map(p => [p.id, p]));

const ARG_DRY_RUN = process.argv.includes('--dry-run');
const ARG_FORCE = process.argv.includes('--force');
const ARG_LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0', 10);

let updated = 0;
let skipped = 0;
let noPhoto = 0;
const usedPhotos = new Set();
const updates = [];

for (const article of articles) {
  if (ARG_LIMIT && updated >= ARG_LIMIT) break;

  const isOnStorage = article.cover_image && article.cover_image.includes('.supabase.co/storage/');
  if (isOnStorage && !ARG_FORCE) {
    skipped++;
    continue;
  }

  const placeIds = (article.places || []).filter(Boolean);
  if (placeIds.length === 0) { noPhoto++; continue; }

  const allCandidates = placeIds
    .map(id => placeMap.get(id))
    .filter(p => p && p.photo_storage_path);

  if (allCandidates.length === 0) { noPhoto++; continue; }

  // Préférer les lieux de la même ville que l'article (par city_key, pas par path)
  const sameCity = article.city_slug
    ? allCandidates.filter(p => p.city_key === article.city_slug)
    : [];
  const candidates = sameCity.length > 0 ? sameCity : allCandidates;

  // Diversifier : préférer une photo non-encore utilisée
  let chosen = candidates.find(p => !usedPhotos.has(p.photo_storage_path)) || candidates[0];
  usedPhotos.add(chosen.photo_storage_path);

  const newUrl = `${STORAGE_BASE}/${chosen.photo_storage_path}`;
  updates.push({ id: article.id, slug: article.slug, oldUrl: article.cover_image, newUrl, placeName: chosen.name });
  updated++;
}

console.log(`Articles publiés : ${articles.length}`);
console.log(`✓ À mettre à jour : ${updates.length}`);
console.log(`- Skip (déjà sur Storage) : ${skipped}`);
console.log(`- Aucun lieu avec photo : ${noPhoto}`);
console.log(`\nÉchantillon (10 premiers) :`);
updates.slice(0, 10).forEach(u => {
  console.log(`  ${u.slug.padEnd(45)} → ${u.placeName} (${u.newUrl.slice(STORAGE_BASE.length + 1)})`);
});

if (ARG_DRY_RUN) {
  console.log('\n--dry-run : aucune modification effectuée');
  process.exit(0);
}

console.log(`\nMise à jour de ${updates.length} articles...`);
let success = 0;
let errors = 0;
for (const u of updates) {
  const { error } = await s.from('articles').update({ cover_image: u.newUrl }).eq('id', u.id);
  if (error) {
    console.error(`✗ ${u.slug}: ${error.message}`);
    errors++;
  } else {
    success++;
  }
}

console.log(`\n✓ ${success} articles mis à jour, ${errors} erreurs`);
console.log(`Photos uniques utilisées : ${usedPhotos.size}`);
