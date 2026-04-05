import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await s.from('articles').select('id').limit(1);
if (error) console.log('Table articles:', error.message);
else console.log('Table articles existe, lignes:', data.length);
