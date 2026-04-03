import 'dotenv/config';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const DELAY_MS = 2000; // 2s entre requêtes pour respecter le rate limit Tier 1
const MAX_RETRIES = 3;
const MODEL = 'claude-haiku-4-5-20251001';

const EXTRACTION_PROMPT = `Tu extrais les cafés, coffee shops, coworkings et tiers-lieux mentionnés dans cet article de blog français.

Pour chaque lieu, retourne :
- name : nom exact tel qu'écrit dans l'article
- address : adresse complète si mentionnée, sinon null
- city : ville
- arrondissement : numéro d'arrondissement si Paris (ex: "11"), sinon null
- description : 1 phrase résumant pourquoi c'est bien pour travailler
- category : "cafe" | "coffee_shop" | "coworking" | "tiers_lieu"
- signals : liste parmi ["wifi", "prises", "calme", "grandes_tables", "laptop_friendly", "terrasse", "food", "pas_cher", "ambiance"]

Règles :
- Uniquement les lieux recommandés POUR TRAVAILLER (télétravail, laptop, wifi...)
- Ignorer les lieux mentionnés négativement
- Conserver l'orthographe exacte avec accents
- Ne PAS inventer d'adresse
- Si un lieu est un restaurant sans mention de travail, l'ignorer

Retourne UNIQUEMENT un JSON array valide. Aucun commentaire, aucun markdown.`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callClaude(articleContent, articleTitle, retries = 0) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `${EXTRACTION_PROMPT}\n\nTitre : ${articleTitle}\n\nTexte de l'article :\n---\n${articleContent.slice(0, 12000)}\n---`,
        },
      ],
    }),
  });

  if (res.status === 429 && retries < MAX_RETRIES) {
    const wait = (retries + 1) * 15000; // 15s, 30s, 45s
    console.log(`  ⏳ Rate limit, attente ${wait / 1000}s...`);
    await sleep(wait);
    return callClaude(articleContent, articleTitle, retries + 1);
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.content[0]?.text || '[]';

  try {
    return JSON.parse(text);
  } catch {
    // Parfois le LLM ajoute du texte autour du JSON
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    console.warn(`  ⚠️ Impossible de parser le JSON pour: ${articleTitle}`);
    return [];
  }
}

async function main() {
  if (!ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY manquante dans .env');
    console.error('   Ajoute ta clé dans le fichier .env');
    process.exit(1);
  }

  const articlesFile = new URL('./data/all-articles.jsonl', import.meta.url);
  if (!existsSync(articlesFile)) {
    console.error('❌ all-articles.jsonl introuvable. Lancer scrape-articles.js d\'abord.');
    process.exit(1);
  }

  const raw = await readFile(articlesFile, 'utf-8');
  const articles = raw.split('\n').filter(Boolean).map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
  console.log(`🤖 Extraction LLM sur ${articles.length} articles\n`);

  const outputFile = new URL('./data/raw-places.json', import.meta.url);

  // Reprise possible
  let allPlaces = [];
  let processedUrls = new Set();

  if (existsSync(outputFile)) {
    allPlaces = JSON.parse(await readFile(outputFile, 'utf-8'));
    processedUrls = new Set(allPlaces.map((p) => p._source_url));
    console.log(`  ♻️ ${processedUrls.size} articles déjà traités\n`);
  }

  let newPlaces = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];

    if (processedUrls.has(article.url)) continue;

    try {
      const places = await callClaude(article.content, article.title);

      for (const place of places) {
        allPlaces.push({
          ...place,
          _source_url: article.url,
          _source_title: article.title,
          _source_domain: article.source,
          _city_slug: article.city_slug,
          _city_name: article.city_name,
        });
        newPlaces++;
      }

      processedUrls.add(article.url);
    } catch (err) {
      console.error(`  ⚠️ Erreur article "${article.title}": ${err.message}`);
    }

    if ((i + 1) % 10 === 0) {
      console.log(`  📊 ${i + 1}/${articles.length} articles — ${newPlaces} nouveaux lieux extraits`);
      await writeFile(outputFile, JSON.stringify(allPlaces, null, 2));
    }

    await sleep(DELAY_MS);
  }

  await writeFile(outputFile, JSON.stringify(allPlaces, null, 2));

  // Stats
  const byCity = {};
  for (const p of allPlaces) {
    byCity[p._city_name] = (byCity[p._city_name] || 0) + 1;
  }

  console.log(`\n📋 Résumé :`);
  console.log(`  - Articles traités : ${processedUrls.size}`);
  console.log(`  - Lieux extraits : ${allPlaces.length}`);
  console.log(`  - Nouveaux lieux : ${newPlaces}`);
  console.log(`  - Villes couvertes : ${Object.keys(byCity).length}`);
  console.log(`\n  Top 10 villes :`);

  Object.entries(byCity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([city, count]) => console.log(`    ${city}: ${count} lieux`));

  console.log(`\n  → Sauvegardé dans scripts/data/raw-places.json`);
}

main().catch(console.error);
