import 'dotenv/config';
import { readFile, writeFile, appendFile, mkdir } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { extract } from '@extractus/article-extractor';

const DELAY_MS = 1000;
const MAX_CONTENT_LENGTH = 15000;
const TIMEOUT_MS = 10000;

const SKIP_DOMAINS = [
  'instagram.com', 'tiktok.com', 'facebook.com', 'twitter.com', 'x.com',
  'youtube.com', 'linkedin.com', 'google.com/maps', 'tripadvisor',
  'yelp.com', 'pagesjaunes.fr', 'airbnb', 'booking.com',
];

function shouldSkip(url) {
  return SKIP_DOMAINS.some((d) => url.includes(d));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeArticle(url) {
  try {
    const article = await extract(url, {
      timeout: TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
    });
    if (!article || !article.content) return null;

    const text = article.content
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length < 200) return null;

    return {
      url,
      title: article.title || '',
      source: article.source || new URL(url).hostname,
      published: article.published || null,
      content: text.slice(0, MAX_CONTENT_LENGTH),
      content_length: text.length,
    };
  } catch {
    return null;
  }
}

async function main() {
  const searchResultsFile = new URL('./data/all-search-results.json', import.meta.url);
  if (!existsSync(searchResultsFile)) {
    console.error('❌ all-search-results.json introuvable.');
    process.exit(1);
  }

  const searchResults = JSON.parse(await readFile(searchResultsFile, 'utf-8'));

  const seen = new Set();
  const urls = searchResults
    .filter((r) => {
      if (seen.has(r.url)) return false;
      if (shouldSkip(r.url)) return false;
      seen.add(r.url);
      return true;
    })
    .map((r) => ({ url: r.url, title: r.title, city_slug: r.city_slug, city_name: r.city_name }));

  console.log(`📰 ${urls.length} URLs uniques à scraper\n`);

  // Utiliser JSONL pour éviter la corruption
  const outputFile = new URL('./data/all-articles.jsonl', import.meta.url);

  // Charger les URLs déjà scrapées
  const scrapedUrls = new Set();
  if (existsSync(outputFile)) {
    const lines = readFileSync(outputFile, 'utf-8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const a = JSON.parse(line);
        scrapedUrls.add(a.url);
      } catch {}
    }
    console.log(`  ♻️ ${scrapedUrls.size} articles déjà scrapés\n`);
  }

  let successCount = scrapedUrls.size;
  let failCount = 0;
  let processed = 0;

  for (const { url, title, city_slug, city_name } of urls) {
    if (scrapedUrls.has(url)) continue;
    processed++;

    const article = await scrapeArticle(url);

    if (article) {
      article.city_slug = city_slug;
      article.city_name = city_name;
      await appendFile(outputFile, JSON.stringify(article) + '\n');
      successCount++;
    } else {
      failCount++;
    }

    if (processed % 50 === 0) {
      console.log(`  📊 ${processed} traités — ${successCount} succès, ${failCount} échecs`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n📋 Résumé :`);
  console.log(`  - URLs traitées : ${processed + scrapedUrls.size}`);
  console.log(`  - Articles extraits : ${successCount}`);
  console.log(`  - Échecs : ${failCount}`);
  console.log(`  - Taux de succès : ${Math.round((successCount / (successCount + failCount)) * 100)}%`);
  console.log(`  → Sauvegardé dans scripts/data/all-articles.jsonl`);
}

main().catch(console.error);
