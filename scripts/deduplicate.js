import { readFile, writeFile } from 'fs/promises';

// Normalise un nom pour la comparaison
function normalize(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime accents
    .replace(/^(le |la |l'|les |l |café |cafe |coffee shop |coworking )/, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Distance de Levenshtein
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// Détermine la ville normalisée pour regrouper
function getCityKey(place) {
  // Arrondissements Paris
  if (place.arrondissement) {
    const arr = String(place.arrondissement).replace(/e$/, '');
    return `paris-${arr}e`;
  }

  const city = (place.city || place._city_name || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // Détection Paris + arrondissement dans le nom de ville
  const parisMatch = city.match(/paris\s*(\d{1,2})/);
  if (parisMatch) return `paris-${parisMatch[1]}e`;

  if (city === 'paris') return 'paris'; // Paris sans arrondissement
  return city.replace(/\s+/g, '-');
}

async function main() {
  const raw = JSON.parse(await readFile(new URL('./data/raw-places.json', import.meta.url), 'utf-8'));
  console.log(`📦 ${raw.length} lieux bruts à dédupliquer\n`);

  // Grouper par ville pour ne comparer qu'au sein d'une même ville
  const byCity = {};
  for (const place of raw) {
    const key = getCityKey(place);
    if (!byCity[key]) byCity[key] = [];
    byCity[key].push(place);
  }

  console.log(`🏙️  ${Object.keys(byCity).length} villes/arrondissements\n`);

  const deduped = [];

  for (const [cityKey, places] of Object.entries(byCity)) {
    const groups = []; // Chaque groupe = un lieu unique avec ses mentions

    for (const place of places) {
      const normName = normalize(place.name);
      let matched = false;

      for (const group of groups) {
        if (similarity(normName, group.normalized_name) > 0.8) {
          // Ajouter comme mention supplémentaire
          group.blog_mentions.push({
            url: place._source_url,
            title: place._source_title,
            source: place._source_domain,
          });

          // Enrichir avec les données manquantes
          if (!group.address && place.address) group.address = place.address;
          if (place.signals) {
            for (const s of place.signals) {
              if (!group.signals.includes(s)) group.signals.push(s);
            }
          }

          matched = true;
          break;
        }
      }

      if (!matched) {
        groups.push({
          name: place.name,
          normalized_name: normName,
          address: place.address || null,
          city: place.city || place._city_name,
          city_key: cityKey,
          arrondissement: place.arrondissement || null,
          category: place.category,
          description: place.description,
          signals: [...(place.signals || [])],
          blog_mentions: [
            {
              url: place._source_url,
              title: place._source_title,
              source: place._source_domain,
            },
          ],
        });
      }
    }

    // Dédupliquer les mentions par URL
    for (const group of groups) {
      const seenUrls = new Set();
      group.blog_mentions = group.blog_mentions.filter((m) => {
        if (seenUrls.has(m.url)) return false;
        seenUrls.add(m.url);
        return true;
      });
      group.blog_mentions_count = group.blog_mentions.length;
    }

    deduped.push(...groups);
  }

  // Trier par nombre de mentions décroissant
  deduped.sort((a, b) => b.blog_mentions_count - a.blog_mentions_count);

  // Supprimer le champ temporaire
  for (const d of deduped) delete d.normalized_name;

  await writeFile(
    new URL('./data/deduped-places.json', import.meta.url),
    JSON.stringify(deduped, null, 2)
  );

  // Stats
  const byCat = {};
  for (const d of deduped) byCat[d.category] = (byCat[d.category] || 0) + 1;

  const multiMention = deduped.filter((d) => d.blog_mentions_count >= 2);

  console.log(`📋 Résumé :`);
  console.log(`  - Lieux bruts : ${raw.length}`);
  console.log(`  - Lieux uniques : ${deduped.length}`);
  console.log(`  - Mentionnés 2+ fois : ${multiMention.length}`);
  console.log(`  - Catégories :`, byCat);
  console.log(`\n  Top 20 lieux (plus mentionnés) :`);
  deduped.slice(0, 20).forEach((d) =>
    console.log(`    ${d.blog_mentions_count}× ${d.name} (${d.category}) — ${d.city_key}`)
  );

  // Stats par ville
  const cityStats = {};
  for (const d of deduped) {
    cityStats[d.city_key] = (cityStats[d.city_key] || 0) + 1;
  }
  console.log(`\n  Villes avec le plus de lieux :`);
  Object.entries(cityStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([city, count]) => console.log(`    ${city}: ${count} lieux`));

  console.log(`\n  → Sauvegardé dans scripts/data/deduped-places.json`);
}

main().catch(console.error);
