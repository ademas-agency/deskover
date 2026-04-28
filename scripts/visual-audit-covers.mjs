import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const STORAGE = `${process.env.SUPABASE_URL}/storage/v1/object/public/place-photos`;

const ARG_DRY_RUN = process.argv.includes('--dry-run');
const ARG_LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0', 10);
const ARG_REPICK = process.argv.includes('--repick');  // Si défini, tente de re-piquer pour les KO
const MAX_TRIES_PER_ARTICLE = 5;

// Charge les pools (on en aura besoin pour repicker)
async function loadPool(filter) {
  const all = [];
  let offset = 0;
  while (true) {
    const { data } = await filter
      .not('photo_storage_path', 'is', null)
      .order('curation_score', { ascending: false })
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return all;
}

const poolTerrasse = await loadPool(
  s.from('places').select('id, name, city_key, photo_storage_path, curation_score, latitude, longitude')
    .eq('status', 'approved')
    .in('place_type', ['cafe', 'coffee_shop', 'tiers_lieu'])
    .contains('signals', ['terrasse'])
);
const poolCafe = await loadPool(
  s.from('places').select('id, name, city_key, photo_storage_path, curation_score, latitude, longitude')
    .eq('status', 'approved')
    .in('place_type', ['cafe', 'coffee_shop'])
);
const poolCoworking = await loadPool(
  s.from('places').select('id, name, city_key, photo_storage_path, curation_score, latitude, longitude')
    .eq('status', 'approved')
    .eq('place_type', 'coworking')
);

// Coords par city_key
const cityCoords = {};
for (const p of [...poolTerrasse, ...poolCafe, ...poolCoworking]) {
  if (!p.latitude || !p.longitude) continue;
  cityCoords[p.city_key] = cityCoords[p.city_key] || { lat: 0, lng: 0, n: 0 };
  cityCoords[p.city_key].lat += p.latitude;
  cityCoords[p.city_key].lng += p.longitude;
  cityCoords[p.city_key].n++;
}
for (const k in cityCoords) { cityCoords[k].lat /= cityCoords[k].n; cityCoords[k].lng /= cityCoords[k].n; }

function distance(a, b) {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat/2)**2 + Math.sin(dLng/2)**2 * Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat));
  return 2 * R * Math.asin(Math.sqrt(x));
}

function sortPoolByCity(pool, citySlug) {
  if (!citySlug || !cityCoords[citySlug]) return [...pool];
  const ref = cityCoords[citySlug];
  return [...pool]
    .filter(p => p.latitude && p.longitude)
    .map(p => ({ ...p, _d: distance(ref, { lat: p.latitude, lng: p.longitude }) }))
    .sort((a, b) => a._d - b._d);
}

function poolForArticle(slug) {
  if (slug.startsWith('terrasse-')) return poolTerrasse;
  return poolCafe;
}

async function analyzeImage(imageUrl, articleTitle, articleSlug) {
  const isTerrasse = articleSlug.startsWith('terrasse-');
  const expectation = isTerrasse
    ? "L'article parle de TERRASSES de cafés ensoleillées pour télétravailler. L'image doit montrer : terrasse extérieure, café avec tables dehors, espace vert, soleil."
    : "L'article parle de spots pour télétravailler (café, coffee shop, coworking). L'image doit montrer : intérieur de café, table avec ordi, espace de travail chaleureux, ambiance café.";

  try {
    const res = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: imageUrl } },
          {
            type: 'text',
            text: `Article : "${articleTitle}"\n${expectation}\n\nCette image est-elle pertinente pour illustrer cet article ? Réponds UNIQUEMENT par "OUI" ou "NON" suivi d'une virgule et 5 mots max décrivant ce que tu vois.`,
          },
        ],
      }],
    });
    const reply = res.content[0]?.type === 'text' ? res.content[0].text.trim() : '';
    const ok = /^OUI/i.test(reply);
    return { ok, reply };
  } catch (e) {
    return { ok: null, reply: `ERROR: ${e.message}` };
  }
}

const { data: articles } = await s
  .from('articles')
  .select('id, slug, city_slug, cover_image, title')
  .eq('published', true)
  .not('cover_image', 'is', null);

console.log(`Audit visuel de ${articles.length} articles avec Claude Haiku...\n`);

let processed = 0;
let kept = 0;
let cleared = 0;
let repicked = 0;
let apiCalls = 0;
const usedPaths = new Set(articles.map(a => {
  const m = a.cover_image && a.cover_image.match(/place-photos\/(.+)$/);
  return m ? m[1] : null;
}).filter(Boolean));

for (const article of articles) {
  if (ARG_LIMIT && processed >= ARG_LIMIT) break;
  processed++;

  const { ok, reply } = await analyzeImage(article.cover_image, article.title, article.slug);
  apiCalls++;

  if (ok === true) {
    console.log(`  ✓ [${processed}] ${article.slug.padEnd(45)} ${reply}`);
    kept++;
    continue;
  }

  console.log(`  ✗ [${processed}] ${article.slug.padEnd(45)} ${reply}`);

  if (!ARG_REPICK) {
    if (!ARG_DRY_RUN) await s.from('articles').update({ cover_image: null }).eq('id', article.id);
    cleared++;
    continue;
  }

  // Re-pick : essaye d'autres candidats du pool
  const pool = poolForArticle(article.slug);
  const sorted = sortPoolByCity(pool, article.city_slug);
  const candidates = sorted.filter(p => !usedPaths.has(p.photo_storage_path));

  let tries = 0;
  let foundUrl = null;
  let foundReply = '';
  for (const cand of candidates) {
    if (tries >= MAX_TRIES_PER_ARTICLE) break;
    tries++;
    const candUrl = `${STORAGE}/${cand.photo_storage_path}`;
    const r = await analyzeImage(candUrl, article.title, article.slug);
    apiCalls++;
    if (r.ok === true) {
      foundUrl = candUrl;
      foundReply = `${cand.name} (${cand.city_key}) — ${r.reply}`;
      usedPaths.add(cand.photo_storage_path);
      break;
    }
  }

  if (foundUrl) {
    console.log(`     → repick OK: ${foundReply}`);
    if (!ARG_DRY_RUN) await s.from('articles').update({ cover_image: foundUrl }).eq('id', article.id);
    repicked++;
  } else {
    console.log(`     → aucun candidat valide après ${tries} essais, null`);
    if (!ARG_DRY_RUN) await s.from('articles').update({ cover_image: null }).eq('id', article.id);
    cleared++;
  }
}

console.log(`\n--- Résultats ---`);
console.log(`Audités : ${processed}`);
console.log(`✓ Conservés : ${kept}`);
console.log(`↻ Re-piqués : ${repicked}`);
console.log(`✗ Remis à null : ${cleared}`);
console.log(`API calls : ${apiCalls} (≈ ${(apiCalls * 0.001).toFixed(2)}€ avec Haiku)`);
if (ARG_DRY_RUN) console.log('(dry-run)');
