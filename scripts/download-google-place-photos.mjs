import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const STORAGE_BASE = `${process.env.SUPABASE_URL}/storage/v1/object/public`;
const BUCKET = 'place-photos';

const { data: articles } = await s
  .from('articles')
  .select('id, slug, places, city_slug, cover_image')
  .eq('published', true);

// Cible : articles encore sur fallback Unsplash OU avec image manquante
const remaining = articles.filter(a =>
  !a.cover_image
  || a.cover_image.includes('article-covers/from-unsplash')
  || !a.cover_image.includes('.supabase.co/storage/')
);

const placeIds = [...new Set(remaining.flatMap(a => a.places || []).filter(Boolean))];
const { data: places } = await s.from('places').select('id, name, slug, city_key, photo_url, photo_storage_path, photos').in('id', placeIds);
const placeMap = new Map(places.map(p => [p.id, p]));

const ARG_DRY_RUN = process.argv.includes('--dry-run');
const ARG_LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0', 10);

console.log(`${remaining.length} articles à traiter\n`);

let processed = 0, dlSuccess = 0, errors = 0, articleUpdated = 0, skipped = 0;
const usedPaths = new Set();

for (const article of remaining) {
  if (ARG_LIMIT && processed >= ARG_LIMIT) break;
  processed++;

  const ids = (article.places || []).filter(Boolean);
  const lieux = ids.map(id => placeMap.get(id)).filter(Boolean);
  const sameCity = article.city_slug ? lieux.filter(p => p.city_key === article.city_slug) : [];
  const candidates = sameCity.length > 0 ? sameCity : lieux;

  // Priorité : place avec photos[] OU photo_url Google
  const chosen = candidates.find(p => Array.isArray(p.photos) && p.photos.length > 0)
              || candidates.find(p => p.photo_url && p.photo_url.includes('googleapis.com'));

  if (!chosen) { skipped++; continue; }

  let storagePath;
  // Cas 1 : photos[] avec un path Storage déjà
  if (Array.isArray(chosen.photos) && chosen.photos.length > 0) {
    storagePath = chosen.photos[0];
  } else {
    // Cas 2 : télécharger depuis Google Places, uploader sur Storage
    storagePath = `${chosen.city_key || 'misc'}/${chosen.slug || article.slug.slice(0, 30)}.jpg`;

    if (!ARG_DRY_RUN) {
      try {
        const res = await fetch(chosen.photo_url);
        if (!res.ok) { console.error(`✗ ${article.slug}: download ${res.status}`); errors++; continue; }
        const buf = Buffer.from(await res.arrayBuffer());

        const { error: upErr } = await s.storage.from(BUCKET).upload(storagePath, buf, {
          contentType: 'image/jpeg',
          upsert: true,
        });
        if (upErr) { console.error(`✗ ${article.slug}: upload ${upErr.message}`); errors++; continue; }

        // Met aussi à jour le place pour la persistance
        await s.from('places').update({ photo_storage_path: storagePath }).eq('id', chosen.id);

        dlSuccess++;
      } catch (e) {
        console.error(`✗ ${article.slug}: ${e.message}`); errors++; continue;
      }
    }
  }

  const newUrl = `${STORAGE_BASE}/${BUCKET}/${storagePath}`;
  console.log(`[${processed}/${remaining.length}] ${article.slug.padEnd(45)} ← ${chosen.name} (${storagePath})`);

  if (ARG_DRY_RUN) continue;

  const { error: dbErr } = await s.from('articles').update({ cover_image: newUrl }).eq('id', article.id);
  if (dbErr) { console.error(`✗ DB update failed: ${dbErr.message}`); errors++; continue; }
  articleUpdated++;
  usedPaths.add(storagePath);
}

console.log(`\nTraités : ${processed}`);
console.log(`Photos téléchargées : ${dlSuccess}`);
console.log(`Articles mis à jour : ${articleUpdated}`);
console.log(`Sans candidat : ${skipped}`);
console.log(`Erreurs : ${errors}`);
console.log(`Photos uniques : ${usedPaths.size}`);
if (ARG_DRY_RUN) console.log('(dry-run, aucune modification)');
