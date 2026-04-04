import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const names = [
  'Cool And Workers',
  'My Cowork',
  'Hubsy',
  'Nuage Café',
  'Kwerk',
  'Start Way Exelmans',
  'Startway Exelmans',
  'Coin Pop',
  'Le Tank',
];

for (const name of names) {
  const { data } = await s.from('places').select('name, city_key, address').ilike('name', `%${name}%`).limit(5);
  if (data?.length) {
    console.log(`✅ ${name}:`);
    data.forEach(d => console.log(`   ${d.name} (${d.city_key}) - ${d.address}`));
  } else {
    console.log(`❌ ${name}: ABSENT`);
  }
}
