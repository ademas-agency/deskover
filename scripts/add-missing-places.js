import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const STORAGE_BASE = 'https://kxfmpalgzbtiiboeceww.supabase.co/storage/v1/object/public/place-photos';

function slugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function searchAndAdd(query, cityKey, placeType, signals, description) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.photos,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.businessStatus'
    },
    body: JSON.stringify({ textQuery: query, languageCode: 'fr', maxResultCount: 1 }),
  });
  const data = await res.json();
  const p = data.places?.[0];
  if (!p) { console.log(`❌ ${query}: non trouvé`); return; }

  const name = p.displayName?.text;
  const slug = slugify(name) + '-' + slugify(cityKey);
  const photoUrl = p.photos?.[0]?.name
    ? `https://places.googleapis.com/v1/${p.photos[0].name}/media?maxWidthPx=800&key=${API_KEY}`
    : null;

  // Upload photo
  let photoStoragePath = null;
  if (photoUrl) {
    try {
      const photoRes = await fetch(photoUrl, { redirect: 'follow' });
      if (photoRes.ok) {
        const buffer = await photoRes.arrayBuffer();
        photoStoragePath = `${cityKey}/${slugify(name)}.jpg`;
        await supabase.storage.from('place-photos').upload(photoStoragePath, Buffer.from(buffer), {
          contentType: 'image/jpeg', upsert: true
        });
      }
    } catch {}
  }

  const row = {
    name,
    slug,
    address: p.formattedAddress,
    city: cityKey.startsWith('paris') ? 'Paris' : cityKey,
    city_key: cityKey,
    latitude: p.location?.latitude,
    longitude: p.location?.longitude,
    location: `SRID=4326;POINT(${p.location?.longitude} ${p.location?.latitude})`,
    place_type: placeType,
    description,
    signals,
    google_place_id: p.id,
    google_name: name,
    google_rating: p.rating,
    google_reviews_count: p.userRatingCount,
    google_maps_url: p.googleMapsUri,
    website: p.websiteUri,
    phone: p.nationalPhoneNumber,
    photo_url: photoUrl,
    photo_storage_path: photoStoragePath,
    business_status: p.businessStatus,
    status: 'approved',
    source: 'curated',
  };

  const { error } = await supabase.from('places').insert(row);
  if (error) console.log(`⚠️ ${name}: ${error.message}`);
  else console.log(`✅ ${name} ajouté (${cityKey})`);
}

await searchAndAdd(
  'Cool And Workers Paris Bastille',
  'paris-11e', 'coworking',
  ['wifi', 'prises', 'food', 'calme', 'laptop_friendly'],
  'Mi-coworking mi-coffee shop près de Bastille, ouvert 7j/7, avec salade de fruits offerte à 16h.'
);

await searchAndAdd(
  'Startway Exelmans Paris 16',
  'paris-16e', 'coworking',
  ['wifi', 'prises', 'calme', 'grandes_tables', 'laptop_friendly'],
  'Coworking dans un immeuble Art déco du 16e avec jardins intérieurs, accessible 24h/24.'
);

await searchAndAdd(
  'Le Coin Pop Paris restaurant coworking',
  'paris-11e', 'tiers_lieu',
  ['wifi', 'food', 'ambiance', 'laptop_friendly'],
  'Resto-coworking avec cuisine maison et produits frais, concept original qui combine travail et bonne bouffe.'
);
