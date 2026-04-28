import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Banque curatée d'IDs Unsplash (cafés cosy, coworkings lumineux, scènes café/travail nomade)
// Compatible avec la DA Deskover : tons chauds, ambiance chaleureuse, lumière naturelle
const UNSPLASH_IDS = [
  '1521017432531-fbd92d768814',  // cafe terrasse
  '1442975631115-c4f7b05b8a2c',  // cafe interior cosy
  '1559925393-8be0ec4767c8',     // coworking moderne
  '1559070169-a3077159ee16',     // coffee shop ambiance
  '1525629857-94d0aabc9a0a',     // cafe table travail
  '1559305289-4c31700ba9cb',     // cafe lumière
  '1571235949126-31fdcc1f33b8',  // coworking espace
  '1521185496955-15097b20c5fe',  // cafe matinée
  '1494438639946-1ebd1d20bf85',  // cafe ordi
  '1518057111178-44a106bad636',  // cafe banquette
  '1559603327-39d7d9a37d5d',     // cafe plantes
  '1554118811-1e0d58224f24',     // ordi cafe
  '1445116572660-236099ec97a0',  // cafe top view
  '1600093463592-8e36ae95ef56',  // cafe interior
  '1517248135467-4c7edcad34c4',  // cafe matin
  '1495474472287-4d71bcdd2085',  // coffee table
  '1453614512568-c4024d13c247',  // cafe interior
  '1509042239860-f550ce710b93',  // latte
  '1497366216548-37526070297c',  // coffee shop
  '1559496417-e7f25cb247f3',     // cafe books
];

const PARAMS = '?w=1600&h=900&fit=crop&q=80&auto=format';
const BUCKET = 'article-covers';

// Étape 1 : vérifier quels IDs sont disponibles
console.log(`Validation de ${UNSPLASH_IDS.length} IDs Unsplash...`);
const validIds = [];
for (const id of UNSPLASH_IDS) {
  const url = `https://images.unsplash.com/photo-${id}${PARAMS}`;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (res.ok) validIds.push(id);
    else console.log(`  ✗ ${id} (${res.status})`);
  } catch (e) {
    console.log(`  ✗ ${id} (error)`);
  }
}
console.log(`✓ ${validIds.length} IDs valides\n`);

if (validIds.length === 0) {
  console.error('Aucun ID valide, abandon');
  process.exit(1);
}

// Étape 2 : récupérer les articles sans cover Storage
const { data: articles } = await s
  .from('articles')
  .select('id, slug, cover_image, title')
  .eq('published', true);

const remaining = articles.filter(a => !a.cover_image || !a.cover_image.includes('.supabase.co/storage/'));
console.log(`Articles à traiter : ${remaining.length}\n`);

const ARG_DRY_RUN = process.argv.includes('--dry-run');
const ARG_LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0', 10);

// Étape 3 : distribuer une image différente à chaque article (déterministe par slug)
function pickIdForSlug(slug) {
  const hash = crypto.createHash('md5').update(slug).digest();
  const idx = hash.readUInt32BE(0) % validIds.length;
  return validIds[idx];
}

let processed = 0;
let success = 0;
let errors = 0;

for (const article of remaining) {
  if (ARG_LIMIT && processed >= ARG_LIMIT) break;
  processed++;

  const id = pickIdForSlug(article.slug);
  const url = `https://images.unsplash.com/photo-${id}${PARAMS}`;
  const storagePath = `from-unsplash/${article.slug}.jpg`;

  console.log(`[${processed}/${remaining.length}] ${article.slug} ← photo-${id}`);

  if (ARG_DRY_RUN) continue;

  // Télécharger
  const res = await fetch(url);
  if (!res.ok) { console.error(`  ✗ Download failed: ${res.status}`); errors++; continue; }
  const buf = Buffer.from(await res.arrayBuffer());

  // Upload
  const { error: upErr } = await s.storage.from(BUCKET).upload(storagePath, buf, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (upErr) { console.error(`  ✗ Upload failed: ${upErr.message}`); errors++; continue; }

  const { data: pub } = s.storage.from(BUCKET).getPublicUrl(storagePath);
  const { error: dbErr } = await s.from('articles').update({ cover_image: pub.publicUrl }).eq('id', article.id);
  if (dbErr) { console.error(`  ✗ DB update failed: ${dbErr.message}`); errors++; continue; }

  success++;
}

console.log(`\n✓ ${success} articles traités, ${errors} erreurs`);
if (ARG_DRY_RUN) console.log('(dry-run, aucune modification)');
