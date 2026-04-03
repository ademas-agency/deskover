import 'dotenv/config';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const DELAY_MS = 200; // Google Places est généreux en rate limit
const FIELDS = 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.photos,places.currentOpeningHours,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.businessStatus';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchPlace(name, city) {
  const query = `${name} ${city} France`;
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELDS,
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: 'fr',
      maxResultCount: 1,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.places?.[0] || null;
}

function getPhotoUrl(photo, maxWidth = 800) {
  if (!photo?.name) return null;
  return `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=${maxWidth}&key=${API_KEY}`;
}

async function main() {
  if (!API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY manquante dans .env');
    process.exit(1);
  }

  const inputFile = new URL('./data/deduped-places.json', import.meta.url);
  const outputFile = new URL('./data/enriched-places.json', import.meta.url);

  const places = JSON.parse(await readFile(inputFile, 'utf-8'));
  console.log(`🔍 Enrichissement Google Places pour ${places.length} lieux\n`);

  // Reprise possible
  let enriched = [];
  const enrichedNames = new Set();

  if (existsSync(outputFile)) {
    enriched = JSON.parse(await readFile(outputFile, 'utf-8'));
    for (const e of enriched) enrichedNames.add(e.name + '|' + e.city_key);
    console.log(`  ♻️ ${enriched.length} déjà enrichis\n`);
  }

  let newCount = 0;
  let failCount = 0;

  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    const key = place.name + '|' + place.city_key;

    if (enrichedNames.has(key)) continue;

    const cityLabel = place.city_key.startsWith('paris-')
      ? place.city_key.replace('paris-', 'Paris ').replace(/e$/, 'ème')
      : place.city || place.city_key;

    try {
      const result = await searchPlace(place.name, cityLabel);

      if (result) {
        const photoUrl = result.photos?.[0] ? getPhotoUrl(result.photos[0]) : null;

        enriched.push({
          ...place,
          // Google data
          google_place_id: result.id || null,
          google_name: result.displayName?.text || null,
          address: result.formattedAddress || place.address,
          latitude: result.location?.latitude || null,
          longitude: result.location?.longitude || null,
          google_rating: result.rating || null,
          google_reviews_count: result.userRatingCount || null,
          google_maps_url: result.googleMapsUri || null,
          website: result.websiteUri || null,
          phone: result.nationalPhoneNumber || null,
          photo_url: photoUrl,
          opening_hours: result.currentOpeningHours?.weekdayDescriptions || null,
          business_status: result.businessStatus || null,
        });
        newCount++;
      } else {
        // Pas de résultat Google, garder les données existantes
        enriched.push({ ...place, google_place_id: null });
        failCount++;
      }

      enrichedNames.add(key);
    } catch (err) {
      console.error(`  ⚠️ Erreur "${place.name}": ${err.message}`);
      enriched.push({ ...place, google_place_id: null });
      enrichedNames.add(key);
      failCount++;
    }

    if ((i + 1) % 50 === 0 || newCount % 50 === 0) {
      console.log(`  📊 ${i + 1}/${places.length} — ${newCount} enrichis, ${failCount} non trouvés`);
      await writeFile(outputFile, JSON.stringify(enriched, null, 2));
    }

    await sleep(DELAY_MS);
  }

  await writeFile(outputFile, JSON.stringify(enriched, null, 2));

  // Stats
  const withPhoto = enriched.filter((e) => e.photo_url).length;
  const withAddress = enriched.filter((e) => e.address).length;
  const withCoords = enriched.filter((e) => e.latitude).length;
  const withRating = enriched.filter((e) => e.google_rating).length;

  console.log(`\n📋 Résumé :`);
  console.log(`  - Lieux enrichis : ${newCount}`);
  console.log(`  - Non trouvés sur Google : ${failCount}`);
  console.log(`  - Avec photo : ${withPhoto}`);
  console.log(`  - Avec adresse : ${withAddress}`);
  console.log(`  - Avec coordonnées : ${withCoords}`);
  console.log(`  - Avec note Google : ${withRating}`);
  console.log(`  → Sauvegardé dans scripts/data/enriched-places.json`);
}

main().catch(console.error);
