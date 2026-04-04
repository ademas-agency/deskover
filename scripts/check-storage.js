import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Dossiers racine
const { data: root } = await s.storage.from('place-photos').list('', { limit: 10 });
console.log('Dossiers racine:', root?.map(f => f.name));

// Exemple Lyon
const { data: lyon } = await s.storage.from('place-photos').list('lyon', { limit: 5 });
console.log('\nExemple lyon:', lyon?.map(f => f.name));

// Exemple Paris 11e
const { data: p11 } = await s.storage.from('place-photos').list('paris-11e', { limit: 5 });
console.log('Exemple paris-11e:', p11?.map(f => f.name));

// URL publique d'une photo
if (lyon?.[0]) {
  const { data: url } = s.storage.from('place-photos').getPublicUrl(`lyon/${lyon[0].name}`);
  console.log('\nURL publique exemple:', url.publicUrl);
}

// Stats globales
let total = 0;
const { data: folders } = await s.storage.from('place-photos').list('', { limit: 300 });
for (const folder of folders || []) {
  if (folder.id) continue; // skip files
  const { data: files } = await s.storage.from('place-photos').list(folder.name, { limit: 1000 });
  total += files?.length || 0;
}
console.log('\nTotal photos stockées:', total);
