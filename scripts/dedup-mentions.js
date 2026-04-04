import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

let all = [];
let from = 0;
while (true) {
  const { data } = await s.from('blog_mentions').select('id, place_id, url').range(from, from + 999);
  if (!data || data.length === 0) break;
  all.push(...data);
  from += 1000;
}

const seen = new Set();
const toDelete = [];
for (const m of all) {
  const key = `${m.place_id}|${m.url}`;
  if (seen.has(key)) {
    toDelete.push(m.id);
  } else {
    seen.add(key);
  }
}

console.log(`Total mentions: ${all.length}`);
console.log(`Doublons: ${toDelete.length}`);

for (let i = 0; i < toDelete.length; i += 100) {
  const batch = toDelete.slice(i, i + 100);
  await s.from('blog_mentions').delete().in('id', batch);
}

console.log(`✅ ${toDelete.length} doublons supprimés`);
