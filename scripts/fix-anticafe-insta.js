import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data } = await s.from('places').select('id, name, instagram_handle').ilike('name', '%anticaf%').eq('city_key', 'lyon');
console.log('Avant:', data);

const { error } = await s.from('places').update({ instagram_handle: 'anticafe_lyon' }).ilike('name', '%anticaf%').eq('city_key', 'lyon');
console.log(error ? 'Erreur: ' + error.message : '✅ Instagram corrigé → @anticafe_lyon');
