import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await s.from('places').select('name, instagram_handle').not('instagram_handle', 'is', null).limit(10);
console.log('Lieux avec Instagram:', data?.length || 0);
console.log(data);
