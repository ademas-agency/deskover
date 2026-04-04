import { readdir, readFile, writeFile } from 'fs/promises';

const dir = new URL('../app/content/articles/', import.meta.url);
const files = await readdir(dir);

for (const file of files) {
  if (!file.endsWith('.md')) continue;

  let content = await readFile(new URL(file, dir), 'utf-8');
  const before = content.length;

  // Remove all patterns of Google ratings/reviews
  content = content
    // "Noté X.X/5 sur Google avec XXX avis"
    .replace(/[,.]?\s*Not[eé] \d[.,]\d\/5 sur Google[^.;,\n]*/gi, '')
    // "Noté X.X/5 (XXX avis)"
    .replace(/[,.]?\s*Not[eé] \d[.,]\d\/5 \([^)]*\)/gi, '')
    // "Noté X.X/5 avec plus de XXX avis"
    .replace(/[,.]?\s*Not[eé] \d[.,]\d\/5 avec[^.;,\n]*/gi, '')
    // "X.X/5 sur Google"
    .replace(/[,.]?\s*\d[.,]\d\/5 sur Google[^.;,\n]*/gi, '')
    // "(XXX avis)" standalone
    .replace(/\s*\(\d+\s*avis\)/gi, '')
    // "(plus de XXX avis)"
    .replace(/\s*\(plus de \d+\s*avis\)/gi, '')
    // "avec XXX avis Google"
    .replace(/\s*avec \d+\s*avis Google/gi, '')
    // "avec plus de XXX avis"
    .replace(/\s*avec plus de \d+\s*avis/gi, '')
    // "XXX avis sur Google"
    .replace(/\s*\d+\s*avis sur Google/gi, '')
    // "note parfaite" references
    .replace(/\s*- c'est rare, une note parfaite\)/gi, '')
    // "5/5 sur Google (93 avis..."
    .replace(/[,.]?\s*\d\/5 sur Google \([^)]*\)/gi, '')
    // Clean up double spaces and trailing commas
    .replace(/  +/g, ' ')
    .replace(/\s*,\s*,/g, ',')
    .replace(/\.\s*\./g, '.')
    .replace(/,\s*\./g, '.')

  if (content.length !== before) {
    await writeFile(new URL(file, dir), content);
    console.log(`✅ ${file}: ${before - content.length} caractères supprimés`);
  }
}

console.log('\nTerminé');
