import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await s.from('places').select('name, city_key, address').or('name.ilike.%cool%work%,name.ilike.%cool & work%,name.ilike.%cool and work%');
console.log(data);
