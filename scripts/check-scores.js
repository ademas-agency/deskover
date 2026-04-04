import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data } = await s.from('places').select('name, city_key, curation_score, confidence, blog_mentions_count, google_rating, instagram_handle').eq('status', 'approved').order('curation_score', { ascending: false }).limit(15);

console.log('Top 15 lieux par curation_score:\n');
data.forEach((p, i) => {
  console.log(`${i + 1}. ${p.name} (${p.city_key}) — score: ${p.curation_score} | ${p.confidence} | blogs: ${p.blog_mentions_count} | google: ${p.google_rating} | insta: ${p.instagram_handle ? '✓' : '✗'}`);
});

const { count: high } = await s.from('places').select('*', { count: 'exact', head: true }).eq('confidence', 'high');
const { count: medium } = await s.from('places').select('*', { count: 'exact', head: true }).eq('confidence', 'medium');
const { count: low } = await s.from('places').select('*', { count: 'exact', head: true }).eq('confidence', 'low');

console.log(`\nConfiance: high=${high} | medium=${medium} | low=${low}`);
