import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readdir, readFile, writeFile } from 'fs/promises';

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const articlesDir = new URL('../app/content/articles/', import.meta.url);

// 1. Récupérer la liste des villes terrasse (depuis les .md)
const files = (await readdir(articlesDir)).filter(f => f.startsWith('terrasse-') && f.endsWith('.md'));
const terrasseSlugs = files.map(f => f.replace('.md', ''));
const citySlugs = terrasseSlugs.map(s => s.replace('terrasse-', ''));
console.log(`${terrasseSlugs.length} articles terrasse trouvés`);

// 2. Récupérer les coordonnées moyennes par city_key depuis les places (lieux approuvés)
const { data: places } = await s
  .from('places')
  .select('city_key, latitude, longitude, city')
  .eq('status', 'approved')
  .in('city_key', citySlugs);

const cityCoords = {};
for (const p of places) {
  if (!p.latitude || !p.longitude) continue;
  cityCoords[p.city_key] = cityCoords[p.city_key] || { lat: 0, lng: 0, count: 0, name: p.city };
  cityCoords[p.city_key].lat += p.latitude;
  cityCoords[p.city_key].lng += p.longitude;
  cityCoords[p.city_key].count++;
}
for (const [k, v] of Object.entries(cityCoords)) {
  v.lat /= v.count;
  v.lng /= v.count;
}
console.log(`Coordonnées calculées pour ${Object.keys(cityCoords).length} villes`);

// 3. Calculer les 3 villes proches pour chaque ville (en excluant les arrondissements parisiens entre eux pour varier)
function distance(a, b) {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat/2)**2 + Math.sin(dLng/2)**2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

function nearestCities(citySlug, n = 3) {
  if (!cityCoords[citySlug]) return [];
  const isParis = citySlug.startsWith('paris');
  const candidates = Object.keys(cityCoords).filter(k => {
    if (k === citySlug) return false;
    // Si c'est un arrondissement parisien, on ne propose pas d'autres arrondissements (pour diversifier le maillage)
    if (isParis && k.startsWith('paris')) return false;
    if (!isParis && k.startsWith('paris')) return true; // les villes peuvent linker vers Paris générique
    return true;
  });
  const ref = cityCoords[citySlug];
  return candidates
    .map(k => ({ slug: k, name: cityCoords[k].name, d: distance(ref, cityCoords[k]) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n);
}

// 4. Pour chaque article terrasse, injecter les liens (avant la conclusion ## En résumé)
const TERRASSE_MARKER_START = '<!-- TERRASSE_MAILLAGE_START -->';
const TERRASSE_MARKER_END = '<!-- TERRASSE_MAILLAGE_END -->';

for (const file of files) {
  const filePath = new URL(file, articlesDir);
  let content = await readFile(filePath, 'utf-8');
  const slug = file.replace('.md', '');
  const citySlug = slug.replace('terrasse-', '');

  // Récupérer le nom de la ville
  const cityNameMatch = content.match(/^city:\s*(.+)$/m);
  const cityName = cityNameMatch ? cityNameMatch[1].trim() : citySlug;
  const isParis = citySlug.startsWith('paris');
  const cityLabel = isParis ? `${cityName} ${citySlug.replace('paris-', '')}` : cityName;

  const nearest = nearestCities(citySlug, 3);
  if (!nearest.length) continue;

  // Construire le bloc maillage
  const links = nearest.map(c => `[${c.name}](/articles/terrasse-${c.slug})`).join(', ');
  const villeLink = `[notre sélection complète des spots de ${cityLabel}](/articles/travailler-${citySlug})`;
  const villePageLink = `[fiches détaillées des lieux de ${cityLabel}](/ville/${citySlug})`;

  const maillageBlock = `
${TERRASSE_MARKER_START}
## Pour aller plus loin

Si tu veux ${villeLink}, on a aussi un guide qui regroupe tous les bons spots de la ville (cafés, coworkings, tiers-lieux), pas seulement les terrasses. Pour les ${villePageLink}, direction notre page ville.

Tu cherches des terrasses dans une autre ville cet été ? On a aussi nos sélections pour ${links}.
${TERRASSE_MARKER_END}
`;

  // Si déjà présent, remplacer
  const existingRegex = new RegExp(`${TERRASSE_MARKER_START}[\\s\\S]*?${TERRASSE_MARKER_END}`, 'g');
  if (content.match(existingRegex)) {
    content = content.replace(existingRegex, maillageBlock.trim());
  } else {
    // Insérer juste avant "## En résumé" ou "## Comment bien" (au choix, on prend la conclusion finale)
    const enResumeIdx = content.indexOf('## En résumé');
    if (enResumeIdx === -1) {
      console.log(`⚠️  ${slug}: pas de section "## En résumé" trouvée, skip`);
      continue;
    }
    content = content.slice(0, enResumeIdx) + maillageBlock + '\n' + content.slice(enResumeIdx);
  }

  await writeFile(filePath, content);
  console.log(`✓ ${slug} → liens vers ${nearest.map(c => c.slug).join(', ')}`);
}

// 5. Pour chaque article ville (travailler-[citySlug]) qui a une version terrasse, ajouter un encart
const VILLE_MARKER_START = '<!-- TERRASSE_VILLE_LINK_START -->';
const VILLE_MARKER_END = '<!-- TERRASSE_VILLE_LINK_END -->';

let villeUpdated = 0;
for (const citySlug of citySlugs) {
  const villeFile = `travailler-${citySlug}.md`;
  const villePath = new URL(villeFile, articlesDir);
  let content;
  try {
    content = await readFile(villePath, 'utf-8');
  } catch {
    console.log(`⚠️  Pas d'article ville pour ${citySlug}, skip`);
    continue;
  }

  const cityNameMatch = content.match(/^city:\s*(.+)$/m);
  const cityName = cityNameMatch ? cityNameMatch[1].trim() : citySlug;
  const isParis = citySlug.startsWith('paris');
  const cityLabel = isParis ? `${cityName} ${citySlug.replace('paris-', '')}` : cityName;

  const villeBlock = `
${VILLE_MARKER_START}
## Tu cherches une terrasse pour bosser ?

Si tu veux bosser dehors cet été, on a fait une sélection dédiée : [les meilleures terrasses pour télétravailler à ${cityLabel}](/articles/terrasse-${citySlug}). Cafés ombragés, coworkings avec rooftop, lobbys d'hôtel : on a trié les vrais bons spots pour la saison.
${VILLE_MARKER_END}
`;

  const existingRegex = new RegExp(`${VILLE_MARKER_START}[\\s\\S]*?${VILLE_MARKER_END}`, 'g');
  if (content.match(existingRegex)) {
    content = content.replace(existingRegex, villeBlock.trim());
  } else {
    // Trouver la fin du fichier (avant le dernier paragraphe ou simplement append)
    // Stratégie : insérer avant le dernier ## OU à la fin
    const lastH2 = content.lastIndexOf('\n## ');
    if (lastH2 > 0) {
      content = content.slice(0, lastH2) + '\n' + villeBlock + content.slice(lastH2);
    } else {
      content += '\n' + villeBlock;
    }
  }

  await writeFile(villePath, content);
  villeUpdated++;
}
console.log(`\n${villeUpdated} articles ville mis à jour avec lien vers leur version terrasse`);
console.log(`\n✓ Maillage terminé. Relance scripts/migrate-articles-to-supabase.js pour pousser en base.`);
