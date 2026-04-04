import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Total
const { count: total } = await s.from('places').select('*', { count: 'exact', head: true }).eq('status', 'approved');
console.log(`Total lieux: ${total}`);

// The People
const { data: tp } = await s.from('places').select('name, city, city_key, address').ilike('name', '%The People%');
console.log('\nThe People:', tp);

// Quelques lieux Lyon vérifiés
const { data: lyon } = await s.from('places').select('name, city_key').eq('city_key', 'lyon').limit(5);
console.log('\nLyon (5 premiers):', lyon?.map(p => p.name));

// Vérifier qu'il n'y a plus de mismatches paris ↔ lyon
const { data: parisCheck } = await s.from('places').select('name, city_key, address').like('city_key', 'paris-%').ilike('address', '%Lyon%');
console.log('\nLieux Paris avec adresse Lyon:', parisCheck?.length || 0, parisCheck?.map(p => p.name) || []);
