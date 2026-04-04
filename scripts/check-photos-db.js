import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { count: total } = await s.from('places').select('*', { count: 'exact', head: true });
const { count: withStorage } = await s.from('places').select('*', { count: 'exact', head: true }).not('photo_storage_path', 'is', null);
const { count: withUrl } = await s.from('places').select('*', { count: 'exact', head: true }).not('photo_url', 'is', null).is('photo_storage_path', null);
const { count: noPhoto } = await s.from('places').select('*', { count: 'exact', head: true }).is('photo_url', null).is('photo_storage_path', null);

console.log(`Total lieux: ${total}`);
console.log(`Avec photo Supabase Storage: ${withStorage}`);
console.log(`Avec seulement photo_url Google: ${withUrl}`);
console.log(`Sans aucune photo: ${noPhoto}`);
