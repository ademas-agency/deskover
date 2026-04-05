import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'fs/promises';

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const dir = new URL('../app/content/articles/', import.meta.url);

const files = (await readdir(dir)).filter(f => f.endsWith('.md'));
console.log(`📰 ${files.length} articles à migrer\n`);

let inserted = 0;
let errors = 0;

for (const file of files) {
  const raw = await readFile(new URL(file, dir), 'utf-8');

  // Parse frontmatter
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    console.log(`⚠️ ${file}: pas de frontmatter`);
    errors++;
    continue;
  }

  const frontmatter = fmMatch[1];
  const content = fmMatch[2].trim();

  // Extract fields from YAML (simple parsing)
  const getField = (key) => {
    const m = frontmatter.match(new RegExp(`^${key}:\\s*"?([^"\\n]*)"?`, 'm'));
    return m ? m[1].trim() : null;
  };

  const getArray = (key) => {
    const m = frontmatter.match(new RegExp(`^${key}:\\s*\\[([^\\]]*)]`, 'm'));
    if (!m) return [];
    return m[1].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
  };

  const title = getField('title');
  const slug = file.replace('.md', '');
  const description = getField('description');
  const city = getField('city');
  const citySlug = getField('citySlug');
  const type = getField('type') || 'city';
  const keywords = getArray('keywords');
  const places = getArray('places').filter(p => p.length > 10); // UUIDs only
  const publishedAt = getField('publishedAt');

  const { error } = await s.from('articles').upsert({
    title: title || slug,
    slug,
    description,
    city,
    city_slug: citySlug,
    type,
    keywords,
    content,
    places,
    published: true,
    published_at: publishedAt || new Date().toISOString(),
  }, { onConflict: 'slug' });

  if (error) {
    console.log(`⚠️ ${slug}: ${error.message}`);
    errors++;
  } else {
    inserted++;
  }
}

console.log(`\n✅ ${inserted} articles migrés, ${errors} erreurs`);
