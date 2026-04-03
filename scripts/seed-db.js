import 'dotenv/config';
import { readFile, readdir } from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BATCH_SIZE = 50;

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function uploadPhoto(place) {
  if (!place.photo_local) return null;

  const localPath = new URL(`./data/${place.photo_local}`, import.meta.url);
  if (!existsSync(localPath)) return null;

  const fileData = await readFile(localPath);
  const storagePath = `${place.city_key}/${slugify(place.name)}.jpg`;

  const { error } = await supabase.storage
    .from('place-photos')
    .upload(storagePath, fileData, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    // Ignore duplicates
    if (!error.message?.includes('already exists')) {
      console.error(`  ⚠️ Upload photo ${place.name}: ${error.message}`);
    }
    return storagePath; // return path anyway, might already exist
  }

  return storagePath;
}

async function main() {
  const enrichedFile = new URL('./data/enriched-places.json', import.meta.url);
  const citiesFile = new URL('./data/cities.json', import.meta.url);

  const places = JSON.parse(await readFile(enrichedFile, 'utf-8'));
  const citiesList = JSON.parse(await readFile(citiesFile, 'utf-8'));

  console.log(`🚀 Seed Supabase : ${places.length} lieux\n`);

  // 1. Seed cities
  console.log('📍 Insertion des villes...');
  const cityRows = citiesList.map((c) => ({
    name: c.name,
    slug: c.slug,
    city_key: c.slug,
    department: c.department,
    type: c.type === 'arrondissement' ? 'arrondissement' : 'city',
  }));

  const { error: cityError } = await supabase
    .from('cities')
    .upsert(cityRows, { onConflict: 'city_key' });

  if (cityError) console.error('  ⚠️ Cities:', cityError.message);
  else console.log(`  ✅ ${cityRows.length} villes insérées`);

  // 2. Upload photos + insert places
  console.log('\n📸 Upload photos + insertion lieux...');

  // Dédupliquer par google_place_id (garder celui avec le plus de mentions)
  const seenGoogleIds = new Map();
  const uniquePlaces = [];
  for (const p of places) {
    if (p.google_place_id) {
      if (seenGoogleIds.has(p.google_place_id)) {
        const existing = seenGoogleIds.get(p.google_place_id);
        // Garder celui avec le plus de mentions
        if ((p.blog_mentions_count || 0) > (existing.blog_mentions_count || 0)) {
          uniquePlaces[uniquePlaces.indexOf(existing)] = p;
          seenGoogleIds.set(p.google_place_id, p);
        }
        continue;
      }
      seenGoogleIds.set(p.google_place_id, p);
    }
    uniquePlaces.push(p);
  }
  console.log(`  ${places.length} → ${uniquePlaces.length} après dédup google_place_id`);

  let inserted = 0;
  let photoUploaded = 0;
  let errors = 0;

  for (let i = 0; i < uniquePlaces.length; i += BATCH_SIZE) {
    const batch = uniquePlaces.slice(i, i + BATCH_SIZE);
    const rows = [];

    for (const p of batch) {
      // Upload photo
      let storagePath = null;
      if (p.photo_local) {
        storagePath = await uploadPhoto(p);
        if (storagePath) photoUploaded++;
      }

      const slug = slugify(p.name) + '-' + slugify(p.city_key || p.city || '');

      rows.push({
        name: p.name,
        slug,
        address: p.address || null,
        city: p.city || p.city_key || '',
        city_key: p.city_key || '',
        arrondissement: p.arrondissement ? String(p.arrondissement) : null,
        latitude: p.latitude || null,
        longitude: p.longitude || null,
        location: p.latitude && p.longitude
          ? `SRID=4326;POINT(${p.longitude} ${p.latitude})`
          : null,
        place_type: p.category || 'cafe',
        description: p.description || null,
        signals: p.signals || [],
        google_place_id: p.google_place_id || null,
        google_name: p.google_name || null,
        google_rating: p.google_rating || null,
        google_reviews_count: p.google_reviews_count || null,
        google_maps_url: p.google_maps_url || null,
        website: p.website || null,
        phone: p.phone || null,
        opening_hours: p.opening_hours || null,
        business_status: p.business_status || null,
        photo_url: p.photo_url || null,
        photo_storage_path: storagePath,
        curation_score: 0, // sera calculé après
        blog_mentions_count: p.blog_mentions_count || 0,
        confidence: (p.blog_mentions_count || 0) >= 3 ? 'high'
          : (p.blog_mentions_count || 0) >= 2 ? 'medium' : 'low',
        source: 'curated',
        status: 'approved',
      });
    }

    const { data, error } = await supabase
      .from('places')
      .insert(rows);

    if (error) {
      console.error(`  ⚠️ Batch ${i}: ${error.message}`);
      errors++;
    } else {
      inserted += rows.length;
    }

    if ((i + BATCH_SIZE) % 200 === 0 || i + BATCH_SIZE >= uniquePlaces.length) {
      console.log(`  📊 ${Math.min(i + BATCH_SIZE, uniquePlaces.length)}/${uniquePlaces.length} — ${inserted} insérés, ${photoUploaded} photos`);
    }
  }

  // 3. Insert blog mentions
  console.log('\n📰 Insertion des mentions d\'articles...');

  // First get all place IDs by google_place_id
  const { data: dbPlaces } = await supabase
    .from('places')
    .select('id, google_place_id, name, city_key');

  const placeIdMap = new Map();
  for (const dp of dbPlaces || []) {
    if (dp.google_place_id) placeIdMap.set(dp.google_place_id, dp.id);
    placeIdMap.set(`${dp.name}|${dp.city_key}`, dp.id);
  }

  let mentionsInserted = 0;
  const mentionRows = [];

  for (const p of places) {
    const placeId = (p.google_place_id && placeIdMap.get(p.google_place_id))
      || placeIdMap.get(`${p.name}|${p.city_key}`);

    if (!placeId || !p.blog_mentions) continue;

    for (const m of p.blog_mentions) {
      mentionRows.push({
        place_id: placeId,
        url: m.url,
        title: m.title || null,
        source: m.source || null,
      });
    }
  }

  // Insert in batches
  for (let i = 0; i < mentionRows.length; i += 100) {
    const batch = mentionRows.slice(i, i + 100);
    const { error } = await supabase
      .from('blog_mentions')
      .upsert(batch, { onConflict: 'place_id,url', ignoreDuplicates: true });

    if (error) console.error(`  ⚠️ Mentions batch ${i}: ${error.message}`);
    else mentionsInserted += batch.length;
  }

  console.log(`  ✅ ${mentionsInserted} mentions insérées`);

  // 4. Update city place counts
  console.log('\n📊 Mise à jour des compteurs par ville...');

  const { error: countError } = await supabase.rpc('exec_sql', {
    sql: `
      UPDATE cities SET place_count = (
        SELECT COUNT(*) FROM places WHERE places.city_key = cities.city_key AND places.status = 'approved'
      )
    `,
  });

  // Fallback if rpc doesn't exist
  if (countError) {
    // Count manually
    const counts = {};
    for (const p of places) {
      counts[p.city_key] = (counts[p.city_key] || 0) + 1;
    }
    for (const [cityKey, count] of Object.entries(counts)) {
      await supabase.from('cities').update({ place_count: count }).eq('city_key', cityKey);
    }
  }

  console.log(`\n✅ Seed terminé !`);
  console.log(`  - Villes : ${cityRows.length}`);
  console.log(`  - Lieux : ${inserted}`);
  console.log(`  - Photos : ${photoUploaded}`);
  console.log(`  - Mentions : ${mentionsInserted}`);
  console.log(`  - Erreurs : ${errors}`);
}

main().catch(console.error);
