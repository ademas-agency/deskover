import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { error: e1 } = await supabase.from('blog_mentions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
console.log(e1 ? '⚠️ Mentions: ' + e1.message : '✅ Mentions vidées');

const { error: e2 } = await supabase.from('places').delete().neq('id', '00000000-0000-0000-0000-000000000000');
console.log(e2 ? '⚠️ Places: ' + e2.message : '✅ Places vidées');
