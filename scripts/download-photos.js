import 'dotenv/config';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const PHOTOS_DIR = new URL('./data/photos/', import.meta.url);
const DELAY_MS = 100;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadPhoto(url, filepath) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const dest = createWriteStream(filepath);
  await pipeline(res.body, dest);
}

async function main() {
  const inputFile = new URL('./data/enriched-places.json', import.meta.url);
  if (!existsSync(inputFile)) {
    console.error('❌ enriched-places.json introuvable. Lancer enrich-google.js d\'abord.');
    process.exit(1);
  }

  if (!existsSync(PHOTOS_DIR)) {
    await mkdir(PHOTOS_DIR, { recursive: true });
  }

  const places = JSON.parse(await readFile(inputFile, 'utf-8'));
  const withPhoto = places.filter((p) => p.photo_url);

  console.log(`📸 ${withPhoto.length} photos à télécharger\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const place of withPhoto) {
    // Nom de fichier : google_place_id ou slug
    const id = place.google_place_id || place.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filename = `${id}.jpg`;
    const filepath = new URL(filename, PHOTOS_DIR);

    if (existsSync(filepath)) {
      // Mettre à jour le chemin local dans les données
      place.photo_local = `photos/${filename}`;
      skipped++;
      continue;
    }

    try {
      await downloadPhoto(place.photo_url, filepath);
      place.photo_local = `photos/${filename}`;
      downloaded++;
    } catch (err) {
      failed++;
    }

    if ((downloaded + failed) % 100 === 0) {
      console.log(`  📊 ${downloaded} téléchargées, ${skipped} existantes, ${failed} échecs`);
    }

    await sleep(DELAY_MS);
  }

  // Sauvegarder avec les chemins locaux
  await writeFile(inputFile, JSON.stringify(places, null, 2));

  console.log(`\n📋 Résumé :`);
  console.log(`  - Téléchargées : ${downloaded}`);
  console.log(`  - Déjà existantes : ${skipped}`);
  console.log(`  - Échecs : ${failed}`);
  console.log(`  - Dossier : scripts/data/photos/`);
}

main().catch(console.error);
