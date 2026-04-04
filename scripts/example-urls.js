import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await s.from('places').select('name, city_key, photo_storage_path').not('photo_storage_path', 'is', null).limit(5);
for (const p of data) {
  console.log(`${p.name} (${p.city_key})`);
  console.log(`  https://kxfmpalgzbtiiboeceww.supabase.co/storage/v1/object/public/place-photos/${p.photo_storage_path}`);
  console.log('');
}
