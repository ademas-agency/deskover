import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFile } from 'fs/promises';

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const cities = ['lille','grenoble','toulouse','strasbourg','nancy','reims','angers','metz','mulhouse','dijon','aix-en-provence','poitiers','pau','orleans','avignon','tours','marseille','paris-9e','paris-18e','paris-5e','paris-2e','paris-8e','paris-12e','paris-13e','paris-14e','paris-15e','paris-16e','paris-17e','paris-19e','besancon','rouen','clermont-ferrand','annecy','brest','dunkerque','tourcoing','antibes','versailles','vitry-sur-seine','roubaix','saint-denis','rueil-malmaison','asnieres-sur-seine','neuilly-sur-seine','colombes','aulnay-sous-bois','creteil'];

const allData = {};
for (const city of cities) {
  const { data } = await s.from('places').select('id, name, address, city, city_key, place_type, description, signals, google_rating, google_reviews_count, website, instagram_handle, opening_hours, blog_mentions(url, title, source)').eq('city_key', city).eq('status', 'approved').order('blog_mentions_count', { ascending: false }).limit(10);
  allData[city] = data || [];
  console.log(`${city}: ${data?.length || 0} lieux`);
}

await writeFile(new URL('./data/remaining-cities-data.json', import.meta.url), JSON.stringify(allData, null, 2));
console.log('\n→ Sauvegardé dans scripts/data/remaining-cities-data.json');
