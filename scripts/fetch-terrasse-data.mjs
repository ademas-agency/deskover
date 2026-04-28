import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFile } from 'fs/promises';

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const MIN_PLACES = 3;

const { data: places } = await s
  .from('places')
  .select('id, name, slug, address, city, city_key, arrondissement, place_type, description, signals, google_rating, google_reviews_count, opening_hours, curation_score, score_wifi, score_power, score_noise, score_comfort, score_overall, food_type, food_description, conditions, photo_url')
  .eq('status', 'approved')
  .contains('signals', ['terrasse'])
  .order('curation_score', { ascending: false });

const { data: mentions } = await s
  .from('place_mentions')
  .select('place_id, source_name, citation, article_url, article_title');

const mentionsByPlace = {};
mentions?.forEach(m => {
  mentionsByPlace[m.place_id] = mentionsByPlace[m.place_id] || [];
  mentionsByPlace[m.place_id].push(m);
});

const byCity = {};
for (const p of places) {
  byCity[p.city_key] = byCity[p.city_key] || { city: p.city, city_key: p.city_key, places: [] };
  byCity[p.city_key].places.push({
    ...p,
    mentions: mentionsByPlace[p.id] || []
  });
}

const eligible = Object.values(byCity)
  .filter(c => c.places.length >= MIN_PLACES)
  .sort((a, b) => b.places.length - a.places.length);

console.log(`${eligible.length} villes éligibles (≥${MIN_PLACES} lieux terrasse) :`);
eligible.forEach(c => console.log(`  ${c.city_key} (${c.city}): ${c.places.length} lieux`));

await writeFile(
  new URL('./data/terrasse-data.json', import.meta.url),
  JSON.stringify(eligible, null, 2)
);
console.log(`\n✓ Données écrites dans scripts/data/terrasse-data.json`);
