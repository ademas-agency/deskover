import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await s.from('places').select('id, name, city, city_key, status').ilike('name', '%tercera%');
console.log(data);
