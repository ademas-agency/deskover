import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data } = await s.from('places').select('id, name').eq('id', 'c6b87e51-371d-4578-b6d9-8bc0e2c6fa50');
console.log('Lieu trouvé:', data);

const { error } = await s.from('places').delete().eq('id', 'c6b87e51-371d-4578-b6d9-8bc0e2c6fa50');
console.log(error ? 'Erreur: ' + error.message : '✅ Maple Work supprimé de la base');
