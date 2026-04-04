import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Ajouter un handle Instagram de test sur le lieu de l'URL que tu as partagé
const { error } = await s.from('places')
  .update({ instagram_handle: '@nomadecafe.paris' })
  .eq('id', '6f31e1d2-2122-40e9-8041-de868e0d2a76');

console.log(error ? 'Erreur: ' + error.message : '✅ Instagram ajouté sur le lieu 6f31e1d2');
