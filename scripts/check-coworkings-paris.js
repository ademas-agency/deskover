import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Coworkings connus à Paris qu'on devrait avoir
const toCheck = [
  'WeWork', 'Wojo', 'Morning', 'Kwerk', 'Deskopolitan', 'Hubsy',
  'La Permanence', 'Anticafé', 'Now Coworking', 'La Cordée',
  'Spaces', 'Regus', 'Startway', 'Remix', 'Le Tank',
  'Station F', 'La Felicità', 'Ground Control', 'La Recyclerie',
  'Numa', 'The Family', 'Le Wagon'
];

for (const name of toCheck) {
  const { data } = await s.from('places').select('name, city_key, place_type').ilike('name', `%${name}%`).limit(5);
  if (data?.length) {
    console.log(`✅ ${name}: ${data.map(d => d.name + ' (' + d.city_key + ')').join(', ')}`);
  } else {
    console.log(`❌ ${name}: absent`);
  }
}
